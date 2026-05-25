import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Check, Star } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — byteforge" },
      { name: "description", content: "Simple plans for self-learners, pros, and teams. Cancel anytime." },
      { property: "og:title", content: "Pricing — byteforge" },
      { property: "og:description", content: "Simple plans for self-learners, pros, and teams." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Free",
    price: "$0",
    blurb: "Try the platform with select labs and intro courses.",
    features: ["10 free labs", "Community access", "Progress tracking"],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "$19",
    sub: "/month",
    blurb: "Everything you need to level up as an engineer.",
    features: ["All courses & labs", "Real cloud environments", "Certificates", "Project reviews"],
    cta: "Go Pro",
    featured: true,
  },
  {
    name: "Teams",
    price: "$49",
    sub: "/seat / mo",
    blurb: "Roll out structured upskilling for your engineering org.",
    features: ["Everything in Pro", "Team analytics", "Custom paths", "SSO & invoicing"],
    cta: "Contact sales",
  },
];

const testimonials = [
  { quote: "I went from bootcamp grad to mid-level in 6 months — labs made the difference.", who: "Anika R.", role: "Frontend Engineer" },
  { quote: "Our team finally has one place to upskill. The path system is brilliant.", who: "Marcus T.", role: "Eng Manager · fintech" },
  { quote: "It feels like pair-programming with senior engineers. Worth every cent.", who: "Hiro K.", role: "Backend Engineer" },
];

function Pricing() {
  return (
    <Layout>
      <section className="container mx-auto max-w-7xl px-6 pt-16 pb-12 text-center">
        <span className="font-mono text-xs text-primary-glow">/ pricing</span>
        <h1 className="mt-3 text-4xl md:text-5xl font-bold">Simple, honest pricing.</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Start free. Upgrade when you're ready. Cancel anytime.
        </p>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 ${
                p.featured
                  ? "border-primary bg-gradient-card shadow-glow"
                  : "border-border bg-gradient-card"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 px-3 py-1 text-[11px] font-mono rounded-full bg-gradient-primary text-primary-foreground">
                  most popular
                </span>
              )}
              <h3 className="font-mono text-lg">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-5xl font-bold">{p.price}</span>
                {p.sub && <span className="text-sm text-muted-foreground">{p.sub}</span>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{p.blurb}</p>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="size-4 mt-0.5 text-primary-glow shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/practice"
                className={`mt-8 w-full inline-flex justify-center items-center px-4 py-2.5 rounded-md font-medium transition ${
                  p.featured
                    ? "bg-gradient-primary text-primary-foreground hover:brightness-110"
                    : "border border-border hover:bg-surface"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-6 pb-24">
        <h2 className="text-2xl md:text-3xl font-bold text-center">Loved by 48,000+ engineers</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.who} className="bg-gradient-card border border-border rounded-xl p-6">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-chart-4 text-chart-4" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 font-mono text-xs text-muted-foreground">
                — {t.who} · {t.role}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
