import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runCodeRemote } from "@/lib/code-runner.functions";
import { askCodeHelper } from "@/lib/codehelper.functions";
import { Play, Loader2, RefreshCw, Sparkles, X, Terminal as TermIcon, Eye, Send } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [{ title: "Igirira — NYCODEHUB" }] }),
  component: Practice,
});

type LangKey =
  | "html" | "javascript" | "typescript" | "python"
  | "c" | "cpp" | "java" | "csharp" | "go" | "rust"
  | "php" | "ruby" | "kotlin" | "swift" | "bash" | "sql";

const LANGS: { key: LangKey; label: string; monaco: string; sample: string; remote: boolean; pyodide?: boolean; preview?: boolean; hints: string[] }[] = [
  { key: "html", label: "HTML / CSS / JS", monaco: "html", remote: false, preview: true,
    sample: `<!DOCTYPE html>\n<html>\n<head><style>\n  body{font-family:system-ui;padding:24px;background:#0b1020;color:#e6e9f0;}\n  h1{color:#8b5cf6;}\n</style></head>\n<body>\n  <h1>Muraho NYCODEHUB 👋</h1>\n  <button onclick="alert('Bigenze neza!')">Kanda</button>\n</body>\n</html>`,
    hints: ["<h1>Umutwe</h1>", "<button onclick=\"alert('hi')\">Kanda</button>", "<style>body{color:red;}</style>"] },
  { key: "javascript", label: "JavaScript", monaco: "javascript", remote: false, preview: true,
    sample: `console.log("Muraho NYCODEHUB");\nfor (let i = 1; i <= 5; i++) console.log(i, i*i);`,
    hints: ["console.log('hi')", "const x = [1,2,3].map(n => n*2)", "function add(a,b){ return a+b; }"] },
  { key: "python", label: "Python", monaco: "python", remote: false, pyodide: true,
    sample: `print("Muraho NYCODEHUB")\nfor i in range(1, 6):\n    print(i, i*i)`,
    hints: ["print('hi')", "for i in range(10): print(i)", "def add(a,b): return a+b"] },
  { key: "typescript", label: "TypeScript", monaco: "typescript", remote: true,
    sample: `const greet = (n: string): string => \`Muraho \${n}\`;\nconsole.log(greet("NYCODEHUB"));`,
    hints: ["type User = { id: number; name: string }", "const x: number[] = [1,2,3]"] },
  { key: "c", label: "C", monaco: "c", remote: true,
    sample: `#include <stdio.h>\nint main(){ printf("Muraho NYCODEHUB!\\n"); return 0; }`,
    hints: ["printf(\"hi\\n\");", "int x = 5;", "for(int i=0;i<5;i++){ }"] },
  { key: "cpp", label: "C++", monaco: "cpp", remote: true,
    sample: `#include <iostream>\nint main(){ std::cout << "Muraho NYCODEHUB!\\n"; }`,
    hints: ["std::cout << x << std::endl;", "std::vector<int> v = {1,2,3};"] },
  { key: "java", label: "Java", monaco: "java", remote: true,
    sample: `public class Main {\n  public static void main(String[] args){\n    System.out.println("Muraho NYCODEHUB!");\n  }\n}`,
    hints: ["System.out.println(\"hi\");", "int[] arr = {1,2,3};"] },
  { key: "csharp", label: "C#", monaco: "csharp", remote: true,
    sample: `using System;\nclass P { static void Main(){ Console.WriteLine("Muraho NYCODEHUB!"); } }`,
    hints: ["Console.WriteLine(\"hi\");"] },
  { key: "go", label: "Go", monaco: "go", remote: true,
    sample: `package main\nimport "fmt"\nfunc main(){ fmt.Println("Muraho NYCODEHUB!") }`,
    hints: ["fmt.Println(\"hi\")"] },
  { key: "rust", label: "Rust", monaco: "rust", remote: true,
    sample: `fn main(){ println!("Muraho NYCODEHUB!"); }`,
    hints: ["println!(\"hi\");", "let x: i32 = 5;"] },
  { key: "php", label: "PHP", monaco: "php", remote: true, sample: `<?php echo "Muraho NYCODEHUB!\\n"; ?>`, hints: ["echo 'hi';"] },
  { key: "ruby", label: "Ruby", monaco: "ruby", remote: true, sample: `puts "Muraho NYCODEHUB!"`, hints: ["puts 'hi'", "[1,2,3].each { |n| puts n }"] },
  { key: "kotlin", label: "Kotlin", monaco: "kotlin", remote: true, sample: `fun main(){ println("Muraho NYCODEHUB!") }`, hints: ["println(\"hi\")"] },
  { key: "swift", label: "Swift", monaco: "swift", remote: true, sample: `print("Muraho NYCODEHUB!")`, hints: ["print(\"hi\")"] },
  { key: "bash", label: "Bash", monaco: "shell", remote: true, sample: `echo "Muraho NYCODEHUB!"\nfor i in 1 2 3; do echo "i=$i"; done`, hints: ["echo $VAR", "for i in 1 2 3; do echo $i; done"] },
  { key: "sql", label: "SQL", monaco: "sql", remote: true, sample: `SELECT 'Muraho NYCODEHUB' AS greeting;`, hints: ["SELECT * FROM t;", "INSERT INTO t (a) VALUES (1);"] },
];

