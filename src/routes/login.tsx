import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Terminal, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — NYCODEHUB" },
      { name: "description", content: "Sign in to your NYCODEHUB account." },
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

  useEffect(() => {
    // One-time idempotent admin bootstrap. Safe to call repeatedly.
    fetch("/api/public/bootstrap-admin").catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      navigate({ to: search.redirect || "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-mono font-bold text-lg">
            <span className="grid place-items-center size-9 rounded-md bg-gradient-primary shadow-glow">
              <Terminal className="size-4 text-primary-foreground" />
            </span>
            NYCODEHUB<span className="text-primary-glow">_</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            // accounts are issued by your administrator
          </p>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-elevated">
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs font-mono text-muted-foreground">email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">password</label>
              <input
                required
                minLength={6}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Don't have an account? Ask your administrator to create one for you.
          </p>
        </div>
      </div>
    </Layout>
  );
}
