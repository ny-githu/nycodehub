import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getCourseBySlug } from "@/lib/courses.functions";
import { Loader2, PlayCircle, ArrowLeft, Code2 } from "lucide-react";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/courses/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — NYCODEHUB` }] }),
  component: CourseDetail,
  errorComponent: ({ error }) => (
    <Layout><div className="container mx-auto max-w-3xl px-6 py-20 text-destructive">{error.message}</div></Layout>
  ),
});

type Video = {
  id: string;
  topic: string;
  title: string;
  description: string | null;
  video_url: string | null;
  storage_path: string | null;
  sort_order: number;
};

function publicVideoUrl(v: Video): string | null {
  if (v.video_url) return v.video_url;
  if (v.storage_path) {
    const { data } = supabase.storage.from("course-videos").getPublicUrl(v.storage_path);
    return data.publicUrl;
  }
  return null;
}

function isYouTube(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function CourseDetail() {
  const { slug } = Route.useParams();
  const fn = useServerFn(getCourseBySlug);
  const { data, isLoading } = useQuery({
    queryKey: ["course", slug],
    queryFn: () => fn({ data: { slug } }),
  });

  const [active, setActive] = useState<Video | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Video[]>();
    (data?.videos ?? []).forEach((v) => {
      const arr = map.get(v.topic) ?? [];
      arr.push(v as Video);
      map.set(v.topic, arr);
    });
    return Array.from(map.entries());
  }, [data]);

  // pick first video by default
  if (!active && data?.videos?.[0]) setActive(data.videos[0] as Video);

  if (isLoading) {
    return <Layout><div className="grid place-items-center py-32"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div></Layout>;
  }
  if (!data?.course) {
    return <Layout><div className="container mx-auto max-w-3xl px-6 py-20 text-muted-foreground">Not found.</div></Layout>;
  }

  const url = active ? publicVideoUrl(active) : null;
  const yt = url ? isYouTube(url) : null;

  return (
    <Layout>
      <div className="container mx-auto max-w-7xl px-6 py-8 animate-fade-in">
        <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground story-link">
          <ArrowLeft className="size-4" /> {t.courses_h1}
        </Link>
        <h1 className="mt-3 text-3xl md:text-4xl font-bold">{data.course.title}</h1>
        {data.course.summary && <p className="mt-2 text-muted-foreground max-w-3xl">{data.course.summary}</p>}

        <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-6">
          <div>
            <div className="aspect-video rounded-xl overflow-hidden border border-border bg-black shadow-elevated animate-scale-in">
              {active && url ? (
                yt ? (
                  <iframe src={yt} title={active.title} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                ) : (
                  <video key={active.id} src={url} controls className="w-full h-full bg-black" />
                )
              ) : (
                <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">{t.courses_no_videos}</div>
              )}
            </div>
            {active && (
              <div className="mt-4 rounded-xl border border-border bg-gradient-card p-5">
                <div className="font-mono text-xs text-primary-glow">{active.topic}</div>
                <h2 className="mt-1 text-xl font-semibold">{active.title}</h2>
                {active.description && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{active.description}</p>}
                <Link to="/practice" className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-gradient-primary text-primary-foreground shadow-glow hover-scale">
                  <Code2 className="size-4" /> {t.nav_open_lab}
                </Link>
              </div>
            )}
          </div>

          <aside className="rounded-xl border border-border bg-gradient-card p-4 max-h-[80vh] overflow-y-auto">
            <h3 className="font-semibold text-sm mb-3">{t.courses_topics}</h3>
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.courses_no_videos}</p>
            ) : (
              <div className="space-y-4">
                {grouped.map(([topic, vs]) => (
                  <div key={topic}>
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1.5">{topic}</div>
                    <div className="space-y-1">
                      {vs.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => setActive(v)}
                          className={`w-full text-left flex items-start gap-2 px-2 py-2 text-sm rounded-md transition ${
                            active?.id === v.id ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-surface"
                          }`}
                        >
                          <PlayCircle className="size-4 mt-0.5 flex-shrink-0 text-primary-glow" />
                          <span className="line-clamp-2">{v.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
