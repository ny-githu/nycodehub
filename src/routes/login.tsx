import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Terminal, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — byteforge" },
      { name: "description", content: "Create your byteforge account or sign in to continue learning." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created — check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-md px-4 py-16">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-mono font-bold text-lg">
            <span className="grid place-items-center size-9 rounded-md bg-gradient-primary shadow-glow">
              <Terminal className="size-4 text-primary-foreground" />
            </span>
            byteforge<span className="text-primary-glow">_</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {mode === "signin" ? "// continue your build" : "// start hacking in minutes"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-6 shadow-elevated">
          <button
            onClick={google}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-border bg-surface hover:bg-surface/70 text-sm font-medium transition disabled:opacity-60"
          >
            <svg className="size-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.8h5.35c-.25 1.4-1.7 4.1-5.35 4.1-3.2 0-5.85-2.65-5.85-5.9s2.65-5.9 5.85-5.9c1.85 0 3.05.8 3.75 1.45l2.55-2.45C16.65 4.6 14.55 3.6 12 3.6 6.95 3.6 2.85 7.7 2.85 12.7S6.95 21.8 12 21.8c6.95 0 9.55-4.85 9.55-7.4 0-.5-.05-1-.2-1.3z"/></svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground font-mono">
            <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-mono text-muted-foreground">display_name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ada_lovelace"
                  className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono"
                />
              </div>
            )}
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
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to byteforge?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary-glow hover:underline font-medium"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}
