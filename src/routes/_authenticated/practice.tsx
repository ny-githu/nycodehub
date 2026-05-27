import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useServerFn } from "@tanstack/react-start";
import { runCodeRemote } from "@/lib/code-runner.functions";
import { Play, Pause, Loader2, Eye, Code, Layout as LayoutIcon, RefreshCw, Terminal as TermIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice Lab — NYCODEHUB" },
      { name: "description", content: "Real VS Code-style editor + live preview + multi-language runner." },
    ],
  }),
  component: Practice,
});

type ViewMode = "video" | "split" | "workspace";

type LangKey =
  | "html" | "javascript" | "typescript" | "python"
  | "c" | "cpp" | "java" | "csharp" | "go" | "rust"
  | "php" | "ruby" | "kotlin" | "swift" | "bash" | "sql";

const LANGS: { key: LangKey; label: string; monaco: string; sample: string; remote: boolean; pyodide?: boolean; preview?: boolean }[] = [
  { key: "html", label: "HTML / CSS / JS", monaco: "html", remote: false, preview: true,
    sample: `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: system-ui; padding: 24px; background:#0b1020; color:#e6e9f0;}
  h1 { color:#8b5cf6; }
  button { padding:8px 16px; border-radius:8px; border:0; background:#8b5cf6; color:white; cursor:pointer; }
</style></head>
<body>
  <h1>Hello NYCODEHUB 👋</h1>
  <p>Click the button:</p>
  <button onclick="alert('It works!')">Click me</button>
</body>
</html>` },
  { key: "javascript", label: "JavaScript", monaco: "javascript", remote: false, preview: true,
    sample: `// Output appears in the console panel
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet("NYCODEHUB"));
[1,2,3,4,5].forEach(n => console.log(n, n*n));` },
  { key: "python", label: "Python", monaco: "python", remote: false, pyodide: true,
    sample: `# Runs in your browser via Pyodide
def greet(name):
    return f"Hello, {name}!"

print(greet("NYCODEHUB"))
for i in range(1, 6):
    print(i, i*i)` },
  { key: "typescript", label: "TypeScript", monaco: "typescript", remote: true,
    sample: `const greet = (name: string): string => \`Hello, \${name}!\`;
console.log(greet("NYCODEHUB"));` },
  { key: "c", label: "C", monaco: "c", remote: true,
    sample: `#include <stdio.h>
int main() { printf("Hello NYCODEHUB!\\n"); return 0; }` },
  { key: "cpp", label: "C++", monaco: "cpp", remote: true,
    sample: `#include <iostream>
int main() { std::cout << "Hello NYCODEHUB!\\n"; return 0; }` },
  { key: "java", label: "Java", monaco: "java", remote: true,
    sample: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello NYCODEHUB!");
  }
}` },
  { key: "csharp", label: "C#", monaco: "csharp", remote: true,
    sample: `using System;
class P { static void Main() { Console.WriteLine("Hello NYCODEHUB!"); } }` },
  { key: "go", label: "Go", monaco: "go", remote: true,
    sample: `package main
import "fmt"
func main() { fmt.Println("Hello NYCODEHUB!") }` },
  { key: "rust", label: "Rust", monaco: "rust", remote: true,
    sample: `fn main() { println!("Hello NYCODEHUB!"); }` },
  { key: "php", label: "PHP", monaco: "php", remote: true,
    sample: `<?php echo "Hello NYCODEHUB!\\n"; ?>` },
  { key: "ruby", label: "Ruby", monaco: "ruby", remote: true,
    sample: `puts "Hello NYCODEHUB!"` },
  { key: "kotlin", label: "Kotlin", monaco: "kotlin", remote: true,
    sample: `fun main() { println("Hello NYCODEHUB!") }` },
  { key: "swift", label: "Swift", monaco: "swift", remote: true,
    sample: `print("Hello NYCODEHUB!")` },
  { key: "bash", label: "Bash", monaco: "shell", remote: true,
    sample: `echo "Hello NYCODEHUB!"
