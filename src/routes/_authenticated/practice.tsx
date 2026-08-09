import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useServerFn } from "@tanstack/react-start";
import { strToU8, zipSync } from "fflate";
import { Header } from "@/components/site/Header";
import { runCodeRemote } from "@/lib/code-runner.functions";
import { nycoderAgent, type NycoderAction } from "@/lib/nycoder.functions";
import type { Finding } from "@/lib/codehelper.functions";
import { LANGS, getLang, TEMPLATE_HANDOFF_KEY, type LangKey, type ProjectFile } from "@/lib/templates";
import {
  Bot, ChevronDown, ChevronUp, Download, Eye, FileCode2, FolderPlus, FolderUp, Hammer, Loader2, PanelLeftClose, PanelLeftOpen, Paperclip, Play, Rocket, Sparkles, Terminal as TerminalIcon,
  Trash2, Upload, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { langFromFile } from "@/lib/templates";
import { checkAiStatus, type AiStatus } from "@/lib/ai-health.functions";

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

type Pyodide = {
  setStdout: (o: { batched: (v: string) => void }) => void;
  setStderr: (o: { batched: (v: string) => void }) => void;
  runPythonAsync: (v: string) => Promise<unknown>;
  loadPackagesFromImports: (v: string) => Promise<unknown>;
  loadPackage: (v: string | string[]) => Promise<unknown>;
  pyimport: (v: string) => { install: (p: string) => Promise<unknown> };
};

let pyodidePromise: Promise<Pyodide> | null = null;
async function loadPyodide(): Promise<Pyodide> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Python ntiyashoboye gutangira"));
      document.head.appendChild(script);
    });
    const runtime = window as Window & { loadPyodide?: (config: { indexURL: string }) => Promise<Pyodide> };
    if (!runtime.loadPyodide) throw new Error("Python ntiyabonetse");
    const py = await runtime.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/" });
    await py.loadPackage("micropip").catch(() => {});
    return py;
  })();
  return pyodidePromise;
}

/** Loads every module a .py file imports — built-in wheels first, then PyPI via micropip. */
async function preparePython(py: Pyodide, source: string, log: (line: string) => void) {
  await py.loadPackagesFromImports(source).catch(() => {});
  const imports = new Set<string>();
  source.split("\n").forEach((line) => {
    const direct = /^\s*import\s+([A-Za-z_][\w.]*)/.exec(line);
    const from = /^\s*from\s+([A-Za-z_][\w.]*)\s+import/.exec(line);
    const name = (direct?.[1] ?? from?.[1] ?? "").split(".")[0];
    if (name) imports.add(name);
  });
  for (const name of imports) {
    try {
      await py.runPythonAsync(`import ${name}`);
    } catch {
      try {
        log(`micropip: ${name} irakururwa…`);
        const micropip = py.pyimport("micropip");
        await micropip.install(name);
      } catch {
        log(`⚠ module "${name}" ntiboneka kuri Python ya browser.`);
      }
    }
  }
}

const WORKSPACE_KEY = "nycodehub:workspace";
const TEXT_EXT = /\.(html?|css|js|mjs|cjs|jsx|ts|tsx|json|md|txt|py|java|c|h|cpp|cc|hpp|cs|go|rs|php|rb|kt|swift|sh|sql|lua|dart|r|pl|scala|yml|yaml|env|toml|xml|svg|gitignore)$/i;
const DOC_EXT = /\.(txt|md|json|csv|log|yml|yaml|xml|html?)$/i;
const WEB_EXT = /\.(html?|css|js|mjs|jsx)$/i;

const RUN_SH = `#!/bin/bash\nset -e\nif [ -f package.json ]; then npm install && npm start; exit 0; fi\nif [ -f main.py ]; then python3 main.py; exit 0; fi\nif [ -f index.html ]; then python3 -m http.server 8080; exit 0; fi\necho "Ongeraho amabwiriza yo gukora umushinga hano."\n`;
const RUN_BAT = `@echo off\nif exist package.json ( npm install && npm start & goto :eof )\nif exist main.py ( python main.py & goto :eof )\nif exist index.html ( python -m http.server 8080 & goto :eof )\necho Ongeraho amabwiriza yo gukora umushinga hano.\n`;

type Msg = { role: "user" | "assistant" | "system"; content: string; kind?: "error" | "ok" | "term" };
type AgentMode = "chat" | "build" | "debug" | "fix";
type Panel = "preview" | "output";
type BottomTab = "nycoder" | "terminal";
type Doc = { name: string; text: string };
type Snapshot = { files: ProjectFile[]; activeName: string; output?: string; messages?: Msg[] };

