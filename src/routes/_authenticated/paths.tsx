import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/paths")({
  head: () => ({
    meta: [
      { title: "Learning paths — byteforge" },
      { name: "description", content: "Structured tracks that take you from beginner to job-ready engineer." },
      { property: "og:title", content: "Learning paths — byteforge" },
      { property: "og:description", content: "Structured tracks from beginner to job-ready." },
    ],
  }),
  component: Paths,
});

const paths = [
  {
    title: "Frontend Engineer",
    weeks: 14,
    color: "from-primary to-primary-glow",
    blurb: "HTML, CSS, JavaScript, TypeScript, React, design systems, testing, performance.",
    steps: ["Web fundamentals", "Modern JavaScript & TS", "React in depth", "State & data fetching", "Production-grade UIs"],
  },
  {
    title: "Backend Engineer",
    weeks: 16,
    color: "from-primary-glow to-accent",
    blurb: "Node, REST & GraphQL, databases, queues, caching, observability and scaling.",
    steps: ["Node & TypeScript", "Designing APIs", "Postgres & SQL", "Background jobs", "Production observability"],
  },
  {
    title: "Full-stack Engineer",
    weeks: 20,
    color: "from-accent to-primary",
    blurb: "Ship complete products. Frontend + backend + deployment + monitoring.",
    steps: ["Foundations", "Frontend track", "Backend track", "DevOps essentials", "Capstone product"],
  },
  {
    title: "AI Engineer",
    weeks: 10,
    color: "from-primary to-accent",
    blurb: "Build production AI apps: prompts, embeddings, RAG, evals, agents.",
    steps: ["LLM fundamentals", "Embeddings & RAG", "Tooling & agents", "Evals & guardrails", "Ship an AI product"],
  },
];

function Paths() {
  return (
    <Layout>
      <section className="container mx-auto max-w-7xl px-6 pt-16 pb-8">
        <span className="font-mono text-xs text-primary-glow">/ paths</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">Learning paths</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Structured tracks that bundle courses, labs, and projects into a clear roadmap.
        </p>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-2">
          {paths.map((p) => (
            <div key={p.title} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-card p-8">
              <div className={`absolute -top-24 -right-24 size-64 rounded-full bg-gradient-to-br ${p.color} opacity-20 blur-3xl`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">~{p.weeks} weeks</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-surface border border-border text-primary-glow font-mono">PATH</span>
                </div>
                <h3 className="mt-4 text-2xl font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                <ul className="mt-6 space-y-2.5">
                  {p.steps.map((s, i) => (
                    <li key={s} className="flex items-center gap-3 text-sm">
                      <span className="grid place-items-center size-6 rounded-full bg-surface border border-border font-mono text-[10px] text-primary-glow">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-foreground/90">{s}</span>
                      <CheckCircle2 className="size-3.5 text-success/60 ml-auto" />
                    </li>
                  ))}
                </ul>
                <Link to="/courses" className="mt-7 inline-flex items-center gap-2 text-sm text-primary-glow hover:underline">
                  Start this path <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
