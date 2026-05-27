import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPaymentPage, submitPayment } from "@/lib/payments.functions";
import { useAuth } from "@/hooks/use-auth";
import { CreditCard, Copy, Loader2, CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/payment")({
  head: () => ({ meta: [{ title: "Payment — NYCODEHUB" }] }),
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
      toast.success("Submitted! The admin will review your payment shortly.");
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
      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center size-12 rounded-md bg-gradient-primary shadow-glow">
            <CreditCard className="size-6 text-primary-foreground" />
          </span>
          <div>
            <h1 className="text-3xl font-bold">Payment</h1>
            <p className="text-sm text-muted-foreground font-mono">// continue your NYCODEHUB session</p>
          </div>
        </div>

        {expired && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3">
            <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Your account is disabled</div>
              <p className="text-muted-foreground mt-1">
                Pay one of the plans below to continue using courses and the practice lab.
              </p>
            </div>
          </div>
        )}

        {expiresAt && !expired && (
          <div className="mb-6 rounded-xl border border-success/40 bg-success/10 p-4 text-sm">
            <span className="font-semibold text-success">Active subscription</span>
            <span className="text-muted-foreground"> — expires {new Date(expiresAt).toLocaleString()}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> loading…</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Mobile code */}
            <section className="rounded-xl border border-border bg-gradient-card p-6">
              <h2 className="text-lg font-semibold">1. Send the money</h2>
              <p className="mt-2 text-sm text-muted-foreground">Pay via MoMo to this code:</p>
              <div className="mt-3 flex items-center gap-2 p-4 rounded-lg bg-surface border border-border">
                <span className="font-mono text-3xl tracking-widest text-primary-glow flex-1">{settings?.mobile_code}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(settings?.mobile_code ?? ""); toast.success("Copied"); }}
                  className="p-2 rounded-md hover:bg-surface-elevated"
                ><Copy className="size-4" /></button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground whitespace-pre-line font-mono">
                {settings?.instructions}
              </p>
            </section>

            {/* Plans */}
            <section className="rounded-xl border border-border bg-gradient-card p-6">
              <h2 className="text-lg font-semibold">2. Choose a plan</h2>
              <div className="mt-4 space-y-2">
                {plans.length === 0 && <p className="text-sm text-muted-foreground">No active plans. Contact admin.</p>}
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
                        <div className="text-xs text-muted-foreground font-mono">{p.duration_days} days</div>
                      </div>
                    </div>
                    <div className="font-mono font-semibold">{p.amount_rwf.toLocaleString()} RWF</div>
                  </label>
                ))}
              </div>
            </section>

            {/* Submit */}
            <section className="md:col-span-2 rounded-xl border border-border bg-gradient-card p-6">
              <h2 className="text-lg font-semibold">3. Submit your transaction ID</h2>
              <form
                onSubmit={(e) => { e.preventDefault(); if (!selectedPlan) return toast.error("Pick a plan"); submitMut.mutate(); }}
                className="mt-4 flex flex-col sm:flex-row gap-2"
              >
                <input
                  required
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                  placeholder="MoMo transaction ID (e.g. 1234ABCD)"
                  className="flex-1 px-3 py-2.5 rounded-md bg-surface border border-border text-sm font-mono"
                />
                <button
                  type="submit"
                  disabled={submitMut.isPending || !selectedPlan}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60"
                >
                  {submitMut.isPending && <Loader2 className="size-4 animate-spin" />}
                  Submit for approval
                </button>
              </form>
            </section>

            {/* History */}
            <section className="md:col-span-2 rounded-xl border border-border bg-gradient-card p-6">
              <h2 className="text-lg font-semibold">Your payment history</h2>
              {(data?.myRequests ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No payments submitted yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground font-mono border-b border-border">
                      <tr><th className="text-left py-2">date</th><th className="text-left">txn id</th><th className="text-left">amount</th><th className="text-left">status</th></tr>
                    </thead>
                    <tbody>
                      {data!.myRequests.map((r) => (
                        <tr key={r.id} className="border-b border-border/50">
                          <td className="py-2 font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="font-mono">{r.transaction_id}</td>
                          <td className="font-mono">{r.amount_rwf.toLocaleString()} RWF</td>
                          <td>
                            {r.status === "pending" && <span className="inline-flex items-center gap-1 text-chart-4 text-xs"><Clock className="size-3" /> pending</span>}
                            {r.status === "approved" && <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="size-3" /> approved</span>}
                            {r.status === "rejected" && <span className="inline-flex items-center gap-1 text-destructive text-xs"><XCircle className="size-3" /> rejected</span>}
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
