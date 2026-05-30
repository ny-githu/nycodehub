import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPaymentPage, submitPayment } from "@/lib/payments.functions";
import { useAuth } from "@/hooks/use-auth";
import { CreditCard, Copy, Loader2, CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/payment")({
  head: () => ({ meta: [{ title: "Kwishyura — NYCODEHUB" }] }),
  component: PaymentPage,
});

function PaymentPage() {
  const qc = useQueryClient();
  const { expired, refreshExpiry } = useAuth();
  const fetchFn = useServerFn(getPaymentPage);
  const submitFn = useServerFn(submitPayment);

  const { data, isLoading } = useQuery({ queryKey: ["payment-page"], queryFn: () => fetchFn() });

  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [txnId, setTxnId] = useState("");

  const submitMut = useMutation({
    mutationFn: () => submitFn({ data: { planId: selectedPlan, transactionId: txnId } }),
    onSuccess: () => {
      toast.success(t.payment_submitted);
      setTxnId("");
      qc.invalidateQueries({ queryKey: ["payment-page"] });
      refreshExpiry();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const plans = data?.plans ?? [];
  const settings = data?.settings;
  const expiresAt = data?.expiresAt;

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-6 py-12 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center size-12 rounded-md bg-gradient-primary shadow-glow glow-pulse">
            <CreditCard className="size-6 text-primary-foreground" />
          </span>
          <div>
            <h1 className="text-3xl font-bold">{t.payment_h1}</h1>
            <p className="text-sm text-muted-foreground font-mono">{t.payment_sub}</p>
          </div>
        </div>

        {expired && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3 animate-slide-up">
            <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">{t.payment_disabled}</div>
              <p className="text-muted-foreground mt-1">{t.payment_disabled_p}</p>
            </div>
          </div>
        )}

        {expiresAt && !expired && (
          <div className="mb-6 rounded-xl border border-success/40 bg-success/10 p-4 text-sm animate-slide-up">
            <span className="font-semibold text-success">{t.payment_active}</span>
            <span className="text-muted-foreground"> — {t.payment_expires} {new Date(expiresAt).toLocaleString()}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-border bg-gradient-card p-6 hover-scale animate-slide-up">
              <h2 className="text-lg font-semibold">{t.payment_step1}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t.payment_step1_lead}</p>
              <div className="mt-3 flex items-center gap-2 p-4 rounded-lg bg-surface border border-border">
                <span className="font-mono text-3xl tracking-widest text-primary-glow flex-1">{settings?.mobile_code}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(settings?.mobile_code ?? ""); toast.success(t.copied); }}
                  className="p-2 rounded-md hover:bg-surface-elevated transition"
                ><Copy className="size-4" /></button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground whitespace-pre-line font-mono">
                {settings?.instructions}
              </p>
            </section>

            <section className="rounded-xl border border-border bg-gradient-card p-6 animate-slide-up" style={{ animationDelay: "60ms" }}>
              <h2 className="text-lg font-semibold">{t.payment_step2}</h2>
              <div className="mt-4 space-y-2">
                {plans.length === 0 && <p className="text-sm text-muted-foreground">{t.payment_step2_empty}</p>}
                {plans.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition ${
                      selectedPlan === p.id ? "border-primary bg-primary/10" : "border-border hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" name="plan" value={p.id} checked={selectedPlan === p.id} onChange={() => setSelectedPlan(p.id)} className="accent-primary" />
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{p.duration_days} {t.payment_days_unit}</div>
                      </div>
                    </div>
                    <div className="font-mono font-semibold">{p.amount_rwf.toLocaleString()} RWF</div>
                  </label>
                ))}
              </div>
            </section>

            <section className="md:col-span-2 rounded-xl border border-border bg-gradient-card p-6 animate-slide-up" style={{ animationDelay: "120ms" }}>
              <h2 className="text-lg font-semibold">{t.payment_step3}</h2>
              <form
                onSubmit={(e) => { e.preventDefault(); if (!selectedPlan) return toast.error(t.payment_pick_plan); submitMut.mutate(); }}
                className="mt-4 flex flex-col sm:flex-row gap-2"
              >
                <input
                  required
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  placeholder={t.payment_txn_placeholder}
                  className="flex-1 px-3 py-2.5 rounded-md bg-surface border border-border text-sm font-mono"
                />
                <button
                  type="submit"
                  disabled={submitMut.isPending || !selectedPlan}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60 hover-scale animated-gradient"
                >
                  {submitMut.isPending && <Loader2 className="size-4 animate-spin" />}
                  {t.payment_submit}
                </button>
              </form>
            </section>

            <section className="md:col-span-2 rounded-xl border border-border bg-gradient-card p-6 animate-slide-up" style={{ animationDelay: "180ms" }}>
              <h2 className="text-lg font-semibold">{t.payment_history}</h2>
              {(data?.myRequests ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">{t.payment_history_empty}</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground font-mono border-b border-border">
                      <tr><th className="text-left py-2">{t.payment_th_date}</th><th className="text-left">{t.payment_th_txn}</th><th className="text-left">{t.payment_th_amount}</th><th className="text-left">{t.payment_th_status}</th></tr>
                    </thead>
                    <tbody>
                      {data!.myRequests.map((r) => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="py-2 font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="font-mono">{r.transaction_id}</td>
                          <td className="font-mono">{r.amount_rwf.toLocaleString()} RWF</td>
                          <td>
                            {r.status === "pending" && <span className="inline-flex items-center gap-1 text-chart-4 text-xs"><Clock className="size-3" /> {t.payment_status_pending}</span>}
                            {r.status === "approved" && <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="size-3" /> {t.payment_status_approved}</span>}
                            {r.status === "rejected" && <span className="inline-flex items-center gap-1 text-destructive text-xs"><XCircle className="size-3" /> {t.payment_status_rejected}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </Layout>
  );
}
