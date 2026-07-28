import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useServerFn } from "@tanstack/react-start";
import { strToU8, zipSync } from "fflate";
import { Header } from "@/components/site/Header";
import { runCodeRemote } from "@/lib/code-runner.functions";
import { analyzeProject, askCodeHelper } from "@/lib/codehelper.functions";
import { ChevronDown, ChevronUp, Download, Eye, FileCode2, FolderPlus, Loader2, PanelLeftClose, PanelLeftOpen, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [
    { title: "CODEROOM — NYCODEHUB" },
    { name: "description", content: "Kora umushinga, NYCODER isuzume code yawe, hanyuma uwumanure kuri mudasobwa yawe." },
    { property: "og:title", content: "CODEROOM — NYCODEHUB" },
    { property: "og:description", content: "Ahantu ho kwandika, gusuzuma no gukuramo imishinga ya porogaramu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Practice,
});

type LangKey = "html" | "javascript" | "typescript" | "python" | "c" | "cpp" | "java" | "csharp" | "go" | "rust" | "php" | "ruby" | "kotlin" | "swift" | "bash" | "sql";
type ProjectFile = { name: string; content: string };
const LANGS: { key: LangKey; label: string; monaco: string; file: string; sample: string; remote: boolean; pyodide?: boolean }[] = [
  { key: "html", label: "HTML / CSS / JS", monaco: "html", file: "index.html", remote: false, sample: `<!DOCTYPE html>\n<html lang="rw">\n<head>\n  <meta charset="UTF-8" />\n  <style>body{font-family:system-ui;padding:32px} h1{color:#7048e8}</style>\n</head>\n<body>\n  <h1>Muraho NYCODEHUB</h1>\n  <button onclick="alert('Bigenze neza!')">Kanda hano</button>\n</body>\n</html>` },
  { key: "javascript", label: "JavaScript", monaco: "javascript", file: "app.js", remote: false, sample: `console.log("Muraho NYCODEHUB");\nfor (let i = 1; i <= 5; i++) console.log(i, i * i);` },
  { key: "python", label: "Python", monaco: "python", file: "main.py", remote: false, pyodide: true, sample: `print("Muraho NYCODEHUB")\nfor i in range(1, 6):\n    print(i, i * i)` },
  { key: "typescript", label: "TypeScript", monaco: "typescript", file: "index.ts", remote: true, sample: `const greet = (name: string): string => \`Muraho \${name}\`;\nconsole.log(greet("NYCODEHUB"));` },
  { key: "c", label: "C", monaco: "c", file: "main.c", remote: true, sample: `#include <stdio.h>\nint main(){ printf("Muraho NYCODEHUB!\\n"); return 0; }` },
  { key: "cpp", label: "C++", monaco: "cpp", file: "main.cpp", remote: true, sample: `#include <iostream>\nint main(){ std::cout << "Muraho NYCODEHUB!\\n"; }` },
  { key: "java", label: "Java", monaco: "java", file: "Main.java", remote: true, sample: `public class Main { public static void main(String[] args){ System.out.println("Muraho NYCODEHUB!"); } }` },
  { key: "csharp", label: "C#", monaco: "csharp", file: "Program.cs", remote: true, sample: `using System; class Program { static void Main(){ Console.WriteLine("Muraho NYCODEHUB!"); } }` },
  { key: "go", label: "Go", monaco: "go", file: "main.go", remote: true, sample: `package main\nimport "fmt"\nfunc main(){ fmt.Println("Muraho NYCODEHUB!") }` },
  { key: "rust", label: "Rust", monaco: "rust", file: "main.rs", remote: true, sample: `fn main(){ println!("Muraho NYCODEHUB!"); }` },
  { key: "php", label: "PHP", monaco: "php", file: "index.php", remote: true, sample: `<?php echo "Muraho NYCODEHUB!\\n"; ?>` },
  { key: "ruby", label: "Ruby", monaco: "ruby", file: "main.rb", remote: true, sample: `puts "Muraho NYCODEHUB!"` },
  { key: "kotlin", label: "Kotlin", monaco: "kotlin", file: "main.kt", remote: true, sample: `fun main(){ println("Muraho NYCODEHUB!") }` },
  { key: "swift", label: "Swift", monaco: "swift", file: "main.swift", remote: true, sample: `print("Muraho NYCODEHUB!")` },
  { key: "bash", label: "Bash", monaco: "shell", file: "main.sh", remote: true, sample: `echo "Muraho NYCODEHUB!"\nfor i in 1 2 3; do echo "i=$i"; done` },
  { key: "sql", label: "SQL", monaco: "sql", file: "query.sql", remote: true, sample: `SELECT 'Muraho NYCODEHUB' AS greeting;` },
];

let pyodidePromise: Promise<unknown> | null = null;
async function loadPyodide() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Python ntiyashoboye gutangira"));
      document.head.appendChild(script);
    });
    const runtime = window as Window & { loadPyodide?: (config: { indexURL: string }) => Promise<unknown> };
    if (!runtime.loadPyodide) throw new Error("Python ntiyabonetse");
    return runtime.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
  })();
  return pyodidePromise;
}
const storageKey = (language: LangKey) => `nycodehub:project:${language}`;

