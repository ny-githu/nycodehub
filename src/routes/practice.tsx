import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, CheckCircle2, Circle, FolderTree, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice Lab — byteforge" },
      { name: "description", content: "Code along with a video lesson in a live, browser-based terminal — TryHackMe style." },
      { property: "og:title", content: "Practice Lab — byteforge" },
      { property: "og:description", content: "Code along with the instructor in a live browser terminal." },
    ],
  }),
  component: Practice,
});

type Line = { prompt?: string; out?: string };

const tasks = [
  { id: 1, label: "Open the project", done: true },
  { id: 2, label: "Run the dev server", done: true },
  { id: 3, label: "Add a useState hook", done: false },
  { id: 4, label: "Pass props to <Counter />", done: false },
  { id: 5, label: "Commit your changes", done: false },
];

const files = [
  { name: "src/", children: ["App.tsx", "Counter.tsx", "main.tsx", "styles.css"] },
  { name: "package.json" },
  { name: "vite.config.ts" },
  { name: "README.md" },
];

function Practice() {
  const [history, setHistory] = useState<Line[]>([
    { out: "byteforge lab v2.4 — type 'help' to see available commands" },
    { prompt: "npm run dev" },
    { out: "VITE v5.4.0  ready in 312 ms" },
    { out: "  ➜  Local:   http://localhost:5173/" },
  ]);
  const [input, setInput] = useState("");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(34);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [history]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setProgress((p) => (p >= 100 ? (setPlaying(false), 100) : p + 0.4)), 100);
    return () => clearInterval(t);
  }, [playing]);

  function run(cmd: string) {
    if (!cmd.trim()) return;
    const c = cmd.trim();
    let out = "";
    if (c === "help") out = "available: ls, cat <file>, clear, whoami, pwd, echo <text>";
    else if (c === "ls") out = "App.tsx  Counter.tsx  main.tsx  styles.css";
    else if (c === "whoami") out = "learner";
    else if (c === "pwd") out = "/home/learner/lab/intro-to-react";
    else if (c.startsWith("echo ")) out = c.slice(5);
    else if (c.startsWith("cat ")) out = `// ${c.slice(4)}\nexport default function Counter() { return <button>0</button> }`;
    else if (c === "clear") { setHistory([]); setInput(""); return; }
    else out = `command not found: ${c.split(" ")[0]}`;
    setHistory((h) => [...h, { prompt: c }, { out }]);
    setInput("");
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-[1400px] px-4 md:px-6 py-6">
        {/* Lab header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-mono text-xs text-primary-glow">/ practice / intro-to-react</div>
            <h1 className="mt-1 text-xl md:text-2xl font-bold">Lab 03 — State and event handlers</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span className="size-2 rounded-full bg-success animate-pulse" /> environment ready
            </div>
            <button className="px-4 py-2 text-sm rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow">
              Submit lab
            </button>
          </div>
        </div>

        {/* Workspace: video left, terminal right (TryHackMe style) */}
        <div className="grid gap-4 lg:grid-cols-2 min-h-[70vh]">
          {/* LEFT — video + tasks */}
          <div className="flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video shadow-elevated">
              {/* Fake video stage */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20 grid-bg opacity-80" />
              <div className="absolute inset-0 grid place-items-center">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="grid place-items-center size-20 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:scale-105 transition"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-8" /> : <Play className="size-8 ml-1" />}
                </button>
              </div>
              <div className="absolute top-3 left-3 px-2 py-1 rounded bg-background/60 backdrop-blur text-[11px] font-mono text-foreground">
                ● LIVE LESSON
              </div>
              {/* Progress bar */}
              <div className="absolute bottom-0 inset-x-0 p-3">
                <div className="h-1 bg-background/40 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary transition-[width]" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-foreground/90">
                  <span>{Math.floor((progress / 100) * 14)}:{String(Math.floor(((progress / 100) * 14 * 60) % 60)).padStart(2, "0")}</span>
                  <span>14:00</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-gradient-card p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="font-mono text-primary-glow text-sm">tasks</span>
                <span className="text-xs text-muted-foreground">2 / 5</span>
              </h3>
              <ul className="space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 text-sm py-1.5 px-2 rounded hover:bg-surface transition">
                    {t.done ? (
                      <CheckCircle2 className="size-4 text-success shrink-0" />
                    ) : (
                      <Circle className="size-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={t.done ? "text-muted-foreground line-through" : "text-foreground"}>{t.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* RIGHT — terminal + file tree */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface text-xs font-mono text-muted-foreground">
                <FolderTree className="size-4 text-primary-glow" />
                explorer
              </div>
              <div className="p-3 text-sm font-mono max-h-44 overflow-auto">
                {files.map((f) =>
                  f.children ? (
                    <div key={f.name}>
                      <div className="flex items-center gap-1 text-foreground"><ChevronRight className="size-3" /> {f.name}</div>
                      {f.children.map((c) => (
                        <div key={c} className="ml-5 py-0.5 text-muted-foreground hover:text-foreground cursor-pointer">{c}</div>
                      ))}
                    </div>
                  ) : (
                    <div key={f.name} className="py-0.5 text-muted-foreground hover:text-foreground cursor-pointer">{f.name}</div>
                  )
                )}
              </div>
            </div>

            <div className="flex-1 rounded-xl border border-border bg-[oklch(0.10_0.04_270)] overflow-hidden flex flex-col shadow-elevated">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface">
                <span className="size-3 rounded-full bg-destructive/70" />
                <span className="size-3 rounded-full bg-chart-4/70" />
                <span className="size-3 rounded-full bg-success/70" />
                <span className="ml-3 text-xs font-mono text-muted-foreground">learner@byteforge:~/lab</span>
              </div>
              <div ref={termRef} className="flex-1 p-4 font-mono text-sm overflow-auto leading-relaxed min-h-[260px]">
                {history.map((l, i) =>
                  l.prompt !== undefined ? (
                    <div key={i}>
                      <span className="text-primary-glow">learner@byteforge</span>
                      <span className="text-muted-foreground">:~$ </span>
                      <span className="text-foreground">{l.prompt}</span>
                    </div>
                  ) : (
                    <div key={i} className="text-muted-foreground whitespace-pre-wrap">{l.out}</div>
                  )
                )}
                <form
                  onSubmit={(e) => { e.preventDefault(); run(input); }}
                  className="flex items-center gap-1.5 mt-1"
                >
                  <span className="text-primary-glow">learner@byteforge</span>
                  <span className="text-muted-foreground">:~$</span>
                  <input
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-foreground caret-primary-glow"
                    spellCheck={false}
                  />
                </form>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs font-mono text-muted-foreground">
          tip: try <span className="text-primary-glow">help</span>, <span className="text-primary-glow">ls</span>, <span className="text-primary-glow">cat App.tsx</span>
        </p>
      </div>
    </Layout>
  );
}
