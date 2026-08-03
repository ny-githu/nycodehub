import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { LANGS, TEMPLATES, TEMPLATE_HANDOFF_KEY, templatesFor, type LangKey } from "@/lib/templates";
import { ArrowRight, Code2, Play, Sparkles, Terminal } from "lucide-react";
import heroStudents from "@/assets/hero-students.jpg";
import codingHands from "@/assets/coding-hands.jpg";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Murakaza neza — NYCODEHUB" },
      { name: "description", content: "Hitamo ururimi rwa porogaramu maze ufungure template y'umushinga muri CODEROOM ya NYCODEHUB." },
      { property: "og:title", content: "WELCOME TO NYCODEHUB" },
      { property: "og:description", content: "Hitamo ururimi rwa porogaramu ufungure template y'umushinga." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [active, setActive] = useState<LangKey>("html");
  const lang = LANGS.find((l) => l.key === active) ?? LANGS[0];
  const templates = templatesFor(active);

  function openTemplate(id: string) {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    sessionStorage.setItem(TEMPLATE_HANDOFF_KEY, JSON.stringify({ lang: template.lang, files: template.files }));
    void navigate({ to: "/practice" });
  }

  function openBlank() {
    sessionStorage.setItem(TEMPLATE_HANDOFF_KEY, JSON.stringify({ lang: lang.key, files: [{ name: lang.file, content: lang.sample }] }));
    void navigate({ to: "/practice" });
  }

  return (
    <Layout>
      <section className="relative overflow-hidden bg-hero">
        <img
          src={heroStudents}
          alt="Abanyeshuri biga gukora porogaramu kuri mudasobwa muri NYCODEHUB"
          width={1600}
          height={912}
          className="absolute inset-0 size-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background" />
        <div className="absolute inset-0 grid-bg opacity-20" />
        <div className="relative container mx-auto max-w-7xl px-6 pt-16 pb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-mono">
            {"WELCOME TO ".split("").map((c, i) => (
              <span key={i} className="logo-letter inline-block whitespace-pre" style={{ animationDelay: `${i * 45}ms` }}>{c}</span>
            ))}
            <span className="text-gradient animate-scale-in inline-block">NYCODEHUB</span>
            <span className="text-primary-glow caret-blink">_</span>
          </h1>
          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto animate-slide-up">
            Hitamo ururimi rwa porogaramu, ufungure template y'umushinga, wandike code urebe igisohoka ako kanya — NYCODER igufasha gukosora amakosa.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/practice" className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-3 font-medium text-primary-foreground shadow-glow hover:brightness-110 transition">
              Fungura CODEROOM <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24 pt-8">
        <h2 className="text-center text-xl font-semibold font-mono">Hitamo ururimi urebe za templates</h2>
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => setActive(l.key)}
              className={`px-4 py-2 rounded-full text-sm font-mono border transition hover-scale ${
                active === l.key
                  ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div key={lang.key} className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3 animate-scale-in">
          {templates.map((p, i) => (
            <button
              key={p.id}
              onClick={() => openTemplate(p.id)}
              className="group relative overflow-hidden rounded-xl border border-border bg-gradient-card p-6 text-left transition hover:border-primary/60 hover-scale animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${lang.color} opacity-0 group-hover:opacity-100 transition`} />
              <div className="relative">
                <span className="grid place-items-center size-10 rounded-lg bg-surface border border-border group-hover:bg-gradient-primary group-hover:border-transparent transition">
                  <Code2 className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
                <p className="mt-3 text-[11px] font-mono text-muted-foreground">{p.files.map((f) => f.name).join(" · ")}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-glow">
                  <Play className="size-3.5" /> Fungura muri CODEROOM
                </span>
              </div>
            </button>
          ))}

          <button
            onClick={openBlank}
            className="group flex flex-col items-start justify-center rounded-xl border border-dashed border-border bg-surface/40 p-6 text-left transition hover:border-primary/60 hover-scale"
          >
            <span className="grid place-items-center size-10 rounded-lg bg-surface border border-border group-hover:bg-gradient-primary group-hover:border-transparent transition">
              <Sparkles className="size-5" />
            </span>
            <h3 className="mt-4 text-lg font-semibold">Umushinga mushya ({lang.label})</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">Tangira ku mpapuro zisa, wandike code yawe bwite.</p>
          </button>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <div className="grid items-center gap-8 rounded-2xl border border-border bg-gradient-card p-6 md:grid-cols-2 md:p-10">
          <img
            src={codingHands}
            alt="Umukoresha wandika code muri editor y'umukara"
            loading="lazy"
            width={1200}
            height={704}
            className="rounded-xl border border-border object-cover"
          />
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs font-mono text-primary-glow">
              <Terminal className="size-3.5" /> NYCODER
            </span>
            <h2 className="mt-4 text-2xl font-bold">AI isesengura code yawe umurongo ku wundi</h2>
            <p className="mt-3 text-muted-foreground">
              NYCODER ntisubiramo code yawe yose — yerekana umurongo ufite ikosa mu ibara ritukura muri editor,
              igusobanurire logic y'umushinga wawe, kandi iguhe igisubizo kigufi cyo gukosora.
            </p>
            <Link to="/practice" className="mt-5 inline-flex items-center gap-2 text-primary-glow hover:underline">
              Gerageza ubu <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
