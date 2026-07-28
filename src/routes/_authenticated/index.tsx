import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layout } from "@/components/site/Layout";
import { ArrowRight, Code2, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Murakaza neza — NYCODEHUB" },
      { name: "description", content: "Hitamo ururimi rwa porogaramu maze urebe imishinga ushobora gukora muri CODEROOM ya NYCODEHUB." },
      { property: "og:title", content: "WELCOME TO NYCODEHUB" },
      { property: "og:description", content: "Hitamo ururimi rwa porogaramu urebe imishinga ushobora gukora." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

type Lang = { key: string; label: string; color: string; projects: { title: string; desc: string }[] };

const LANGS: Lang[] = [
  {
    key: "html",
    label: "HTML / CSS / JS",
    color: "from-orange-500/30 to-orange-500/5",
    projects: [
      { title: "Urubuga rwawe bwite", desc: "Page igaragaza amazina yawe, amafoto n'aho bakugeraho." },
      { title: "Ubucuruzi bworoshye", desc: "Ipaji y'ibicuruzwa hamwe na cart ikoresha JavaScript." },
      { title: "Umukino wa Quiz", desc: "Ibibazo n'amanota abarwa ako kanya." },
      { title: "Calculator", desc: "Imibare y'ibanze ukoresheje buttons na JS." },
    ],
  },
  {
    key: "python",
    label: "Python",
    color: "from-blue-500/30 to-blue-500/5",
    projects: [
      { title: "Bot yo kubara", desc: "Porogaramu isubiza ibibazo by'imibare muri terminal." },
      { title: "Gusesengura amakuru", desc: "Soma amadata, ubare impuzandengo n'ibipimo." },
      { title: "Umukino Guess Number", desc: "Ukina n'umubare uhishe ukoresheje random." },
      { title: "Automation script", desc: "Hindura amazina y'amadosiye byikoresha." },
    ],
  },
  {
    key: "javascript",
    label: "JavaScript",
    color: "from-yellow-500/30 to-yellow-500/5",
    projects: [
      { title: "To-do list", desc: "Ongeraho, siba kandi ubike imirimo yawe." },
      { title: "API client", desc: "Kurura amakuru kuri interineti uyagaragaze." },
      { title: "Umukino wa Snake", desc: "Canvas, keyboard events n'amanota." },
    ],
  },
  {
    key: "typescript",
    label: "TypeScript",
    color: "from-sky-500/30 to-sky-500/5",
    projects: [
      { title: "Sisitemu y'ibaruramari", desc: "Types zikomeye ku bicuruzwa n'ubwishyu." },
      { title: "Library nto", desc: "Kora utility functions zifite types." },
    ],
  },
  {
    key: "java",
    label: "Java",
    color: "from-red-500/30 to-red-500/5",
    projects: [
      { title: "Banki yoroshye", desc: "Konti, kubitsa no kubikuza ukoresheje classes." },
      { title: "Gucunga abanyeshuri", desc: "Amazina, amanota n'ibarurishamibare." },
    ],
  },
  {
    key: "c",
    label: "C / C++",
    color: "from-indigo-500/30 to-indigo-500/5",
    projects: [
      { title: "Algorithms", desc: "Sorting, searching na pointers." },
      { title: "Sisitemu y'ububiko", desc: "Structs, arrays no gusoma amadosiye." },
    ],
  },
  {
    key: "sql",
    label: "SQL",
    color: "from-emerald-500/30 to-emerald-500/5",
    projects: [
      { title: "Database y'ishuri", desc: "Tables, joins na queries z'amanota." },
      { title: "Raporo z'ubucuruzi", desc: "Aggregations, group by n'imibare." },
    ],
  },
  {
    key: "bash",
    label: "Bash / Linux",
    color: "from-slate-400/30 to-slate-400/5",
    projects: [
      { title: "Backup script", desc: "Bika amadosiye byikoresha buri munsi." },
      { title: "Gucunga sisitemu", desc: "Reba disiki, memory na processes." },
    ],
  },
];

function Home() {
  const [active, setActive] = useState<string>(LANGS[0].key);
  const lang = LANGS.find((l) => l.key === active) ?? LANGS[0];

  return (
    <Layout>
      <section className="relative overflow-hidden bg-hero">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative container mx-auto max-w-7xl px-6 pt-16 pb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-mono">
            {"WELCOME TO ".split("").map((c, i) => (
              <span key={i} className="logo-letter inline-block whitespace-pre" style={{ animationDelay: `${i * 45}ms` }}>{c}</span>
            ))}
            <span className="text-gradient animate-scale-in inline-block">NYCODEHUB</span>
            <span className="text-primary-glow caret-blink">_</span>
          </h1>

          <p className="mt-5 text-muted-foreground max-w-2xl mx-auto animate-slide-up">
            Hitamo ururimi rwa porogaramu maze urebe imishinga ushobora gukora ubu, mu CODEROOM.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24 pt-2">
        <div className="flex flex-wrap gap-2 justify-center">
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
          {lang.projects.map((p, i) => (
            <div
              key={p.title}
              className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-card p-6 transition hover:border-primary/60 hover-scale animate-slide-up`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${lang.color} opacity-0 group-hover:opacity-100 transition`} />
              <div className="relative">
                <span className="grid place-items-center size-10 rounded-lg bg-surface border border-border group-hover:bg-gradient-primary group-hover:border-transparent transition">
                  <Code2 className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold">{p.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.desc}</p>
                <Link
                  to="/practice"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-glow hover:underline"
                >
                  <Play className="size-3.5" /> Tangira muri CODEROOM
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            to="/practice"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow hover:brightness-110 transition"
          >
            Fungura CODEROOM <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </Layout>
  );
}