type Line = { kind: "error" | "warn" | "logic" | "fix" | "ok" | "info" | "you"; text: string };

function parseReport(report: string): Line[] {
  return report
    .split("\n")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map<Line>((line) => {
      const upper = line.toUpperCase();
      if (upper.startsWith("ERROR:")) return { kind: "error", text: line.slice(6).trim() };
      if (upper.startsWith("WARN:")) return { kind: "warn", text: line.slice(5).trim() };
      if (upper.startsWith("LOGIC:")) return { kind: "logic", text: line.slice(6).trim() };
      if (upper.startsWith("FIX:")) return { kind: "fix", text: line.slice(4).trim() };
      if (upper.startsWith("OK:")) return { kind: "ok", text: line.slice(3).trim() };
      return { kind: "info", text: line };
    });
}

const LINE_STYLE: Record<Line["kind"], { color: string; tag: string }> = {
  error: { color: "text-destructive", tag: "ERROR" },
  warn: { color: "text-chart-4", tag: "WARN " },
  logic: { color: "text-primary-glow", tag: "LOGIC" },
  fix: { color: "text-success", tag: "FIX  " },
  ok: { color: "text-success", tag: "OK   " },
  info: { color: "text-muted-foreground", tag: "     " },
  you: { color: "text-foreground", tag: "$" },
};