function Practice() {
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<ProjectFile[]>([{ name: "index.html", content: LANGS[0].sample }]);
  const [activeName, setActiveName] = useState("index.html");
  const [output, setOutput] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [running, setRunning] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [saved, setSaved] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [nycoderOpen, setNycoderOpen] = useState(true);
  const [bottomTab, setBottomTab] = useState<BottomTab>("nycoder");
  const [panelOverride, setPanelOverride] = useState<Panel | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState<NycoderAction[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Muraho! Ndi NYCODER. Muri 'Ganira' turaganira ku gitekerezo cyawe mbere yo kwandika dosiye — iyo witeguye, hitamo 'Ubaka'." },
  ]);
  const [termLines, setTermLines] = useState<Msg[]>([
    { role: "assistant", content: "NYCODEHUB terminal — andika 'help' urebe amabwiriza.", kind: "term" },
  ]);
  const [termInput, setTermInput] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<AgentMode>("chat");
  const [scan, setScan] = useState<"idle" | "scanning" | "clean" | "bad">("idle");

  const debounceRef = useRef<number | null>(null);
  const checkRef = useRef<number | null>(null);
  const filesRef = useRef(files);
  const langRef = useRef<LangKey>("html");
  const activeRef = useRef(activeName);
  const outputRef = useRef(output);
  const messagesRef = useRef(messages);
  const logRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const runRemote = useServerFn(runCodeRemote);
  const agent = useServerFn(nycoderAgent);
  const aiCheck = useServerFn(checkAiStatus);

  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const code = activeFile?.content ?? "";
  // The language follows the file the user is in — no manual picker needed.
  const langKey: LangKey = useMemo(() => langFromFile(activeName) ?? "html", [activeName]);
  const lang = useMemo(() => getLang(langKey), [langKey]);
  filesRef.current = files;
  langRef.current = langKey;
  activeRef.current = activeName;
  outputRef.current = output;
  messagesRef.current = messages;

  const naturalPanel: Panel = useMemo(() => {
    const name = activeFile?.name ?? "";
    if (WEB_EXT.test(name)) return "preview";
    if (name) return "output";
    return lang.mode === "web" ? "preview" : "output";
  }, [activeFile, lang.mode]);
  const panel: Panel = panelOverride ?? naturalPanel;

  useEffect(() => { setPanelOverride(null); }, [activeName, langKey]);

  useEffect(() => {
    setMounted(true);
    void aiCheck().then(setAiStatus).catch(() => setAiStatus({ ok: false, label: "Status itamenyekana", detail: "Ntibyashobotse kugenzura urufunguzo." }));
    const handoff = sessionStorage.getItem(TEMPLATE_HANDOFF_KEY);
    if (handoff) {
      sessionStorage.removeItem(TEMPLATE_HANDOFF_KEY);
      try {
        const parsed = JSON.parse(handoff) as { lang: LangKey; files: ProjectFile[] };
        if (parsed?.files?.length) {
          setFiles(parsed.files);
          setActiveName(parsed.files[0].name);
          toast.success("Template yafunguwe muri CODEROOM");
          return;
        }
      } catch { /* ignore malformed handoff */ }
    }
    try {
      const stored = localStorage.getItem(WORKSPACE_KEY);
      const snapshot = stored ? JSON.parse(stored) as Snapshot : null;
      if (snapshot?.files?.length) {
        setFiles(snapshot.files);
        setActiveName(snapshot.files.some((f) => f.name === snapshot.activeName) ? snapshot.activeName : snapshot.files[0].name);
        if (snapshot.output) setOutput(snapshot.output);
        if (snapshot.messages?.length) setMessages(snapshot.messages);
      }
    } catch { /* ignore corrupted snapshot */ }
  }, [aiCheck]);

  // Autosave, plus an immediate flush when the tab closes or the user navigates away.
  const persist = useCallback(() => {
    const snapshot: Snapshot = {
      files: filesRef.current,
      activeName: activeRef.current,
      output: outputRef.current.slice(0, 20_000),
      messages: messagesRef.current.slice(-40),
    };
    try { localStorage.setItem(WORKSPACE_KEY, JSON.stringify(snapshot)); setSaved(true); } catch { /* quota */ }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setSaved(false);
    const id = window.setTimeout(persist, 500);
    return () => window.clearTimeout(id);
  }, [files, activeName, messages, mounted, persist]);

  useEffect(() => {
    if (!mounted) return;
    const flush = () => persist();
    const onHidden = () => { if (document.visibilityState === "hidden") persist(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      persist();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [mounted, persist]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [messages, busy]);
  useEffect(() => { termRef.current?.scrollTo({ top: termRef.current.scrollHeight }); }, [termLines]);

  function updateCode(value: string) {
    setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: value } : file));
  }
  function createFile() {
    const proposed = window.prompt("Andika izina rya dosiye (ushobora gukoresha folder): src/app.js");
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

  const importFiles = useCallback(async (list: FileList | File[] | null, folder = false) => {
    if (!list || !("length" in list) || !list.length) return;
    const imported: ProjectFile[] = [];
    let skipped = 0;
    for (const file of Array.from(list as ArrayLike<File>)) {
      const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      const name = (folder && relative ? relative : file.name).replace(/^\/+/, "");
      if (!TEXT_EXT.test(name) || file.size > 400_000 || /(^|\/)(node_modules|\.git|dist|build)\//.test(name)) { skipped++; continue; }
      imported.push({ name, content: await file.text() });
    }
    if (!imported.length) return toast.error("Nta dosiye za code zabonetse");
    setFiles((current) => {
      const map = new Map(current.map((f) => [f.name, f]));
      imported.forEach((f) => map.set(f.name, f));
      return Array.from(map.values());
    });
    setActiveName(imported[0].name);
    toast.success(`Dosiye ${imported.length} zinjijwe${skipped ? ` (${skipped} zasimbutswe)` : ""}`);
  }, []);

  function zipDownload(entries: Record<string, Uint8Array>, name: string) {
    const archive = zipSync(entries);
    const url = URL.createObjectURL(new Blob([archive as BlobPart], { type: "application/zip" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
  }

  function downloadProject() {
    const entries: Record<string, Uint8Array> = {};
    files.forEach((file) => { entries[file.name] = strToU8(file.content); });
    if (!files.some((f) => f.name === "run.sh")) entries["run.sh"] = strToU8(RUN_SH);
    if (!files.some((f) => f.name === "run.bat")) entries["run.bat"] = strToU8(RUN_BAT);
    zipDownload(entries, `nycodehub-${langKey}-project.zip`);
    toast.success(t.practice_project_saved);
  }

  function exportDeployment() {
    const entries: Record<string, Uint8Array> = {};
    files.forEach((file) => { entries[file.name] = strToU8(file.content); });
    if (!files.some((f) => f.name === "index.html")) {
      entries["index.html"] = strToU8(previewHtml || buildWebPreview());
    }
    entries["netlify.toml"] = strToU8(`[build]\n  publish = "."\n\n[[redirects]]\n  from = "/*"\n  to = "/index.html"\n  status = 200\n`);
    entries["vercel.json"] = strToU8(JSON.stringify({ cleanUrls: true, rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2));
    entries["Dockerfile"] = strToU8(`FROM nginx:alpine\nCOPY . /usr/share/nginx/html\nEXPOSE 80\n`);
    entries["DEPLOY.md"] = strToU8(
      `# Gushyira umushinga kuri internet (NYCODEHUB)\n\n1. **Netlify**: kanda "Add new site" > "Deploy manually", ushyiremo iyi folder.\n2. **Vercel**: koresha \`vercel deploy\` muri iyi folder.\n3. **Docker**: \`docker build -t umushinga . && docker run -p 8080:80 umushinga\`\n4. **GitHub Pages**: shyira dosiye kuri branch \`gh-pages\`.\n`,
    );
    zipDownload(entries, `nycodehub-${langKey}-deploy.zip`);
    toast.success("Deployment package yakuwemo");
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
        const py = await loadPyodide();
        const buffer: string[] = [];
        py.setStdout({ batched: (v) => buffer.push(v) }); py.setStderr({ batched: (v) => buffer.push(v) });
        const source = filesRef.current.find((f) => f.name === activeName)?.content ?? code;
        await preparePython(py, source, (line) => setOutput((prev) => `${prev}\n${line}`.trim()));
        try { await py.runPythonAsync(source); setOutput(buffer.join("\n") || t.practice_no_output); }
        catch (error) {
          setOutput(`${buffer.join("\n")}\n${error instanceof Error ? error.message : String(error)}`.trim());
        }

      } else {
        setOutput(t.practice_running_server);
        const entry = filesRef.current.find((f) => f.name === activeName) ?? filesRef.current[0];
        const result = await runRemote({
          data: { language: current.key, source: entry?.content ?? code, entry: entry?.name, files: filesRef.current },
        });
        setOutput([result.stdout, result.stderr].filter(Boolean).join("\n") || `(${result.status})`);
      }
    } catch (error) {
      setOutput(error instanceof Error ? error.message : "Byanze gukora");
    } finally { setRunning(false); }
  }, [activeName, code, runRemote]);




  useEffect(() => {
    if (lang.mode !== "web") return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void run(); }, 450);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [files, langKey, lang.mode, run]);

  const applyMarkers = useCallback((list: Finding[]) => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.getModels().forEach((model: MonacoEditor.ITextModel) => {
      const name = model.uri.path.replace(/^\//, "");
      const own = list.filter((f) => !f.file || f.file === name || f.file.endsWith(name) || name.endsWith(f.file));
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

  const flyToFinding = useCallback((list: Finding[]) => {
    setScan("scanning");
    window.setTimeout(() => {
      const first = list.find((f) => f.severity === "error") ?? list[0];
      if (first) {
        const target = filesRef.current.find((f) => f.name === first.file || f.name.endsWith(first.file));
        if (target && target.name !== activeName) setActiveName(target.name);
        window.setTimeout(() => {
          editorRef.current?.revealLineInCenter(first.line);
          editorRef.current?.setPosition({ lineNumber: first.line, column: 1 });
        }, 120);
        setScan("bad");
      } else {
        setScan("clean");
      }
      window.setTimeout(() => setScan("idle"), 1600);
    }, 900);
  }, [activeName]);

  const applyActions = useCallback((actions: NycoderAction[]) => {
    if (!actions.length) return 0;
    let first = "";
    setFiles((current) => {
      const map = new Map(current.map((f) => [f.name, f]));
      actions.forEach((action) => {
        const path = action.path.trim().replace(/^\/+/, "");
        if (!path) return;
        if (action.op === "delete") { map.delete(path); return; }
        map.set(path, { name: path, content: action.content });
        if (!first) first = path;
      });
      const next = Array.from(map.values());
      return next.length ? next : current;
    });
    if (first) setActiveName(first);
    return actions.length;
  }, []);

  const send = useCallback(async (text: string, requested: AgentMode) => {
    if (busy) return;
    setNycoderOpen(true);
    setBottomTab("nycoder");
    setBusy(true);
    setMessages((current) => [...current, { role: "user", content: text }]);
    try {
      const history = messages
        .filter((m) => m.role !== "system")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const result = await agent({
        data: { language: langRef.current, mode: requested, files: filesRef.current, history, message: text },
      });

      if (result.blocked) {
        setScan("bad");
        window.setTimeout(() => setScan("idle"), 1800);
        setMessages((current) => [...current, {
          role: "assistant",
          content: result.reply || "✗ Ubu butumwa ntibwemewe. NYCODER ntabwo ifasha mu bikorwa bibi cyangwa binyuranyije n'amategeko.",
          kind: "error",
        }]);
        return;
      }

      let changed = 0;
      if (requested === "chat" && result.actions.length) {
        setPending(result.actions);
      } else {
        changed = applyActions(result.actions);
      }

      setFindings(result.findings);
      applyMarkers(result.findings);
      flyToFinding(result.findings);

      const extra: Msg[] = [];
      if (changed) extra.push({ role: "assistant", content: `✎ Nahinduye dosiye ${changed} muri workspace.`, kind: "ok" });
      result.findings.forEach((f) => extra.push({
        role: "assistant",
        content: `${f.severity === "error" ? "✗" : "!"} ${f.file || activeName}:${f.line} — ${f.message}${f.fix ? `\n   → ${f.fix}` : ""}`,
        kind: f.severity === "error" ? "error" : undefined,
      }));
      if (!result.findings.length && requested !== "chat") extra.push({ role: "assistant", content: "✓ Nta kosa nabonye muri code yawe.", kind: "ok" });
      setMessages((current) => [...current, { role: "assistant", content: result.reply || "(nta gisubizo)" }, ...extra]);
      if (changed) toast.success(`NYCODER yahinduye dosiye ${changed}`);
    } catch (error) {
      setMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Byanze", kind: "error" }]);
      setScan("idle");
    } finally { setBusy(false); }
  }, [agent, applyActions, applyMarkers, busy, flyToFinding, messages, activeName]);

  useEffect(() => {
    if (!autoCheck || !mounted) return;
    if (checkRef.current) window.clearTimeout(checkRef.current);
    checkRef.current = window.setTimeout(async () => {
      try {
        const result = await agent({
          data: { language: langRef.current, mode: "debug", files: filesRef.current, history: [], message: "Suzuma code, garuka gusa na findings." },
        });
        setFindings(result.findings);
        applyMarkers(result.findings);
        setScan(result.findings.some((f) => f.severity === "error") ? "bad" : "clean");
        window.setTimeout(() => setScan("idle"), 1400);
      } catch { /* silent auto-check */ }
    }, 4000);
    return () => { if (checkRef.current) window.clearTimeout(checkRef.current); };
  }, [files, autoCheck, mounted, agent, applyMarkers]);

  function submitPrompt() {
    const question = prompt.trim();
    if (!question || busy) return;
    setPrompt("");
    void send(question, mode);
  }

  const pushTerm = useCallback((content: string, kind?: Msg["kind"]) => {
    setTermLines((current) => [...current, { role: "assistant", content, kind: kind ?? "term" }]);
  }, []);

  const runCommand = useCallback((raw: string) => {
    const line = raw.trim();
    if (!line) return;
    setTermLines((current) => [...current, { role: "user", content: line }]);
    const [command, ...args] = line.split(/\s+/);
    const rest = args.join(" ");
    switch (command) {
      case "help":
        pushTerm([
          "amabwiriza:",
          "  ls                  — erekana dosiye zose",
          "  cat <dosiye>        — soma dosiye",
          "  open <dosiye>       — fungura muri editor",
          "  new <dosiye>        — kora dosiye nshya",
          "  rm <dosiye>         — siba dosiye",
          "  run                 — koresha umushinga",
          
          "  download            — kuramo umushinga (zip)",
          "  deploy              — kuramo deployment package",
          "  ny <ubutumwa>       — baza NYCODER",
          "  clear               — hanagura terminal",
        ].join("\n"));
        break;
      case "ls":
        pushTerm(filesRef.current.map((f) => f.name).sort().join("\n") || "(nta dosiye)");
        break;
      case "cat": {
        const file = filesRef.current.find((f) => f.name === rest);
        pushTerm(file ? file.content.slice(0, 4000) : `cat: ${rest}: nta dosiye`, file ? "term" : "error");
        break;
      }
      case "open": {
        const file = filesRef.current.find((f) => f.name === rest);
        if (file) { setActiveName(file.name); pushTerm(`✓ ${file.name} yafunguwe`, "ok"); }
        else pushTerm(`open: ${rest}: nta dosiye`, "error");
        break;
      }
      case "new": {
        const name = rest.replace(/^\/+/, "");
        if (!name) { pushTerm("new: andika izina rya dosiye", "error"); break; }
        if (filesRef.current.some((f) => f.name === name)) { pushTerm("new: iyo dosiye isanzwe ihari", "error"); break; }
        setFiles((current) => [...current, { name, content: "" }]);
        setActiveName(name);
        pushTerm(`✓ ${name} yakozwe`, "ok");
        break;
      }
      case "rm": {
        if (!filesRef.current.some((f) => f.name === rest)) { pushTerm(`rm: ${rest}: nta dosiye`, "error"); break; }
        deleteFile(rest);
        pushTerm(`✓ ${rest} yasibwe`, "ok");
        break;
      }
      case "run": void run(); pushTerm("▶ gukora..."); break;
      case "download": downloadProject(); pushTerm("✓ zip yakuwemo", "ok"); break;
      case "deploy": exportDeployment(); pushTerm("✓ deployment package yakuwemo", "ok"); break;
      case "ny":
        if (!rest) { pushTerm("ny: andika ubutumwa", "error"); break; }
        void send(rest, mode);
        pushTerm("→ NYCODER…");
        break;
      case "clear": setTermLines([]); break;
      default: pushTerm(`${command}: iri bwiriza ntiryumvikana. Andika 'help'.`, "error");
    }
  }, [pushTerm, run, send, mode]);


  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warnCount = findings.filter((f) => f.severity === "warning").length;

  const MODES: { key: AgentMode; label: string; icon: typeof Bot }[] = [
    { key: "chat", label: "Ganira", icon: Bot },
    { key: "build", label: "Ubaka", icon: Hammer },
    { key: "fix", label: "Kosora", icon: Wrench },
  ];

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setFilesOpen((open) => !open)} title={t.practice_files} className="rounded p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground">
              {filesOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </button>
            <h1 className="font-mono text-sm font-bold">{t.practice_h1}</h1>
            <span className={`hidden rounded px-2 py-0.5 text-[10px] sm:inline ${saved ? "text-success" : "text-muted-foreground"}`}>
              {saved ? "✓ Byabitswe" : "Kubika..."}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto py-1">
            <span className="hidden rounded border border-border px-2 py-1 text-[11px] font-mono text-muted-foreground sm:inline">{lang.label}</span>
            <span
              title={aiStatus?.detail ?? ""}
              className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-mono ${
                aiStatus == null ? "border-border text-muted-foreground" : aiStatus.ok ? "border-success/50 text-success" : "border-destructive/50 text-destructive"
              }`}
            >
              <span className={`size-1.5 rounded-full ${aiStatus == null ? "bg-muted-foreground animate-pulse" : aiStatus.ok ? "bg-success" : "bg-destructive"}`} />
              NYCODER
            </span>
            <label className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><input type="checkbox" checked={autoCheck} onChange={(e) => setAutoCheck(e.target.checked)} />Auto</label>
            <label className="hidden cursor-pointer items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground sm:inline-flex">
              <Upload className="size-3.5" />Dosiye
              <input type="file" multiple className="hidden" onChange={(e) => { void importFiles(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <FolderUp className="size-3.5" />Folder yose
              <input
                type="file"
                className="hidden"
                multiple
                /* @ts-expect-error webkitdirectory ni attribute ya browser */
                webkitdirectory=""
                directory=""
                onChange={(e) => { void importFiles(e.target.files, true); e.target.value = ""; }}
              />
            </label>

            <button onClick={() => void run()} disabled={running} className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60">
              {running ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}{t.practice_run}
            </button>
            <button onClick={exportDeployment} className="inline-flex items-center gap-1.5 rounded border border-primary/50 px-2 py-1.5 text-xs text-primary-glow hover:bg-primary/10"><Rocket className="size-3.5" />Deploy</button>
            <button onClick={downloadProject} className="inline-flex items-center gap-1.5 rounded bg-gradient-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-glow"><Download className="size-4" />{t.practice_download}</button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 max-md:flex-col">
          {filesOpen && (
            <aside className="w-48 shrink-0 overflow-y-auto border-r border-border bg-background/60 animate-fade-in max-md:hidden">
              <div className="flex h-9 items-center justify-between border-b border-border px-2">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">{t.practice_files}</span>
                <button onClick={createFile} title={t.practice_new_file} className="rounded p-1 text-muted-foreground hover:bg-surface hover:text-foreground"><FolderPlus className="size-4" /></button>
              </div>
              <div className="p-1">
                {[...files].sort((a, b) => a.name.localeCompare(b.name)).map((file) => {
                  const bad = findings.some((f) => f.severity === "error" && (f.file === file.name || file.name.endsWith(f.file)));
                  const depth = file.name.split("/").length - 1;
                  return (
                    <div key={file.name} style={{ paddingLeft: 8 + depth * 10 }} className={`group flex items-center gap-1 rounded py-1.5 pr-2 text-xs font-mono ${activeName === file.name ? "bg-primary/15 text-primary-glow" : "text-muted-foreground hover:bg-surface"}`}>
                      <button onClick={() => setActiveName(file.name)} className="flex min-w-0 flex-1 items-center gap-1.5">
                        <FileCode2 className={`size-3.5 shrink-0 ${bad ? "text-destructive" : ""}`} />
                        <span className={`truncate ${bad ? "text-destructive" : ""}`}>{file.name.split("/").pop()}</span>
                      </button>
                      <button onClick={() => deleteFile(file.name)} title={t.delete} className="opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="size-3" /></button>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          <section
            className="relative flex min-w-0 flex-[3] flex-col border-r border-border max-md:min-h-0 max-md:basis-1/2 max-md:border-b max-md:border-r-0"
            onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              void importFiles(event.dataTransfer.files);
            }}
          >
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3 text-xs text-muted-foreground">
              <span className="font-mono">{activeFile?.name}</span>
              <span className="flex items-center gap-3">
                {errorCount > 0 && <span className="text-destructive">● {errorCount} amakosa</span>}
                {warnCount > 0 && <span className="text-chart-4">● {warnCount} imiburo</span>}
                {!errorCount && !warnCount && <span className="text-success">● OK</span>}
              </span>
            </div>
            <div className="relative min-h-0 flex-1 bg-surface-elevated">
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
              {dragOver && (
                <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center border-2 border-dashed border-primary bg-primary/10 text-sm text-primary-glow">
                  Rekura dosiye hano ngo zinjire mu mushinga
                </div>
              )}
              {scan === "scanning" && <div className="nycoder-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-16" />}
              {scan === "clean" && <div className="nycoder-flash-ok pointer-events-none absolute inset-0 z-10" />}
              {scan === "bad" && <div className="nycoder-flash-bad pointer-events-none absolute inset-0 z-10" />}
            </div>
          </section>

          <section className="flex min-w-0 flex-[2] flex-col max-md:min-h-0 max-md:basis-1/2">
            <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2 text-xs">
              <button
                onClick={() => setPanelOverride("preview")}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 ${panel === "preview" ? "bg-primary/20 text-primary-glow" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Eye className="size-3.5" />{t.practice_preview}
              </button>
              <button
                onClick={() => setPanelOverride("output")}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 ${panel === "output" ? "bg-primary/20 text-primary-glow" : "text-muted-foreground hover:text-foreground"}`}
              >
                <TerminalIcon className="size-3.5" />{t.practice_output}
              </button>
            </div>
            {panel === "preview" ? (
              <iframe title={t.practice_preview} sandbox="allow-scripts allow-modals" srcDoc={previewHtml || "<html><body style='font-family:system-ui;padding:16px;color:#777'>Igaragaza rizaza hano</body></html>"} className="min-h-0 flex-1 w-full bg-white" />
            ) : (
              <pre className="min-h-0 flex-1 overflow-auto bg-background/80 p-3 text-xs font-mono whitespace-pre-wrap">{output || t.practice_no_output}</pre>
            )}
          </section>
        </div>

        <section className={`shrink-0 border-t border-primary/40 bg-surface font-mono transition-all ${nycoderOpen ? "h-72 max-md:h-56" : "h-9"}`}>
          <div className="flex h-9 items-center justify-between gap-2 border-b border-border px-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`text-primary-glow ${busy ? "animate-pulse" : ""}`}>▊</span>
              <button onClick={() => { setBottomTab("nycoder"); setNycoderOpen(true); }} className={`rounded px-2 py-1 font-bold tracking-wider ${bottomTab === "nycoder" ? "bg-primary/20 text-primary-glow" : "text-muted-foreground"}`}>NYCODER</button>
              <button onClick={() => { setBottomTab("terminal"); setNycoderOpen(true); }} className={`inline-flex items-center gap-1 rounded px-2 py-1 ${bottomTab === "terminal" ? "bg-primary/20 text-primary-glow" : "text-muted-foreground"}`}><TerminalIcon className="size-3" />Terminal</button>
            </div>
             <div className="flex items-center gap-1.5 overflow-x-auto">
              {busy && <Loader2 className="size-3.5 animate-spin text-primary-glow" />}
              {bottomTab === "nycoder" && MODES.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMode(item.key)}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${mode === item.key ? "bg-primary/25 text-primary-glow" : "text-muted-foreground hover:bg-surface"}`}
                >
                  <item.icon className="size-3" />{item.label}
                </button>
              ))}
              {bottomTab === "nycoder" && (
                <button onClick={() => void send("Suzuma umushinga wose, unyereke amakosa n'ahantu ari.", "debug")} className="inline-flex items-center gap-1 rounded bg-primary/20 px-2 py-1 text-[11px] text-primary-glow hover:bg-primary/30"><Sparkles className="size-3" />Suzuma</button>
              )}
              <button onClick={() => setNycoderOpen((open) => !open)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                {nycoderOpen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
              </button>
            </div>
          </div>

          {nycoderOpen && bottomTab === "nycoder" && (
            <div className="flex h-[calc(100%-2.25rem)] flex-col">
              <div ref={logRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-2 text-xs leading-relaxed">
                {messages.map((line, index) => (
                  <div key={index} className={`flex gap-2 animate-fade-in ${line.kind === "error" ? "text-destructive" : line.kind === "ok" ? "text-success" : line.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="shrink-0 whitespace-pre opacity-70">{line.role === "user" ? "you $" : "ny   >"}</span>
                    <span className="whitespace-pre-wrap">{line.content}</span>
                  </div>
                ))}
                {pending.length > 0 && (
                  <div className="flex items-center gap-2 rounded border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] text-primary-glow">
                    <span>NYCODER yateguye dosiye {pending.length}. Wemeza ko zishyirwa muri workspace?</span>
                    <button
                      onClick={() => { const n = applyActions(pending); setPending([]); toast.success(`Dosiye ${n} zashyizwemo`); }}
                      className="rounded bg-primary px-2 py-0.5 text-primary-foreground"
                    >Emeza</button>
                    <button onClick={() => setPending([])} className="rounded border border-border px-2 py-0.5 text-muted-foreground">Reka</button>
                  </div>
                )}
                {busy && <div className="text-muted-foreground">{t.practice_thinking}</div>}
              </div>
              {docs.length > 0 && (
                <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-border px-3 py-1.5 text-[10px]">
                  {docs.map((doc) => (
                    <span key={doc.name} className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-primary-glow">
                      {doc.name}
                      <button onClick={() => setDocs((current) => current.filter((d) => d.name !== doc.name))} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                </div>
              )}
              <form onSubmit={(event) => { event.preventDefault(); submitPrompt(); }} className="flex shrink-0 items-end gap-2 border-t border-border px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <span className="pb-1 text-success">nycoder$</span>
                <label title="Ongeraho inyandiko (NYCODER izayibika mu bwenge)" className="cursor-pointer pb-1 text-muted-foreground hover:text-primary-glow">
                  <Paperclip className="size-4" />
                  <input type="file" multiple accept=".txt,.md,.json,.csv,.log,.yml,.yaml,.xml,.html" className="hidden" onChange={(e) => { void attachDocs(e.target.files); e.target.value = ""; }} />
                </label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitPrompt(); }
                  }}
                  rows={3}
                  placeholder={mode === "build" ? "Andika igitekerezo cy'umushinga (Enter = ohereza, Shift+Enter = umurongo mushya)…" : t.practice_helper_placeholder}
                  className="min-h-[3.5rem] max-h-40 min-w-0 flex-1 resize-y bg-transparent text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
                />
                <button type="submit" disabled={busy} className="rounded bg-primary/25 px-2 py-1 text-[11px] text-primary-glow disabled:opacity-50">Ohereza</button>
              </form>

            </div>
          )}

          {nycoderOpen && bottomTab === "terminal" && (
            <div className="flex h-[calc(100%-2.25rem)] flex-col">
              <div ref={termRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 py-2 text-xs leading-relaxed">
                {termLines.map((line, index) => (
                  <div key={index} className={`flex gap-2 ${line.kind === "error" ? "text-destructive" : line.kind === "ok" ? "text-success" : line.role === "user" ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="shrink-0 opacity-70">{line.role === "user" ? "$" : " "}</span>
                    <span className="whitespace-pre-wrap">{line.content}</span>
                  </div>
                ))}
              </div>
              <form
                onSubmit={(event) => { event.preventDefault(); runCommand(termInput); setTermInput(""); }}
                className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
                <span className="text-primary-glow">nycodehub:~$</span>
                <input
                  value={termInput}
                  onChange={(event) => setTermInput(event.target.value)}
                  placeholder="andika 'help'"
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

async function runJsTest(file: ProjectFile, all: ProjectFile[]): Promise<string> {
  const helpers = all
    .filter((f) => (f.name.endsWith(".js") || f.name.endsWith(".mjs")) && f.name !== file.name)
    .map((f) => f.content)
    .join("\n");
  const harness = `
let __pass = 0, __fail = 0; const __log = [];
function assert(cond, msg){ if(cond){__pass++; __log.push("  ✓ " + (msg||"assert"));} else {__fail++; __log.push("  ✗ " + (msg||"assert"));} }
function assertEqual(a,b,msg){ assert(JSON.stringify(a)===JSON.stringify(b), (msg||"") + " (" + JSON.stringify(a) + " === " + JSON.stringify(b) + ")"); }
function test(name, fn){ try { fn(); __pass++; __log.push("  ✓ " + name); } catch(e){ __fail++; __log.push("  ✗ " + name + " — " + e.message); } }
`;
  try {
    // eslint-disable-next-line no-new-func
    const runner = new Function(`${harness}\n${helpers}\n${file.content}\nreturn {p:__pass,f:__fail,l:__log};`);
    const result = runner() as { p: number; f: number; l: string[] };
    return `${result.f ? "✗ FAIL" : "✓ PASS"} ${file.name}\n${result.l.join("\n")}`;
  } catch (error) {
    return `✗ FAIL ${file.name}\n  ${error instanceof Error ? error.message : String(error)}`;
  }
}