let pyodidePromise: Promise<unknown> | null = null;
async function loadPyodide() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Pyodide failed to load"));
      document.head.appendChild(s);
    });
    // @ts-expect-error global
    return await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
  })();
  return pyodidePromise;
}

function Practice() {
  const [langKey, setLangKey] = useState<LangKey>("html");
  const lang = useMemo(() => LANGS.find((l) => l.key === langKey)!, [langKey]);
  const [code, setCode] = useState(lang.sample);
  const [output, setOutput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [running, setRunning] = useState(false);
  const [autorun, setAutorun] = useState(true);
  const [helperOpen, setHelperOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const runRemote = useServerFn(runCodeRemote);
  const askHelper = useServerFn(askCodeHelper);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setCode(lang.sample); setOutput(""); setPreviewHtml(""); }, [langKey]);

  async function run() {
    setRunning(true);
    setOutput("");
    try {
      if (lang.key === "html") {
        setPreviewHtml(code);
        setOutput("✓ preview");
      } else if (lang.key === "javascript") {
        const wrapper = `<!doctype html><html><body><script>
          const _log = [];
          ["log","error","warn","info"].forEach(k => {
            const o = console[k];
            console[k] = (...a) => { _log.push(k+": "+a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')); o(...a); };
          });
          window.addEventListener("error", e => _log.push("error: "+e.message));
          try { ${code} } catch(e) { _log.push("error: "+e.message); }
          parent.postMessage({ __jsout: _log.join("\\n") }, "*");
        </script></body></html>`;
        const handler = (e: MessageEvent) => {
          if (e.data?.__jsout !== undefined) { setOutput(e.data.__jsout || "(nta output)"); window.removeEventListener("message", handler); }
        };
        window.addEventListener("message", handler);
        setPreviewHtml(wrapper);
      } else if (lang.pyodide) {
        setOutput("Python iratangira…");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const py: any = await loadPyodide();
        const buf: string[] = [];
        py.setStdout({ batched: (s: string) => buf.push(s) });
        py.setStderr({ batched: (s: string) => buf.push(s) });
        try { await py.runPythonAsync(code); setOutput(buf.join("\n") || "(nta output)"); }
        catch (e) { setOutput((buf.join("\n") + "\n" + (e instanceof Error ? e.message : String(e))).trim()); }
      } else if (lang.remote) {
        setOutput("Birakorerwa kuri server…");
        const res = await runRemote({ data: { language: lang.key, source: code } });
        setOutput([res.stdout, res.stderr].filter(Boolean).join("\n") || `(${res.status})`);
      }
    } catch (e) {
      setOutput(e instanceof Error ? e.message : "Run failed");
    } finally { setRunning(false); }
  }

  // Auto-run for instant-preview languages (html/js) with debounce
  useEffect(() => {
    if (!autorun) return;
    if (lang.key !== "html" && lang.key !== "javascript") return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { run(); }, 500);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, langKey, autorun]);

  return (
    <Layout>
      <div className="container mx-auto max-w-[1600px] px-3 md:px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 animate-fade-in">
          <div>
            <div className="font-mono text-xs text-primary-glow">/ practice / lab</div>
            <h1 className="mt-1 text-xl md:text-2xl font-bold">{t.practice_h1}</h1>
            <p className="text-xs text-muted-foreground">{t.practice_subtitle}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={langKey}
              onChange={(e) => setLangKey(e.target.value as LangKey)}
              className="px-2 py-1.5 rounded bg-surface border border-border text-sm font-mono"
            >
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={autorun} onChange={(e) => setAutorun(e.target.checked)} />
              {t.practice_autorun}
            </label>
            <button onClick={run} disabled={running} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow disabled:opacity-60 hover-scale">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {t.practice_run}
            </button>
            <button onClick={() => { setCode(lang.sample); setOutput(""); setPreviewHtml(""); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface text-sm border border-border hover-scale">
              <RefreshCw className="size-3.5" /> {t.practice_reset}
            </button>
            <button
              onClick={() => setHelperOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border hover-scale ${helperOpen ? "bg-primary/15 border-primary/40 text-primary-glow" : "bg-surface border-border text-muted-foreground"}`}
            >
              <Sparkles className="size-3.5" /> {helperOpen ? t.practice_helper_off : t.practice_helper_on}
            </button>
          </div>
        </div>

        {/* Three columns: video | editor+output | helper */}
        <div className={`grid gap-3 ${helperOpen ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_320px]" : "lg:grid-cols-2"} min-h-[80vh]`}>
          {/* VIDEO column (sticks next to editor for easy copy/paste) */}
          <div className="flex flex-col gap-2">
            <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video shadow-elevated animate-scale-in">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20 grid-bg opacity-80" />
              <div className="absolute inset-0 grid place-items-center text-center px-4">
                <div>
                  <div className="text-xs font-mono text-primary-glow">● LIVE</div>
                  <div className="mt-1 text-sm text-muted-foreground">Hitamo isomo muri "{t.nav_courses}" kugira ngo ubonere video iri hano.</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-gradient-card p-3">
              <h3 className="font-semibold text-xs mb-2 flex items-center gap-2">
                <span className="font-mono text-primary-glow">snippets</span>
                <span className="text-[10px] text-muted-foreground">kanda kopa</span>
              </h3>
              <div className="space-y-1.5">
                {lang.hints.map((s) => (
                  <button
                    key={s}
                    onClick={() => { navigator.clipboard.writeText(s); toast.success(t.copied); }}
                    className="w-full text-left px-2.5 py-1.5 text-xs font-mono bg-surface hover:bg-surface/70 border border-border rounded truncate"
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>

          {/* EDITOR + OUTPUT column */}
          <div className="flex flex-col gap-2">
            <div className="rounded-xl border border-border overflow-hidden bg-[#1e1e1e] flex-1 min-h-[380px]">
              {mounted && (
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={lang.monaco}
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{
                    fontSize: 14, minimap: { enabled: false },
                    fontFamily: "JetBrains Mono, monospace",
                    automaticLayout: true, tabSize: 2, scrollBeyondLastLine: false,
                  }}
                />
              )}
            </div>
            {(lang.preview || lang.key === "javascript") && (
              <div className="rounded-xl border border-border bg-white overflow-hidden h-[260px]">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
                  <Eye className="size-3.5 text-primary-glow" />
                  <span className="text-xs font-mono text-muted-foreground">{t.practice_preview}</span>
                </div>
                <iframe
                  title="preview"
                  sandbox="allow-scripts allow-modals"
                  srcDoc={previewHtml || "<html><body style='font-family:system-ui;padding:24px;color:#888'>Press Run…</body></html>"}
                  className="w-full h-[220px] bg-white"
                />
              </div>
            )}
            <div className="rounded-xl border border-border bg-[oklch(0.10_0.04_270)] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
                <TermIcon className="size-3.5 text-primary-glow" />
                <span className="text-xs font-mono text-muted-foreground">{t.practice_output}</span>
              </div>
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[240px] min-h-[100px] text-foreground">
                {output || <span className="text-muted-foreground">// run code…</span>}
              </pre>
            </div>
          </div>

          {/* HELPER column */}
          {helperOpen && <CodeHelperPanel language={lang.key} code={code} askHelper={askHelper} onClose={() => setHelperOpen(false)} />}
        </div>
      </div>
    </Layout>
  );
}

function CodeHelperPanel({
  language, code, askHelper, onClose,
}: {
  language: string;
  code: string;
  askHelper: (args: { data: { language: string; code: string; question: string } }) => Promise<{ answer: string }>;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<{ q: string; a: string }[]>([]);
  const [pending, setPending] = useState(false);

  async function ask() {
    const q = question.trim();
    if (!q || pending) return;
    setPending(true);
    setQuestion("");
    try {
      const { answer } = await askHelper({ data: { language, code, question: q } });
      setThread((t) => [...t, { q, a: answer }]);
    } catch (e) {
      setThread((t) => [...t, { q, a: e instanceof Error ? e.message : "Error" }]);
    } finally { setPending(false); }
  }

  return (
    <aside className="rounded-xl border border-primary/30 bg-gradient-card flex flex-col min-h-[400px] animate-scale-in">
      <header className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary-glow" />
          <span className="font-semibold text-sm">{t.practice_helper}</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-surface rounded text-muted-foreground"><X className="size-4" /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        {thread.length === 0 ? (
          <p className="text-muted-foreground">{t.practice_helper_intro}</p>
        ) : (
          thread.map((m, i) => (
            <div key={i} className="space-y-1 animate-fade-in">
              <div className="font-mono text-xs text-primary-glow">› {m.q}</div>
              <div className="text-sm whitespace-pre-wrap text-foreground/90 bg-surface/50 rounded-md p-2 border border-border/50">{m.a}</div>
            </div>
          ))
        )}
        {pending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> {t.practice_thinking}</div>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); ask(); }}
        className="p-2 border-t border-border flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.practice_helper_placeholder}
          className="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-sm"
        />
        <button type="submit" disabled={pending || !question.trim()} className="px-3 py-1.5 rounded bg-gradient-primary text-primary-foreground text-sm disabled:opacity-60">
          <Send className="size-3.5" />
        </button>
      </form>
    </aside>
  );
}
