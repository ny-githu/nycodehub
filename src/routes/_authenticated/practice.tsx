import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useServerFn } from "@tanstack/react-start";
import { strToU8, zipSync } from "fflate";
import { Header } from "@/components/site/Header";
import { runCodeRemote } from "@/lib/code-runner.functions";
import { analyzeProject, askCodeHelper, type Finding } from "@/lib/codehelper.functions";
import { LANGS, getLang, TEMPLATE_HANDOFF_KEY, type LangKey, type ProjectFile } from "@/lib/templates";
import { ChevronDown, ChevronUp, Download, Eye, FileCode2, FolderPlus, Loader2, PanelLeftClose, PanelLeftOpen, Play, Sparkles, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [
    { title: "CODEROOM — NYCODEHUB" },
    { name: "description", content: "Kora umushinga, NYCODER isuzume code yawe umurongo ku wundi, urebe igisohoka ako kanya." },
    { property: "og:title", content: "CODEROOM — NYCODEHUB" },
    { property: "og:description", content: "Ahantu ho kwandika, gusuzuma no gukuramo imishinga ya porogaramu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Practice,
});

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

const LINE_STYLE: Record<Line["kind"], { color: string; tag: string }> = {
  error: { color: "text-destructive", tag: "ERROR" },
  warn: { color: "text-chart-4", tag: "WARN " },
  logic: { color: "text-primary-glow", tag: "LOGIC" },
  fix: { color: "text-success", tag: "FIX  " },
  ok: { color: "text-success", tag: "OK   " },
  info: { color: "text-muted-foreground", tag: "     " },
  you: { color: "text-foreground", tag: "$" },
};

function parseAnswer(answer: string): Line[] {
  return answer.split("\n").map((l) => l.trim()).filter(Boolean).map<Line>((line) => {
    const upper = line.toUpperCase();
    if (upper.startsWith("ERROR:")) return { kind: "error", text: line.slice(6).trim() };
    if (upper.startsWith("WARN:")) return { kind: "warn", text: line.slice(5).trim() };
    if (upper.startsWith("FIX:")) return { kind: "fix", text: line.slice(4).trim() };
    return { kind: "info", text: line };
  });
}

function Practice() {
  const [mounted, setMounted] = useState(false);
  const [langKey, setLangKey] = useState<LangKey>("html");
  const lang = useMemo(() => getLang(langKey), [langKey]);
  const [files, setFiles] = useState<ProjectFile[]>([{ name: "index.html", content: LANGS[0].sample }]);
  const [activeName, setActiveName] = useState("index.html");
  const [output, setOutput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [running, setRunning] = useState(false);
  const [autorun, setAutorun] = useState(true);
  const [autoCheck, setAutoCheck] = useState(true);
  const [saved, setSaved] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [nycoderOpen, setNycoderOpen] = useState(true);
  const [lines, setLines] = useState<Line[]>([{ kind: "info", text: t.practice_helper_intro }]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);

  const debounceRef = useRef<number | null>(null);
  const checkRef = useRef<number | null>(null);
  const filesRef = useRef(files);
  const langRef = useRef(langKey);
  const logRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const runRemote = useServerFn(runCodeRemote);
  const askHelper = useServerFn(askCodeHelper);
  const analyze = useServerFn(analyzeProject);

  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const code = activeFile?.content ?? "";
  filesRef.current = files;
  langRef.current = langKey;

  useEffect(() => {
    setMounted(true);
    const handoff = sessionStorage.getItem(TEMPLATE_HANDOFF_KEY);
    if (handoff) {
      sessionStorage.removeItem(TEMPLATE_HANDOFF_KEY);
      try {
        const parsed = JSON.parse(handoff) as { lang: LangKey; files: ProjectFile[] };
        if (parsed?.files?.length) {
          localStorage.setItem(storageKey(parsed.lang), JSON.stringify(parsed.files));
          localStorage.setItem("practice:lang", parsed.lang);
          setLangKey(parsed.lang);
          toast.success("Template yafunguwe muri CODEROOM");
          return;
        }
      } catch { /* ignore malformed handoff */ }
    }
    const savedLanguage = localStorage.getItem("practice:lang") as LangKey | null;
    if (savedLanguage && LANGS.some((item) => item.key === savedLanguage)) setLangKey(savedLanguage);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("practice:lang", langKey);
    const stored = localStorage.getItem(storageKey(langKey));
    try {
      const parsed = stored ? JSON.parse(stored) as ProjectFile[] : null;
      const next = parsed?.length ? parsed : [{ name: lang.file, content: lang.sample }];
      setFiles(next); setActiveName(next[0].name);
    } catch { setFiles([{ name: lang.file, content: lang.sample }]); setActiveName(lang.file); }
    setOutput(""); setPreviewHtml(""); setFindings([]);
  }, [langKey, lang, mounted]);

  useEffect(() => {
    if (!mounted) return;
    setSaved(false);
    const id = window.setTimeout(() => {
      localStorage.setItem(storageKey(langKey), JSON.stringify(files));
      setSaved(true);
    }, 600);
    return () => window.clearTimeout(id);
  }, [files, langKey, mounted]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [lines, busy]);

  function updateCode(value: string) {
    setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: value } : file));
  }
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
  async function importFiles(list: FileList | null) {
    if (!list?.length) return;
    const imported: ProjectFile[] = [];
    for (const file of Array.from(list)) imported.push({ name: file.name, content: await file.text() });
    setFiles((current) => {
      const map = new Map(current.map((f) => [f.name, f]));
      imported.forEach((f) => map.set(f.name, f));
      return Array.from(map.values());
    });
    setActiveName(imported[0].name);
    toast.success(`Dosiye ${imported.length} zinjijwe mu mushinga`);
  }
  function downloadProject() {
    const archive = zipSync(Object.fromEntries(files.map((file) => [file.name, strToU8(file.content)])));
    const url = URL.createObjectURL(new Blob([archive], { type: "application/zip" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `nycodehub-${langKey}-project.zip`; anchor.click(); URL.revokeObjectURL(url);
    toast.success(t.practice_project_saved);
  }

  function buildWebPreview() {
    const html = filesRef.current.find((file) => file.name.endsWith(".html"));
    const css = filesRef.current.filter((f) => f.name.endsWith(".css")).map((f) => f.content).join("\n");
    const js = filesRef.current.filter((f) => f.name.endsWith(".js") || f.name.endsWith(".mjs")).map((f) => f.content).join("\n");
    const capture = `<script>const logs=[];["log","error","warn"].forEach(k=>{const o=console[k];console[k]=(...a)=>{logs.push(k+": "+a.map(String).join(" "));o(...a)}});window.onerror=(m,s,l)=>logs.push("error: "+m+" (umurongo "+l+")");window.addEventListener("load",()=>parent.postMessage({nycodehubOutput:logs.join("\\n")},"*"));<\/script>`;
    const style = css ? `<style>${css}</style>` : "";
    const script = js ? `<script>${js}<\/script>` : "";
    if (html) {
      let doc = html.content;
      doc = doc.includes("</head>") ? doc.replace("</head>", `${style}${capture}</head>`) : `${style}${capture}${doc}`;
      doc = doc.includes("</body>") ? doc.replace("</body>", `${script}</body>`) : doc + script;
      return doc;
    }
    return `<!doctype html><html><head><meta charset="utf-8" />${style}${capture}</head><body>${script}</body></html>`;
  }

  const run = useCallback(async () => {
    setRunning(true);
    try {
      const current = getLang(langRef.current);
      if (current.mode === "web") {
        const handler = (event: MessageEvent) => {
          if (typeof event.data?.nycodehubOutput === "string") {
            setOutput(event.data.nycodehubOutput || "✓ Byakoze — nta console output.");
            window.removeEventListener("message", handler);
          }
        };
        window.addEventListener("message", handler);
        setPreviewHtml(buildWebPreview());
      } else if (current.mode === "pyodide") {
        setOutput(t.practice_python_starting);
        const py = await loadPyodide() as { setStdout: (o: { batched: (v: string) => void }) => void; setStderr: (o: { batched: (v: string) => void }) => void; runPythonAsync: (v: string) => Promise<unknown> };
        const buffer: string[] = [];
        py.setStdout({ batched: (v) => buffer.push(v) }); py.setStderr({ batched: (v) => buffer.push(v) });
        const source = filesRef.current.filter((f) => f.name.endsWith(".py")).map((f) => f.content).join("\n") || code;
        try { await py.runPythonAsync(source); setOutput(buffer.join("\n") || t.practice_no_output); }
        catch (error) { setOutput(`${buffer.join("\n")}\n${error instanceof Error ? error.message : String(error)}`.trim()); }
      } else {
        setOutput(t.practice_running_server);
        const source = filesRef.current.find((f) => f.name === activeName)?.content ?? code;
        const result = await runRemote({ data: { language: current.key, source } });
        setOutput([result.stdout, result.stderr].filter(Boolean).join("\n") || `(${result.status})`);
      }
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Byanze gukora");
    } finally { setRunning(false); }
  }, [activeName, code, runRemote]);

  useEffect(() => {
    if (!autorun || lang.mode !== "web") return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void run(); }, 450);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [files, langKey, autorun, lang.mode, run]);

  const projectCode = useCallback(
    () => filesRef.current.map((file) => `### DOSIYE: ${file.name}\n${file.content}`).join("\n\n"),
    [],
  );

  const applyMarkers = useCallback((list: Finding[]) => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.getModels().forEach((model: MonacoEditor.ITextModel) => {
      const name = model.uri.path.replace(/^\//, "");
      const own = list.filter((f) => !f.file || f.file === name || f.file.endsWith(name));
      monaco.editor.setModelMarkers(model, "nycoder", own.map((f) => {
        const line = Math.min(Math.max(f.line, 1), model.getLineCount());
        return {
          startLineNumber: line,
          endLineNumber: line,
          startColumn: 1,
          endColumn: model.getLineMaxColumn(line),
          message: `NYCODER: ${f.message}${f.fix ? `\n→ ${f.fix}` : ""}`,
          severity: f.severity === "error"
            ? monaco.MarkerSeverity.Error
            : f.severity === "warning" ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Info,
        };
      }));
    });
  }, []);

  const runAnalysis = useCallback(async (silent = false) => {
    if (!silent) setNycoderOpen(true);
    setBusy(true);
    if (!silent) setLines((current) => [...current, { kind: "you", text: "nycoder --suzuma" }]);
    try {
      const report = await analyze({ data: { language: langRef.current, code: projectCode() } });
      setFindings(report.findings);
      applyMarkers(report.findings);
      if (!silent) {
        const next: Line[] = [];
        if (report.logic) next.push({ kind: "logic", text: report.logic });
        report.findings.forEach((f) => {
          next.push({
            kind: f.severity === "error" ? "error" : f.severity === "warning" ? "warn" : "info",
            text: `${f.file || activeName}:${f.line} — ${f.message}`,
          });
          if (f.fix) next.push({ kind: "fix", text: f.fix });
        });
        if (!report.findings.length) next.push({ kind: "ok", text: report.summary || "Nta kosa nabonye muri code yawe." });
        setLines((current) => [...current, ...next]);
      }
    } catch (error) {
      if (!silent) setLines((current) => [...current, { kind: "error", text: error instanceof Error ? error.message : "Byanze" }]);
    } finally { setBusy(false); }
  }, [analyze, projectCode, applyMarkers, activeName]);

  useEffect(() => {
    if (!autoCheck || !mounted) return;
    if (checkRef.current) window.clearTimeout(checkRef.current);
    checkRef.current = window.setTimeout(() => { void runAnalysis(true); }, 3500);
    return () => { if (checkRef.current) window.clearTimeout(checkRef.current); };
  }, [files, autoCheck, mounted, runAnalysis]);

  async function ask() {
    const question = prompt.trim();
    if (!question || busy) return;
    setPrompt("");
    if (/^(suzuma|analyse|analyze|debug)$/i.test(question)) return void runAnalysis();
    setBusy(true);
    setLines((current) => [...current, { kind: "you", text: question }]);
    try {
      const result = await askHelper({ data: { language: langRef.current, code: projectCode(), question } });
      setLines((current) => [...current, ...parseAnswer(result.answer)]);
    } catch (error) {
      setLines((current) => [...current, { kind: "error", text: error instanceof Error ? error.message : "Byanze" }]);
    } finally { setBusy(false); }
  }

  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warning").length;

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
            <span className={`hidden rounded px-2 py-0.5 text-[10px] sm:inline ${saved ? "text-success" : "text-muted-foreground"}`}>
              {saved ? "✓ Byabitswe" : "Kubika..."}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={langKey} onChange={(event) => setLangKey(event.target.value as LangKey)} className="rounded border border-border bg-surface px-2 py-1.5 text-xs font-mono">
              {LANGS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={autorun} onChange={(e) => setAutorun(e.target.checked)} />{t.practice_autorun}</label>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} />NYCODER</label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Upload className="size-3.5" />Injiza
              <input type="file" multiple className="hidden" onChange={(e) => { void importFiles(e.target.files); e.target.value = ""; }} />
            </label>
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
                {files.map((file) => {
                  const bad = findings.some((f) => f.severity === "error" && (f.file === file.name || f.file.endsWith(file.name)));
                  return (
                    <div key={file.name} className={`group flex items-center gap-1 rounded px-2 py-1.5 text-xs font-mono ${activeName === file.name ? "bg-primary/15 text-primary-glow" : "text-muted-foreground hover:bg-surface"}`}>
                      <button onClick={() => setActiveName(file.name)} className="flex min-w-0 flex-1 items-center gap-1.5">
                        <FileCode2 className={`size-3.5 shrink-0 ${bad ? "text-destructive" : ""}`} />
                        <span className={`truncate ${bad ? "text-destructive" : ""}`}>{file.name}</span>
                      </button>
                      <button onClick={() => deleteFile(file.name)} title={t.delete} className="opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="size-3" /></button>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          <section className="flex min-w-0 flex-[3] flex-col border-r border-border">
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3 text-xs text-muted-foreground">
              <span className="font-mono">{activeFile?.name}</span>
              <span className="flex items-center gap-3">
                {errorCount > 0 && <span className="text-destructive">● {errorCount} amakosa</span>}
                {warnCount > 0 && <span className="text-chart-4">● {warnCount} imiburo</span>}
                {!errorCount && !warnCount && findings.length === 0 && <span className="text-success">● OK</span>}
              </span>
            </div>
            <div className="min-h-0 flex-1 bg-surface-elevated">
              {mounted && activeFile && (
                <Editor
                  height="100%"
                  theme="vs-dark"
                  path={activeFile.name}
                  language={lang.monaco}
                  value={activeFile.content}
                  onChange={(value) => updateCode(value ?? "")}
                  onMount={(editor, monaco) => { editorRef.current = editor; monacoRef.current = monaco; applyMarkers(findings); }}
                  options={{ fontSize: 14, minimap: { enabled: false }, fontFamily: "JetBrains Mono, monospace", automaticLayout: true, tabSize: 2, scrollBeyondLastLine: false, glyphMargin: true }}
                />
              )}
            </div>
          </section>

          <section className="flex min-w-0 flex-[2] flex-col">
            <div className="flex min-h-0 flex-[3] flex-col border-b border-border">
              <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-xs text-muted-foreground"><Eye className="size-3.5 text-primary-glow" />{t.practice_preview}</div>
              <iframe title={t.practice_preview} sandbox="allow-scripts allow-modals" srcDoc={previewHtml || "<html><body style='font-family:system-ui;padding:16px;color:#777'>Igaragaza rizaza hano</body></html>"} className="min-h-0 flex-1 w-full bg-white" />
            </div>
            <div className="flex min-h-0 flex-[2] flex-col bg-background/80">
              <div className="flex h-8 shrink-0 items-center border-b border-border px-3 text-xs text-muted-foreground">{t.practice_output}</div>
              <pre className="min-h-0 flex-1 overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">{output || t.practice_no_output}</pre>
            </div>
          </section>
        </div>

        <section className={`shrink-0 border-t border-primary/40 bg-[#0b0b12] font-mono transition-all ${nycoderOpen ? "h-56" : "h-9"}`}>
          <div className="flex h-9 items-center justify-between border-b border-border px-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-primary-glow">▊</span>
              <span className="font-bold tracking-wider">NYCODER</span>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">AI isesengura code yawe umurongo ku wundi — andika &ldquo;suzuma&rdquo; cyangwa ikibazo cyawe</span>
            </div>
            <div className="flex items-center gap-2">
              {busy && <Loader2 className="size-3.5 animate-spin text-primary-glow" />}
              <button onClick={() => void runAnalysis()} className="inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-1 text-[11px] text-primary-glow hover:bg-primary/30"><Sparkles className="size-3" />Suzuma</button>
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