for i in 1 2 3; do echo "i=$i"; done` },
  { key: "sql", label: "SQL", monaco: "sql", remote: true,
    sample: `SELECT 'Hello NYCODEHUB' AS greeting;` },
];

// Pyodide loader (lazy, cached)
let pyodidePromise: Promise<unknown> | null = null;
async function loadPyodide() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Pyodide"));
      document.head.appendChild(s);
    });
    // @ts-expect-error global from script
    return await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
  })();
  return pyodidePromise;
}

function Practice() {
  const [view, setView] = useState<ViewMode>("split");
  const [langKey, setLangKey] = useState<LangKey>("html");
  const lang = useMemo(() => LANGS.find((l) => l.key === langKey)!, [langKey]);
  const [code, setCode] = useState(lang.sample);
  const [output, setOutput] = useState<string>("");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const runRemote = useServerFn(runCodeRemote);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setCode(lang.sample); setOutput(""); setPreviewHtml(""); }, [langKey]);

  async function run() {
    setRunning(true);
    setOutput("");
    try {
      if (lang.key === "html") {
        setPreviewHtml(code);
        setOutput("✓ Preview updated");
      } else if (lang.key === "javascript") {
        // Run in sandboxed iframe, capture console
        const wrapper = `<!doctype html><html><body><script>
          const _log = [];
          ["log","error","warn","info"].forEach(k => {
            const orig = console[k];
            console[k] = (...a) => { _log.push(k+": "+a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')); orig(...a); };
          });
          window.addEventListener("error", e => _log.push("error: "+e.message));
          try { ${code} } catch(e) { _log.push("error: "+e.message); }
          parent.postMessage({ __jsout: _log.join("\\n") }, "*");
        </script></body></html>`;
        const handler = (e: MessageEvent) => {
          if (e.data?.__jsout !== undefined) {
            setOutput(e.data.__jsout || "(no console output)");
            window.removeEventListener("message", handler);
          }
        };
        window.addEventListener("message", handler);
        setPreviewHtml(wrapper);
      } else if (lang.pyodide) {
        setOutput("Loading Python runtime (first time only)…");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const py: any = await loadPyodide();
        const buf: string[] = [];
        py.setStdout({ batched: (s: string) => buf.push(s) });
        py.setStderr({ batched: (s: string) => buf.push(s) });
        try {
          await py.runPythonAsync(code);
          setOutput(buf.join("\n") || "(no output)");
        } catch (e) {
          setOutput((buf.join("\n") + "\n" + (e instanceof Error ? e.message : String(e))).trim());
        }
      } else if (lang.remote) {
        setOutput("Running on remote runner…");
        const res = await runRemote({ data: { language: lang.key, source: code } });
        setOutput([res.stdout, res.stderr].filter(Boolean).join("\n") || `(${res.status})`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
      setOutput(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  const showVideo = view !== "workspace";
  const showWorkspace = view !== "video";

  return (
    <Layout>
      <div className="container mx-auto max-w-[1500px] px-4 md:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-mono text-xs text-primary-glow">/ practice / lab</div>
            <h1 className="mt-1 text-xl md:text-2xl font-bold">NYCODEHUB Lab — Code & Preview</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border bg-surface overflow-hidden">
              {([
                ["video", Eye, "Video only"],
                ["split", LayoutIcon, "Split"],
                ["workspace", Code, "Workspace only"],
              ] as const).map(([id, Icon, label]) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`px-3 py-1.5 text-xs inline-flex items-center gap-1.5 ${view === id ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title={label}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`grid gap-3 ${view === "split" ? "md:grid-cols-2" : "grid-cols-1"} min-h-[75vh]`}>
          {showVideo && (
            <div className="flex flex-col gap-2">
              <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video shadow-elevated">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20 grid-bg opacity-80" />
                <div className="absolute inset-0 grid place-items-center">
                  <button
                    onClick={() => setPlaying((p) => !p)}
                    className="grid place-items-center size-20 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition"
                  >
                    {playing ? <Pause className="size-8" /> : <Play className="size-8 ml-1" />}
                  </button>
                </div>
                <div className="absolute top-3 left-3 px-2 py-1 rounded bg-background/60 backdrop-blur text-[11px] font-mono">
                  ● LIVE LESSON
                </div>
              </div>

              <div className="rounded-xl border border-border bg-gradient-card p-4">
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span className="font-mono text-primary-glow text-xs">snippets</span>
                  <span className="text-[10px] text-muted-foreground">click to copy</span>
                </h3>
                <div className="space-y-2">
                  {["const [count, setCount] = useState(0)", "git commit -m 'progress'", "console.log('hello')"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { navigator.clipboard.writeText(s); toast.success("Copied"); }}
                      className="w-full text-left px-3 py-2 text-xs font-mono bg-surface hover:bg-surface/70 border border-border rounded truncate"
                    >{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showWorkspace && (
            <div className="flex flex-col gap-2">
              {/* Toolbar */}
              <div className="rounded-xl border border-border bg-surface flex flex-wrap items-center gap-2 p-2">
                <select
                  value={langKey}
                  onChange={(e) => setLangKey(e.target.value as LangKey)}
                  className="px-2 py-1.5 rounded bg-surface-elevated border border-border text-sm font-mono"
                >
                  {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
                <button
                  onClick={run}
                  disabled={running}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow disabled:opacity-60"
                >
                  {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Run
                </button>
                <button
                  onClick={() => { setCode(lang.sample); setOutput(""); setPreviewHtml(""); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-elevated text-sm border border-border"
                  title="Reset to sample"
                >
                  <RefreshCw className="size-3.5" /> Reset
                </button>
                <span className="ml-auto text-xs font-mono text-muted-foreground hidden sm:inline">
                  {lang.preview ? "live preview" : lang.pyodide ? "in-browser Python" : lang.remote ? "remote runner" : ""}
                </span>
              </div>

              {/* Editor */}
              <div className="rounded-xl border border-border overflow-hidden bg-[#1e1e1e] flex-1 min-h-[400px]">
                {mounted && (
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={lang.monaco}
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      fontFamily: "JetBrains Mono, monospace",
                      automaticLayout: true,
                      tabSize: 2,
                      scrollBeyondLastLine: false,
                    }}
                  />
                )}
              </div>

              {/* Output: preview iframe or terminal */}
              {(lang.preview || lang.key === "javascript") ? (
                <div className="rounded-xl border border-border bg-white overflow-hidden h-[280px]">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
                    <Eye className="size-3.5 text-primary-glow" />
                    <span className="text-xs font-mono text-muted-foreground">preview</span>
                  </div>
                  <iframe
                    title="preview"
                    sandbox="allow-scripts allow-modals"
                    srcDoc={previewHtml || "<html><body style='font-family:system-ui;padding:24px;color:#888'>Press <b>Run</b> to see the output.</body></html>"}
                    className="w-full h-[240px] bg-white"
                  />
                </div>
              ) : null}
              <div className="rounded-xl border border-border bg-[oklch(0.10_0.04_270)] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
                  <TermIcon className="size-3.5 text-primary-glow" />
                  <span className="text-xs font-mono text-muted-foreground">output</span>
                </div>
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-[260px] min-h-[120px] text-foreground">
                  {output || <span className="text-muted-foreground">// run your code to see output here</span>}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
