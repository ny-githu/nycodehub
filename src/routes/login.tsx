import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Terminal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/",
  }),
  head: () => ({
    meta: [
      { title: "Injira — NYCODEHUB" },
      { name: "description", content: "Injira muri konti yawe ya NYCODEHUB." },
      { property: "og:title", content: "Injira — NYCODEHUB" },
      { property: "og:description", content: "Injira muri konti yawe ya NYCODEHUB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const search = Route.useSearch();




  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success(t.signin_welcome);
      navigate({ to: search.redirect || "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.signin_failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center">
          <span className="grid place-items-center size-14 rounded-xl bg-gradient-primary shadow-glow glow-pulse">
            <Terminal className="size-6 text-primary-foreground" />
          </span>
          <div className="mt-4 font-mono text-2xl font-bold tracking-tight flex">
            {"NYCODEHUB".split("").map((c, i) => (
              <span key={i} className="logo-letter inline-block" style={{ animationDelay: `${i * 70}ms` }}>
                {c}
              </span>
            ))}
            <span className="text-primary-glow caret-blink ml-0.5">_</span>
          </div>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-3 animate-scale-in">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.email}
            className="w-full px-3 py-2.5 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono transition"
          />
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t.password}
            className="w-full px-3 py-2.5 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono transition"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60 hover-scale animated-gradient"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? t.signin_busy : t.signin_btn}
          </button>
        </form>
      </div>
    </div>
  );
}
