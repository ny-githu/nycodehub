import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Terminal, Loader2, Smartphone, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getSignupInfo, createAccountWithPayment } from "@/lib/signup.functions";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Fungura konti — NYCODEHUB" },
      { name: "description", content: "Fungura konti ya NYCODEHUB, hitamo uburyo bwo kwishyura, hanyuma wandike transaction ID ya MoMo." },
      { property: "og:title", content: "Fungura konti — NYCODEHUB" },
      { property: "og:description", content: "Iyandikishe kuri NYCODEHUB wishyure ukoresheje MoMo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

type Plan = { id: string; name: string; duration_days: number; amount_rwf: number };

function SignupPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("1940525");
  const [instructions, setInstructions] = useState("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { autoApproved: boolean }>(null);

  useEffect(() => {
    getSignupInfo()
      .then((info) => {
        setCode(info.settings.mobile_code);
        setInstructions(info.settings.instructions ?? "");
        setPlans(info.plans as Plan[]);
        if (info.plans[0]) setPlanId(info.plans[0].id);
      })
      .catch(() => toast.error("Ntibyashobotse kuzana amakuru y'ubwishyu."));
  }, []);

  const plan = plans.find((p) => p.id === planId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!planId) return toast.error("Hitamo uburyo bwo kwishyura.");
    setBusy(true);
    try {
      const res = await createAccountWithPayment({
        data: { email, password, displayName, planId, transactionId: txn },
      });
      setDone({ autoApproved: res.autoApproved });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ntibyakunze.");
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
            {done.autoApproved
              ? "Ubwishyu bwawe bwahuye n'ubutumwa bwa MoMo bwageze kuri sisitemu — ubu ushobora kwinjira ukoreshe konti yawe."
              : "Transaction ID yawe iri ku rutonde rwo kwemezwa n'umuyobozi. Ushobora kwinjira, kandi nyuma yo kwemezwa uzabona serivisi zose."}
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
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl animate-fade-in">
        <div className="flex flex-col items-center">
          <span className="grid place-items-center size-14 rounded-xl bg-gradient-primary shadow-glow glow-pulse">
            <Terminal className="size-6 text-primary-foreground" />
          </span>
          <h1 className="mt-4 font-mono text-2xl font-bold tracking-tight">NYCODEHUB</h1>
          <p className="mt-1 text-sm text-muted-foreground">Fungura konti nshya</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-surface p-5 animate-scale-in">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Smartphone className="size-4 text-primary" /> Ishyura ubanze
            </div>
            <div className="mt-3 rounded-lg bg-background border border-border p-4 text-center">
              <div className="text-xs text-muted-foreground">Kode yo kwishyuriraho</div>
              <div className="mt-1 font-mono text-2xl font-bold text-primary-glow">{code}</div>
            </div>
            {instructions && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{instructions}</p>}

            <div className="mt-4 space-y-2">
              {plans.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition hover-scale ${
                    planId === p.id ? "border-primary bg-primary/10" : "border-border bg-background"
                  }`}
                >
                  <span>
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">{p.duration_days} iminsi</span>
                  </span>
                  <span className="font-mono font-semibold">{p.amount_rwf.toLocaleString()} RWF</span>
                </button>
              ))}
              {!plans.length && <p className="text-xs text-muted-foreground">Nta plans zirahari.</p>}
            </div>
          </section>

          <form onSubmit={submit} className="rounded-xl border border-border bg-surface p-5 space-y-3 animate-scale-in">
            <div className="text-sm font-semibold">Amakuru yawe</div>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Amazina yawe"
              maxLength={80}
              className="w-full px-3 py-2.5 rounded-md bg-background border border-border focus:border-primary outline-none text-sm font-mono transition"
            />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              maxLength={255}
              className="w-full px-3 py-2.5 rounded-md bg-background border border-border focus:border-primary outline-none text-sm font-mono transition"
            />
            <input
              required
              minLength={6}
              maxLength={72}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ijambobanga (min 6)"
              className="w-full px-3 py-2.5 rounded-md bg-background border border-border focus:border-primary outline-none text-sm font-mono transition"
            />
            <input
              required
              value={txn}
              onChange={(e) => setTxn(e.target.value)}
              placeholder="Transaction ID ya MoMo"
              maxLength={100}
              className="w-full px-3 py-2.5 rounded-md bg-background border border-border focus:border-primary outline-none text-sm font-mono transition"
            />
            {plan && (
              <p className="text-xs text-muted-foreground">
                Uhisemo <span className="text-foreground font-medium">{plan.name}</span> —{" "}
                <span className="font-mono">{plan.amount_rwf.toLocaleString()} RWF</span> ({plan.duration_days} iminsi)
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60 hover-scale animated-gradient"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Birakorwa…" : "Fungura konti"}
            </button>
            <Link
              to="/login"
              search={{ redirect: "/" }}
              className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="size-3" /> Usanzwe ufite konti? Injira
            </Link>
          </form>
        </div>
      </div>
    </div>
  );
}
