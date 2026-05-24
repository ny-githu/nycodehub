import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Github, Twitter } from "lucide-react";

export const Route = createFileRoute("/instructors")({
  head: () => ({
    meta: [
      { title: "Instructors — byteforge" },
      { name: "description", content: "Senior engineers from Vercel, Stripe, Google and beyond — teaching what they ship." },
      { property: "og:title", content: "Instructors — byteforge" },
      { property: "og:description", content: "Meet the engineers behind byteforge." },
    ],
  }),
  component: Instructors,
});

const people = [
  { name: "Maya Okafor", role: "Staff Engineer · ex-Stripe", focus: "APIs, distributed systems", initials: "MO" },
  { name: "Liu Chen", role: "Principal Engineer · Vercel", focus: "React, edge runtimes", initials: "LC" },
  { name: "Sara Khoury", role: "SRE Lead · ex-Google", focus: "Kubernetes, observability", initials: "SK" },
  { name: "Diego Alvarez", role: "Founding Engineer · indie", focus: "TypeScript, product velocity", initials: "DA" },
  { name: "Priya Nair", role: "ML Engineer · ex-OpenAI", focus: "RAG, evals, agents", initials: "PN" },
  { name: "Jonas Berg", role: "Security Engineer · ex-Cloudflare", focus: "Web security, hardening", initials: "JB" },
];

function Instructors() {
  return (
    <Layout>
      <section className="container mx-auto max-w-7xl px-6 pt-16 pb-10">
        <span className="font-mono text-xs text-primary-glow">/ instructors</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">Taught by engineers who ship.</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Every course is built and maintained by senior practitioners working in production every day.
        </p>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <div key={p.name} className="bg-gradient-card border border-border rounded-xl p-6 hover:border-primary/50 transition">
              <div className="flex items-center gap-4">
                <div className="grid place-items-center size-14 rounded-full bg-gradient-primary text-primary-foreground font-mono font-bold shadow-glow">
                  {p.initials}
                </div>
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.role}</div>
                </div>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                <span className="font-mono text-primary-glow">focus:</span> {p.focus}
              </p>
              <div className="mt-5 flex gap-2">
                <a className="grid place-items-center size-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition" href="#" aria-label="GitHub">
                  <Github className="size-4" />
                </a>
                <a className="grid place-items-center size-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-surface transition" href="#" aria-label="Twitter">
                  <Twitter className="size-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
