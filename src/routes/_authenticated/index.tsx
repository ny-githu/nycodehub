import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Code2, Terminal, Cpu, GitBranch, Database, Sparkles, ArrowRight, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "NYCODEHUB — Learn coding by doing, in your browser" },
      { name: "description", content: "Hands-on courses and a TryHackMe-style practice lab for coding, software engineering, DevOps, and more." },
      { property: "og:title", content: "NYCODEHUB — Learn coding by doing" },
      { property: "og:description", content: "Hands-on courses and a TryHackMe-style practice lab for software engineering." },
    ],
  }),
  component: Home,
});

const tracks = [
  { icon: Code2, title: "Frontend Engineering", desc: "React, TypeScript, design systems, accessibility.", count: "24 courses" },
  { icon: Database, title: "Backend & APIs", desc: "Node, Postgres, REST, queues, observability.", count: "18 courses" },
  { icon: GitBranch, title: "DevOps & Cloud", desc: "Docker, Kubernetes, CI/CD, AWS fundamentals.", count: "12 courses" },
  { icon: Cpu, title: "Systems & Algorithms", desc: "Data structures, performance, low-level thinking.", count: "16 courses" },
  { icon: Terminal, title: "Linux & Shell", desc: "Bash, scripting, networking, daily workflows.", count: "9 courses" },
  { icon: Sparkles, title: "AI Engineering", desc: "LLMs, embeddings, RAG, agents in production.", count: "11 courses" },
];

function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background pointer-events-none" />
        <div className="relative container mx-auto max-w-7xl px-6 pt-24 pb-32">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success animate-pulse" /> v2.4 · new AI engineering track
            </span>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tight">
              Learn to code by <span className="text-gradient">breaking things</span>, not watching videos.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
              NYCODEHUB is a hands-on platform for coding and software engineering.
              Real terminals. Real codebases. Real bugs to hunt — all in your browser.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/practice" className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow hover:brightness-110 transition">
                <Play className="size-4" /> Launch the lab
              </Link>
              <Link to="/courses" className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-border text-foreground hover:bg-surface transition">
                Browse courses <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              {[
                ["120+", "interactive labs"],
                ["48k", "active learners"],
                ["4.9★", "avg rating"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-mono text-2xl text-foreground">{n}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating terminal preview */}
          <div className="mt-20 mx-auto max-w-4xl rounded-xl border border-border bg-surface-elevated shadow-elevated overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface">
              <span className="size-3 rounded-full bg-destructive/70" />
              <span className="size-3 rounded-full bg-chart-4/70" />
              <span className="size-3 rounded-full bg-success/70" />
              <span className="ml-3 text-xs font-mono text-muted-foreground">~/lab/intro-to-react</span>
            </div>
            <pre className="p-6 text-sm font-mono leading-relaxed overflow-x-auto">
<span className="text-muted-foreground">$</span> <span className="text-foreground">npm run dev</span>
{"\n"}<span className="text-success">✓</span> ready in <span className="text-primary-glow">312ms</span>
{"\n"}<span className="text-muted-foreground">→ local:</span>   http://localhost:5173
{"\n"}<span className="text-muted-foreground">→ press</span> <span className="text-foreground">h</span> <span className="text-muted-foreground">to show help</span>
{"\n\n"}<span className="text-muted-foreground">$</span> <span className="text-foreground caret">cat src/App.tsx</span>
            </pre>
          </div>
        </div>
      </section>

      {/* Tracks grid */}
      <section className="container mx-auto max-w-7xl px-6 py-24">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">Pick your track</h2>
            <p className="mt-2 text-muted-foreground">Curated paths from beginner to senior engineer.</p>
          </div>
          <Link to="/courses" className="text-sm text-primary-glow hover:underline inline-flex items-center gap-1">
            All courses <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tracks.map(({ icon: Icon, title, desc, count }) => (
            <div key={title} className="group bg-gradient-card border border-border rounded-xl p-6 hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <span className="grid place-items-center size-11 rounded-lg bg-surface border border-border group-hover:bg-gradient-primary group-hover:border-transparent transition">
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-mono text-muted-foreground">{count}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-10 md:p-14">
          <div className="absolute inset-0 grid-bg opacity-20" />
          <div className="relative grid md:grid-cols-[1fr_auto] gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold">Stop reading docs. Start shipping.</h3>
              <p className="mt-3 text-muted-foreground max-w-xl">
                Every NYCODEHUB course pairs short videos with a live environment. Code, run, break, fix — repeat.
              </p>
            </div>
            <Link to="/practice" className="justify-self-start md:justify-self-end inline-flex items-center gap-2 px-5 py-3 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow">
              <Play className="size-4" /> Try a free lab
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