function Practice() {
  const [mounted, setMounted] = useState(false);
  const [langKey, setLangKey] = useState<LangKey>("html");
  const lang = useMemo(() => LANGS.find((item) => item.key === langKey) ?? LANGS[0], [langKey]);
  const [files, setFiles] = useState<ProjectFile[]>([{ name: "index.html", content: LANGS[0].sample }]);
  const [activeName, setActiveName] = useState("index.html");
  const [output, setOutput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [running, setRunning] = useState(false);
  const [autorun, setAutorun] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [nycoderOpen, setNycoderOpen] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ kind: "info", text: t.practice_helper_intro }]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const comboRef = useRef<string | null>(null);
  const filesRef = useRef(files);
  const langRef = useRef(langKey);
  const logRef = useRef<HTMLDivElement | null>(null);
  const runRemote = useServerFn(runCodeRemote);
  const askHelper = useServerFn(askCodeHelper);
  const analyze = useServerFn(analyzeProject);
  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const code = activeFile?.content ?? "";

  filesRef.current = files;
  langRef.current = langKey;

  useEffect(() => {
    setMounted(true);
    const savedLanguage = localStorage.getItem("practice:lang") as LangKey | null;
    if (savedLanguage && LANGS.some((item) => item.key === savedLanguage)) setLangKey(savedLanguage);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("practice:lang", langKey);
    const saved = localStorage.getItem(storageKey(langKey));
    try {
      const parsed = saved ? JSON.parse(saved) as ProjectFile[] : null;
      const next = parsed?.length ? parsed : [{ name: lang.file, content: lang.sample }];
      setFiles(next); setActiveName(next[0].name);
    } catch { setFiles([{ name: lang.file, content: lang.sample }]); setActiveName(lang.file); }
    setOutput(""); setPreviewHtml("");
  }, [langKey, lang, mounted]);
  useEffect(() => { if (mounted) localStorage.setItem(storageKey(langKey), JSON.stringify(files)); }, [files, langKey, mounted]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [lines, busy]);

  function updateCode(value: string) { setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: value } : file)); }
  function createFile() {
    const proposed = window.prompt("Andika izina rya dosiye, urugero: styles.css");
    const name = proposed?.trim().replace(/^\/+/, "");
    if (!name) return;
    if (files.some((file) => file.name === name)) return toast.error("Iyo dosiye isanzwe ihari");
    setFiles((current) => [...current, { name, content: "" }]); setActiveName(name);
  }
  function deleteFile(name: string) {
    if (files.length === 1) return toast.error("Umushinga ugomba kugira nibura dosiye imwe");
    const next = files.filter((file) => file.name !== name); setFiles(next);
    if (activeName === name) setActiveName(next[0].name);
  }
  function downloadProject() {
    const archive = zipSync(Object.fromEntries(files.map((file) => [file.name, strToU8(file.content)])));
    const url = URL.createObjectURL(new Blob([archive], { type: "application/zip" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `nycodehub-${langKey}-project.zip`; anchor.click(); URL.revokeObjectURL(url);
    toast.success(t.practice_project_saved);
  }
  function buildWebPreview() {
    const html = files.find((file) => file.name.endsWith(".html"));
    const css = files.filter((file) => file.name.endsWith(".css")).map((file) => file.content).join("\n");
    const js = files.filter((file) => file.name.endsWith(".js")).map((file) => file.content).join("\n");
    if (html) return html.content.replace("</head>", `<style>${css}</style></head>`).replace("</body>", `<script>${js}<\/script></body>`);
    return `<!doctype html><html><head><style>${css}</style></head><body><script>${js}<\/script></body></html>`;
  }
  async function run() {
    setRunning(true); setOutput("");
    try {
      if (lang.key === "html") { setPreviewHtml(buildWebPreview()); setOutput("✓ Igaragaza ryavuguruwe"); }
      else if (lang.key === "javascript") {
        const script = files.filter((file) => file.name.endsWith(".js")).map((file) => file.content).join("\n") || code;
        const wrapper = `<!doctype html><html><body><script>const logs=[];["log","error","warn"].forEach(k=>{const original=console[k];console[k]=(...a)=>{logs.push(k+": "+a.map(String).join(" "));original(...a)}});try{${script}}catch(error){logs.push("error: "+error.message)};parent.postMessage({nycodehubOutput:logs.join("\\n")},"*")<\/script></body></html>`;
        const handler = (event: MessageEvent) => { if (typeof event.data?.nycodehubOutput === "string") { setOutput(event.data.nycodehubOutput || t.practice_no_output); window.removeEventListener("message", handler); } };
        window.addEventListener("message", handler); setPreviewHtml(wrapper);
      } else if (lang.pyodide) {
        setOutput(t.practice_python_starting);
        const py = await loadPyodide() as { setStdout: (options: { batched: (value: string) => void }) => void; setStderr: (options: { batched: (value: string) => void }) => void; runPythonAsync: (value: string) => Promise<unknown> };
        const buffer: string[] = []; py.setStdout({ batched: (value) => buffer.push(value) }); py.setStderr({ batched: (value) => buffer.push(value) });
        try { await py.runPythonAsync(code); setOutput(buffer.join("\n") || t.practice_no_output); } catch (error) { setOutput(`${buffer.join("\n")}\n${error instanceof Error ? error.message : String(error)}`.trim()); }
      } else if (lang.remote) {
        setOutput(t.practice_running_server); const result = await runRemote({ data: { language: lang.key, source: code } }); setOutput([result.stdout, result.stderr].filter(Boolean).join("\n") || `(${result.status})`);
      }
    } catch (error) { setOutput(error instanceof Error ? error.message : "Byanze gukora"); } finally { setRunning(false); }
  }
  useEffect(() => {
    if (!autorun || (lang.key !== "html" && lang.key !== "javascript")) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void run(); }, 450);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [files, langKey, autorun]);

  const projectCode = useCallback(
    () => filesRef.current.map((file) => `DOSIYE: ${file.name}\n${file.content}`).join("\n\n"),
    [],
  );

  const runAnalysis = useCallback(async () => {
    setNycoderOpen(true);
    setBusy(true);
    setLines((current) => [...current, { kind: "you", text: "nycoder --analyse" }]);
    try {
      const result = await analyze({ data: { language: langRef.current, code: projectCode() } });
      const parsed = parseReport(result.report);
      setLines((current) => [...current, ...(parsed.length ? parsed : [{ kind: "ok" as const, text: "Nta kibazo nabonye." }])]);
    } catch (error) {
      setLines((current) => [...current, { kind: "error", text: error instanceof Error ? error.message : "Byanze" }]);
    } finally { setBusy(false); }
  }, [analyze, projectCode]);

  async function ask() {
    const question = prompt.trim();
    if (!question || busy) return;
    setPrompt("");
    if (/^(suzuma|analyse|analyze)$/i.test(question)) return void runAnalysis();
    setBusy(true);
    setLines((current) => [...current, { kind: "you", text: question }]);
    try {
      const result = await askHelper({ data: { language: langRef.current, code: projectCode(), question } });
      setLines((current) => [...current, ...parseReport(result.answer)]);
    } catch (error) {
      setLines((current) => [...current, { kind: "error", text: error instanceof Error ? error.message : "Byanze" }]);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === " " || event.code === "Space") { event.preventDefault(); void runAnalysis(); return; }
      if (key !== "n" && key !== "y") { comboRef.current = null; return; }
      event.preventDefault();
      const previous = comboRef.current;
      if (previous === "n" && key === "y") { setNycoderOpen(true); comboRef.current = null; return; }
      if (previous === "y" && key === "n") { setNycoderOpen(false); comboRef.current = null; return; }
      comboRef.current = key;
      window.setTimeout(() => { if (comboRef.current === key) comboRef.current = null; }, 1500);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runAnalysis]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFilesOpen((open) => !open)} title={t.practice_files} className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground">
              {filesOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </button>
            <h1 className="font-mono text-sm font-bold">{t.practice_h1}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={langKey} onChange={(event) => setLangKey(event.target.value as LangKey)} className="rounded border border-border bg-surface px-2 py-1.5 text-xs font-mono">
              {LANGS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={autorun} onChange={(event) => setAutorun(event.target.checked)} />{t.practice_autorun}</label>
            <button onClick={() => void run()} disabled={running} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}{t.practice_run}
            </button>
            <button onClick={downloadProject} className="inline-flex items-center gap-1.5 rounded bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow"><Download className="size-4" />{t.practice_download}</button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {filesOpen && (
            <aside className="w-44 shrink-0 overflow-y-auto border-r border-border bg-background/60 animate-fade-in">
              <div className="flex h-9 items-center justify-between border-b border-border px-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">{t.practice_files}</span>
                <button onClick={createFile} title={t.practice_new_file} className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"><FolderPlus className="size-4" /></button>
              </div>
              <div className="p-1">
                {files.map((file) => (
                  <div key={file.name} className={`group flex items-center gap-1 rounded px-2 py-1.5 text-xs font-mono ${activeName === file.name ? "bg-primary/15 text-primary-glow" : "text-muted-foreground hover:bg-surface"}`}>
                    <button onClick={() => setActiveName(file.name)} className="flex min-w-0 flex-1 items-center gap-1.5"><FileCode2 className="size-3.5 shrink-0" /><span className="truncate">{file.name}</span></button>
                    <button onClick={() => deleteFile(file.name)} title={t.delete} className="opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="size-3" /></button>
                  </div>
                ))}
              </div>
            </aside>
          )}

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 bg-surface-elevated">
              {mounted && activeFile && (
                <Editor
                  height="100%"
                  theme="vs-dark"
                  path={activeFile.name}
                  language={lang.monaco}
                  value={activeFile.content}
                  onChange={(value) => updateCode(value ?? "")}
                  onMount={(editor, monaco) => {
                    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => { void runAnalysis(); });
                  }}
                  options={{ fontSize: 14, minimap: { enabled: false }, fontFamily: "JetBrains Mono, monospace", automaticLayout: true, tabSize: 2, scrollBeyondLastLine: false }}
                />
              )}
            </div>
            <div className="grid h-[210px] shrink-0 border-t border-border lg:grid-cols-2">
              <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
                <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-xs text-muted-foreground"><Eye className="size-3.5 text-primary-glow" />{t.practice_preview}</div>
                <iframe title={t.practice_preview} sandbox="allow-scripts allow-modals" srcDoc={previewHtml || "<html><body style='font-family:system-ui;padding:16px;color:#777'>Igaragaza rizaza hano</body></html>"} className="min-h-0 flex-1 w-full bg-white" />
              </div>
              <div className="flex min-h-0 flex-col bg-background/80">
                <div className="flex h-8 shrink-0 items-center border-b border-border px-3 text-xs text-muted-foreground">{t.practice_output}</div>
                <pre className="min-h-0 flex-1 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">{output || t.practice_no_output}</pre>
              </div>
            </div>
          </section>
        </div>

        <section className={`shrink-0 border-t border-primary/40 bg-[#0b0b12] font-mono transition-all ${nycoderOpen ? "h-64" : "h-9"}`}>
          <div className="flex h-9 items-center justify-between border-b border-border px-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-primary-glow">▊</span>
              <span className="font-bold tracking-wider">NYCODER</span>
              <span className="text-[10px] text-muted-foreground">Ctrl+Space = suzuma · Ctrl+N then Ctrl+Y = fungura · Ctrl+Y then Ctrl+N = funga</span>
            </div>
            <div className="flex items-center gap-2">
              {busy && <Loader2 className="size-3.5 animate-spin text-primary-glow" />}
              <button onClick={() => setNycoderOpen((open) => !open)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                {nycoderOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>
          </div>
          {nycoderOpen && (
            <div className="flex h-[calc(100%-2.25rem)] flex-col">
              <div ref={logRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2 text-xs leading-relaxed">
                {lines.map((line, index) => (
                  <div key={index} className={`flex gap-2 ${LINE_STYLE[line.kind].color} animate-fade-in`}>
                    <span className="shrink-0 whitespace-pre opacity-70">{LINE_STYLE[line.kind].tag}</span>
                    <span className="whitespace-pre-wrap">{line.text}</span>
                  </div>
                ))}
                {busy && <div className="text-muted-foreground">{t.practice_thinking}</div>}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
                <span className="text-success">nycoder$</span>
                <input
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder={t.practice_helper_placeholder}
                  className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                />
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
