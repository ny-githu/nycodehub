import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { strToU8, zipSync } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { runCodeRemote } from "@/lib/code-runner.functions";
import { askCodeHelper } from "@/lib/codehelper.functions";
import { Download, Eye, FileCode2, FolderPlus, Loader2, Play, Send, Sparkles, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({ meta: [
    { title: "Igirira — NYCODEHUB" },
    { name: "description", content: "Kora umushinga, suzuma code ukoresheje CODEHELPER, hanyuma uwumanure kuri mudasobwa yawe." },
    { property: "og:title", content: "Igirira — NYCODEHUB" },
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
  const [videoOpen, setVideoOpen] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const runRemote = useServerFn(runCodeRemote);
  const askHelper = useServerFn(askCodeHelper);
  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const code = activeFile?.content ?? "";

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

  return <Layout><div className="mx-auto max-w-[1800px] px-3 py-4 md:px-5">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3 animate-fade-in"><div><h1 className="text-xl font-bold md:text-2xl">{t.practice_h1}</h1><p className="text-xs text-muted-foreground">Kora umushinga wawe, CODEHELPER iwusuzume, uwumanure igihe urangije.</p></div><div className="flex flex-wrap items-center gap-2">
      <select value={langKey} onChange={(event) => setLangKey(event.target.value as LangKey)} className="rounded border border-border bg-surface px-2 py-2 text-sm font-mono">{LANGS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
      <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><input type="checkbox" checked={autorun} onChange={(event) => setAutorun(event.target.checked)} />{t.practice_autorun}</label>
      <button onClick={() => setVideoOpen((open) => !open)} className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-2 text-xs hover:border-primary/60"><Video className="size-4" />{videoOpen ? t.practice_video_hide : t.practice_video_show}</button>
      <button onClick={downloadProject} className="inline-flex items-center gap-1.5 rounded bg-gradient-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow"><Download className="size-4" />{t.practice_download}</button>
    </div></header>
    {videoOpen && <div className="mb-3 animate-slide-up"><PracticeVideo /></div>}
    <div className="grid min-h-[calc(100vh-150px)] gap-3 md:grid-cols-[minmax(0,2fr)_minmax(290px,0.8fr)]">
      <section className="grid min-w-0 overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-[150px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-background/60 md:border-b-0 md:border-r"><div className="flex h-10 items-center justify-between border-b border-border px-2"><span className="text-xs font-semibold uppercase text-muted-foreground">{t.practice_files}</span><button onClick={createFile} title={t.practice_new_file} className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground"><FolderPlus className="size-4" /></button></div><div className="flex gap-1 overflow-x-auto p-1 md:block md:overflow-visible">{files.map((file) => <div key={file.name} className={`group flex min-w-max items-center gap-1 rounded px-2 py-2 text-xs font-mono md:min-w-0 ${activeName === file.name ? "bg-primary/15 text-primary-glow" : "text-muted-foreground hover:bg-surface"}`}><button onClick={() => setActiveName(file.name)} className="flex min-w-0 flex-1 items-center gap-1.5"><FileCode2 className="size-3.5 shrink-0" /><span className="truncate">{file.name}</span></button><button onClick={() => deleteFile(file.name)} title={t.delete} className="opacity-60 hover:text-destructive md:opacity-0 md:group-hover:opacity-100"><Trash2 className="size-3" /></button></div>)}</div></aside>
        <div className="grid min-h-[680px] min-w-0 grid-rows-[minmax(350px,1fr)_260px]"><div className="min-h-0 bg-surface-elevated"><div className="flex h-10 items-center justify-between border-b border-border px-3"><span className="text-xs font-mono text-muted-foreground">{activeName}</span><button onClick={() => void run()} disabled={running} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">{running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}{t.practice_run}</button></div>{mounted && activeFile && <Editor height="calc(100% - 40px)" theme="vs-dark" path={activeFile.name} language={lang.monaco} value={activeFile.content} onChange={(value) => updateCode(value ?? "")} options={{ fontSize: 14, minimap: { enabled: false }, fontFamily: "JetBrains Mono, monospace", automaticLayout: true, tabSize: 2, scrollBeyondLastLine: false }} />}</div>
          <div className="grid min-h-0 border-t border-border lg:grid-cols-2"><div className="min-h-0 border-b border-border lg:border-b-0 lg:border-r"><div className="flex h-9 items-center gap-2 border-b border-border px-3 text-xs text-muted-foreground"><Eye className="size-3.5 text-primary-glow" />{t.practice_preview}</div><iframe title={t.practice_preview} sandbox="allow-scripts allow-modals" srcDoc={previewHtml || "<html><body style='font-family:system-ui;padding:24px;color:#777'>Igaragaza rizaza hano</body></html>"} className="h-[220px] w-full bg-white" /></div><div className="min-h-0 bg-background/80"><div className="flex h-9 items-center border-b border-border px-3 text-xs text-muted-foreground">{t.practice_output}</div><pre className="h-[220px] overflow-auto p-3 text-xs font-mono whitespace-pre-wrap">{output || t.practice_no_output}</pre></div></div>
        </div>
      </section>
      <CodeHelperPanel language={lang.key} files={files} askHelper={askHelper} />
    </div>
  </div></Layout>;
}

function CodeHelperPanel({ language, files, askHelper }: { language: string; files: ProjectFile[]; askHelper: (args: { data: { language: string; code: string; question: string } }) => Promise<{ answer: string }> }) {
  const [question, setQuestion] = useState(""); const [thread, setThread] = useState<{ question: string; answer: string }[]>([]); const [pending, setPending] = useState(false);
  async function ask() {
    const prompt = question.trim(); if (!prompt || pending) return; setPending(true); setQuestion("");
    const projectCode = files.map((file) => `DOSIYE: ${file.name}\n${file.content}`).join("\n\n");
    try { const result = await askHelper({ data: { language, code: projectCode, question: prompt } }); setThread((current) => [...current, { question: prompt, answer: result.answer }]); }
    catch (error) { setThread((current) => [...current, { question: prompt, answer: error instanceof Error ? error.message : "Byanze" }]); } finally { setPending(false); }
  }
  return <aside className="flex min-h-[580px] flex-col overflow-hidden rounded-lg border border-primary/30 bg-gradient-card shadow-elevated animate-scale-in"><header className="flex h-12 items-center gap-2 border-b border-border px-4"><span className="grid size-7 place-items-center rounded bg-gradient-primary"><Sparkles className="size-4 text-primary-foreground" /></span><div><div className="text-sm font-semibold">{t.practice_helper}</div><div className="text-[10px] text-muted-foreground">Isuzuma amadosiye yose y'umushinga</div></div></header><div className="flex-1 space-y-4 overflow-y-auto p-3 text-sm">{thread.length === 0 && <div className="rounded border border-border bg-surface/60 p-3 text-muted-foreground"><p>{t.practice_helper_intro}</p><button onClick={() => setQuestion("Suzuma umushinga wanjye, umbwire amakosa n'icyo nakosora.")} className="mt-3 text-left text-xs text-primary-glow hover:underline">Suzuma amakosa yose ari muri uyu mushinga →</button></div>}{thread.map((message, index) => <div key={`${message.question}-${index}`} className="space-y-2 animate-slide-up"><div className="ml-6 rounded bg-primary/15 p-2 text-xs text-primary-glow">{message.question}</div><div className="whitespace-pre-wrap rounded border border-border bg-surface/70 p-3 leading-relaxed">{message.answer}</div></div>)}{pending && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" />{t.practice_thinking}</div>}</div><form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="border-t border-border p-3"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t.practice_helper_placeholder} rows={3} className="w-full resize-none rounded border border-border bg-surface p-2 text-sm outline-none focus:border-primary" /><button type="submit" disabled={pending || !question.trim()} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded bg-gradient-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"><Send className="size-4" />{t.practice_helper_ask}</button></form></aside>;
}

function PracticeVideo() {
  const [courseId, setCourseId] = useState(""); const [videoId, setVideoId] = useState("");
  const { data: courses } = useQuery({ queryKey: ["practice-courses"], queryFn: async () => { const { data } = await supabase.from("courses").select("id, title").order("title"); return data ?? []; } });
  const { data: videos } = useQuery({ queryKey: ["practice-videos", courseId], enabled: Boolean(courseId), queryFn: async () => { const { data } = await supabase.from("course_videos").select("*").eq("course_id", courseId).order("sort_order").order("created_at"); return data ?? []; } });
  useEffect(() => { if (videos?.length && !videos.some((video) => video.id === videoId)) setVideoId(videos[0].id); }, [videos, videoId]);
  const active = videos?.find((video) => video.id === videoId); const url = active?.video_url ?? (active?.storage_path ? supabase.storage.from("course-videos").getPublicUrl(active.storage_path).data.publicUrl : null); const youtube = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return <section className="grid gap-3 rounded-lg border border-border bg-surface p-3 lg:grid-cols-[300px_minmax(0,1fr)]"><div className="space-y-2"><select value={courseId} onChange={(event) => { setCourseId(event.target.value); setVideoId(""); }} className="w-full rounded border border-border bg-background px-2 py-2 text-xs"><option value="">Hitamo isomo</option>{courses?.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select><select value={videoId} onChange={(event) => setVideoId(event.target.value)} className="w-full rounded border border-border bg-background px-2 py-2 text-xs" disabled={!videos?.length}><option value="">Hitamo video</option>{videos?.map((video) => <option key={video.id} value={video.id}>{video.topic} · {video.title}</option>)}</select><p className="text-xs text-muted-foreground">Video ni inyongera. Workspace na CODEHELPER bikomeza kuba ah'ingenzi.</p></div><div className="aspect-video max-h-[330px] overflow-hidden rounded border border-border bg-background">{url ? youtube ? <iframe src={`https://www.youtube.com/embed/${youtube[1]}`} title={active?.title ?? "Video"} className="h-full w-full" allowFullScreen /> : <video src={url} controls className="h-full w-full" /> : <div className="grid h-full place-items-center text-xs text-muted-foreground">Hitamo isomo na video</div>}</div></section>;
}