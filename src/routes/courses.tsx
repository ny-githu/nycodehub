import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Clock, Star, Users } from "lucide-react";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "Courses — byteforge" },
      { name: "description", content: "Hands-on courses in coding, web development, DevOps, and AI engineering." },
      { property: "og:title", content: "Courses — byteforge" },
      { property: "og:description", content: "Browse hands-on coding and software engineering courses." },
    ],
  }),
  component: Courses,
});

const courses = [
  { tag: "Frontend", title: "React 19 from first principles", level: "Intermediate", hours: 8, rating: 4.9, learners: 12400 },
  { tag: "Backend", title: "Designing REST APIs that scale", level: "Intermediate", hours: 6, rating: 4.8, learners: 8900 },
  { tag: "Systems", title: "Algorithms: arrays to graphs", level: "Beginner", hours: 12, rating: 4.9, learners: 21300 },
  { tag: "DevOps", title: "Docker & Kubernetes in practice", level: "Advanced", hours: 10, rating: 4.7, learners: 6700 },
  { tag: "AI", title: "Build a RAG app end-to-end", level: "Intermediate", hours: 5, rating: 4.9, learners: 9800 },
  { tag: "Linux", title: "The pragmatic Bash handbook", level: "Beginner", hours: 4, rating: 4.8, learners: 14200 },
  { tag: "Frontend", title: "TypeScript deep dive", level: "Intermediate", hours: 7, rating: 4.9, learners: 17500 },
  { tag: "Backend", title: "Postgres for application devs", level: "Intermediate", hours: 6, rating: 4.8, learners: 7300 },
  { tag: "Security", title: "Web app security essentials", level: "Beginner", hours: 5, rating: 4.7, learners: 5600 },
];

const filters = ["All", "Frontend", "Backend", "Systems", "DevOps", "AI", "Linux", "Security"];

function Courses() {
  return (
    <Layout>
      <section className="container mx-auto max-w-7xl px-6 pt-16 pb-10">
        <span className="font-mono text-xs text-primary-glow">/ courses</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">Catalog</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          {courses.length}+ hands-on courses across the stack. Every lesson runs in a real environment.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {filters.map((f, i) => (
            <button
              key={f}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                i === 0 ? "bg-gradient-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.title} to="/practice" className="group block bg-gradient-card border border-border rounded-xl p-6 hover:border-primary/50 transition">
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 text-[11px] font-mono rounded bg-surface border border-border text-primary-glow">{c.tag}</span>
                <span className="text-xs text-muted-foreground">{c.level}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold group-hover:text-primary-glow transition">{c.title}</h3>
              <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> {c.hours}h</span>
                <span className="flex items-center gap-1"><Star className="size-3.5 text-chart-4" /> {c.rating}</span>
                <span className="flex items-center gap-1"><Users className="size-3.5" /> {c.learners.toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
}
