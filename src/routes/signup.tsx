import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Terminal, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fungura konti — NYCODEHUB" },
      { name: "description", content: "Fungura konti ya NYCODEHUB ku buntu — koresha CODEROOM na NYCODER ako kanya." },
      { property: "og:title", content: "Fungura konti — NYCODEHUB" },
      { property: "og:description", content: "Iyandikishe kuri NYCODEHUB ku buntu, nta kwishyura." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!signInError) {
        toast.success("Konti yawe yaremwe!");
        navigate({ to: "/" });
        return;
      }
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ntibyakunze.";
      toast.error(/already/i.test(msg) ? "Iyi email isanzwe ifite konti. Injira." : msg);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="w-full max-w-md text-center animate-scale-in">
          <span className="grid place-items-center size-14 mx-auto rounded-xl bg-gradient-primary shadow-glow">
            <CheckCircle2 className="size-7 text-primary-foreground" />
          </span>
          <h1 className="mt-5 text-xl font-bold">Konti yawe yaremwe!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ubu ushobora kwinjira ukoreshe email n'ijambobanga wanditse. Serivisi zose ziri ku buntu.
          </p>
          <button
            onClick={() => navigate({ to: "/login", search: { redirect: "/" } })}
            className="mt-6 w-full px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow hover-scale"
          >
            Injira
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex flex-col items-center">
          <span className="grid place-items-center size-14 rounded-xl bg-gradient-primary shadow-glow glow-pulse">
            <Terminal className="size-6 text-primary-foreground" />
          </span>
          <h1 className="mt-4 font-mono text-2xl font-bold tracking-tight">NYCODEHUB</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fungura konti nshya — ku buntu</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-3 animate-scale-in">
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Amazina yawe"
            maxLength={80}
            className="w-full px-3 py-2.5 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono transition"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            maxLength={255}
            className="w-full px-3 py-2.5 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono transition"
          />
          <input
            required
            minLength={6}
            maxLength={72}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ijambobanga (min 6)"
            className="w-full px-3 py-2.5 rounded-md bg-surface border border-border focus:border-primary outline-none text-sm font-mono transition"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60 hover-scale animated-gradient"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {busy ? "Turaremye konti…" : "Fungura konti"}
          </button>
          <Link
            to="/login"
            search={{ redirect: "/" }}
            className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary-glow transition"
          >
            <ArrowLeft className="size-3" /> Usanzwe ufite konti? Injira
          </Link>
        </form>
      </div>
    </div>
  );
}
