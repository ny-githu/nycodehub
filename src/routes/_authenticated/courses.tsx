import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Clock, Layers, BookOpen, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/courses")({
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

type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: string;
  duration_minutes: number;
  track: string | null;
};

function Courses() {
  const [filter, setFilter] = useState<string>("All");

  const { data, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Course[];
    },
  });

  const courses = data ?? [];
  const tracks = useMemo(
    () => ["All", ...Array.from(new Set(courses.map((c) => c.track).filter(Boolean) as string[]))],
    [courses],
  );
  const filtered = filter === "All" ? courses : courses.filter((c) => c.track === filter);

  return (
    <Layout>
      <section className="container mx-auto max-w-7xl px-6 pt-16 pb-10">
        <span className="font-mono text-xs text-primary-glow">/ courses</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">Catalog</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          {courses.length} hands-on courses across the stack. Every lesson runs in a real environment.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {tracks.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                filter === f
                  ? "bg-gradient-primary text-primary-foreground border-transparent"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24">
        {isLoading ? (
          <div className="grid place-items-center py-20 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/practice"
                className="group block bg-gradient-card border border-border rounded-xl p-6 hover:border-primary/50 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 text-[11px] font-mono rounded bg-surface border border-border text-primary-glow">
                    {c.track ?? "General"}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{c.level}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold group-hover:text-primary-glow transition">{c.title}</h3>
                {c.summary && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{c.summary}</p>}
                <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(c.duration_minutes / 60)}h</span>
                  <span className="flex items-center gap-1"><Layers className="size-3.5" /> {c.level}</span>
                  <span className="flex items-center gap-1"><BookOpen className="size-3.5" /> lab</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
