import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminDeleteUser, adminSetUserDisabled } from "@/lib/admin.functions";
import {
  adminListPlans, adminUpsertPlan, adminDeletePlan,
  adminUpdateSettings, adminUsersOverview,
  adminListPaymentRequests, adminReviewPayment, adminExtendUser, adminSetUserExpiry,
  getPaymentPage,
} from "@/lib/payments.functions";
import { adminListMomoSms, adminUpdateMomoSms, adminAddMomoSms } from "@/lib/momo.functions";
import {
  adminGetNycoder, adminSaveNycoder, adminAddTraining, adminDeleteTraining,
  adminAnalytics, adminListBroadcasts, adminSaveBroadcast, adminDeleteBroadcast,
  adminListPages, adminSavePage,
} from "@/lib/nycoder-admin.functions";
import { Loader2, Trash2, ShieldCheck, UserPlus, CreditCard, Settings as SettingsIcon, Users, Receipt, CheckCircle2, XCircle, Clock, Pencil, Plus, Calendar, Search, Lock, Unlock, Smartphone, BarChart3, Bot, Megaphone, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/" } });
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Admin — NYCODEHUB" }] }),
  component: AdminPage,
});

type Tab = "users" | "plans" | "settings" | "payments" | "momo" | "analytics" | "nycoder" | "broadcast" | "pages";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("payments");
  const listFn = useServerFn(adminListPaymentRequests);
  const { data: allRequests } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => listFn(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const pendingCount = (allRequests ?? []).filter((r) => r.status === "pending").length;

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-6 py-10 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center size-11 rounded-md bg-gradient-primary shadow-glow glow-pulse">
            <ShieldCheck className="size-5 text-primary-foreground" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">{t.admin_title}</h1>
            <p className="text-sm text-muted-foreground font-mono">{t.admin_sub}</p>
          </div>
        </div>

        {pendingCount > 0 && (
          <button
            onClick={() => setTab("payments")}
            className="mb-6 w-full flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-left text-sm hover-scale"
          >
            <Clock className="size-4 text-primary" />
            <span>
              <span className="font-semibold">{pendingCount}</span> transaction ID{" "}
              {pendingCount === 1 ? "itegereje" : "zitegereje"} kwemezwa — kanda hano ubireba.
            </span>
          </button>
        )}

        <div className="flex flex-wrap gap-1 mb-6 border-b border-border">
          {([
            ["analytics", BarChart3, "Imibare"],
            ["users", Users, t.admin_tab_users],
            ["nycoder", Bot, "NYCODER"],
            ["broadcast", Megaphone, "Ubutumwa"],
            ["pages", FileText, "Impapuro"],
            ["payments", Receipt, t.admin_tab_payments],
            ["momo", Smartphone, "MoMo SMS"],
            ["plans", CreditCard, t.admin_tab_plans],
            ["settings", SettingsIcon, t.admin_tab_settings],
          ] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm inline-flex items-center gap-2 border-b-2 -mb-px transition ${
                tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" /> {label}
              {id === "payments" && pendingCount > 0 && (
                <span className="ml-1 grid place-items-center min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>


        {tab === "analytics" && <AnalyticsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "nycoder" && <NycoderTab />}
        {tab === "broadcast" && <BroadcastTab />}
        {tab === "pages" && <PagesTab />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "momo" && <MomoTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "settings" && <SettingsTab />}
      </div>
    </Layout>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const overviewFn = useServerFn(adminUsersOverview);
  const createFn = useServerFn(adminCreateUser);
  const deleteFn = useServerFn(adminDeleteUser);
  const extendFn = useServerFn(adminExtendUser);
  const setExpiryFn = useServerFn(adminSetUserExpiry);
  const setDisabledFn = useServerFn(adminSetUserDisabled);
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => overviewFn() });

  const createMut = useMutation({
    mutationFn: (v: { email: string; password: string; displayName: string; role: "admin" | "instructor" | "learner" }) => createFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { userId: id } }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const extendMut = useMutation({
    mutationFn: (v: { userId: string; days: number }) => extendFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const setExpiryMut = useMutation({
    mutationFn: (v: { userId: string; expiresAt: string | null }) => setExpiryFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const disableMut = useMutation({
    mutationFn: (v: { userId: string; disabled: boolean }) => setDisabledFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });

  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "learner" as "admin" | "instructor" | "learner", days: 30 });

  const q = search.trim().toLowerCase();
  const filteredUsers = (users ?? []).filter((u) => !q || (u.email ?? "").toLowerCase().includes(q));
  const active = (users ?? []).filter((u) => u.active);
  const inactive = (users ?? []).filter((u) => !u.active);

  return (
    <>
      <section className="rounded-xl border border-border bg-gradient-card p-6 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><UserPlus className="size-4" /> {t.admin_create_account}</h2>
        <form
          className="mt-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate({ ...form }, {
              onSuccess: async (res: { id?: string }) => {
                if (form.days > 0 && res.id) {
                  await extendMut.mutateAsync({ userId: res.id, days: form.days });
                }
                setForm({ email: "", password: "", displayName: "", role: "learner", days: 30 });
              },
            });
          }}
        >
          <input required type="email" placeholder={t.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input required minLength={6} type="text" placeholder={t.password} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input type="text" placeholder={t.admin_form_displayname} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono">
            <option value="learner">learner</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
          </select>
          <div className="flex gap-2">
            <input type="number" min={0} max={3650} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className="w-20 px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" title={t.admin_form_days} />
            <button type="submit" disabled={createMut.isPending} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60">
              {createMut.isPending && <Loader2 className="size-4 animate-spin" />} {t.admin_btn_create}
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground font-mono">{t.admin_form_days_hint}</p>
      </section>

      <div className="grid gap-4 mb-4 sm:grid-cols-3">
        <Stat label={t.admin_users_total} value={users?.length ?? 0} />
        <Stat label={t.admin_users_active} value={active.length} tone="success" />
        <Stat label={t.admin_users_disabled} value={inactive.length} tone="destructive" />
      </div>

      <div className="mb-3 relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.admin_search_email}
          className="w-full pl-9 pr-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>
      ) : (
        <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-mono text-muted-foreground bg-surface">
                <tr>
                  <th className="text-left p-3">{t.admin_th_email}</th>
                  <th className="text-left p-3">{t.admin_th_roles}</th>
                  <th className="text-left p-3">{t.admin_th_status}</th>
                  <th className="text-left p-3">{t.admin_th_expires}</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t border-border/40">
                    <td className="p-3 font-mono">{u.email}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{u.roles.join(", ") || "—"}</td>
                    <td className="p-3">
                      {u.is_admin ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary-glow">{t.admin_status_admin}</span>
                      ) : u.disabled ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">{t.admin_status_disabled}</span>
                      ) : u.active ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success">{t.admin_status_active}</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-chart-4/20 text-chart-4">{t.admin_status_expired}</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {u.expires_at ? new Date(u.expires_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!u.is_admin && (
                          <button
                            onClick={() => disableMut.mutate({ userId: u.id, disabled: !u.disabled })}
                            className={`px-2 py-1 text-xs rounded inline-flex items-center gap-1 ${u.disabled ? "bg-success/20 text-success hover:bg-success/30" : "bg-chart-4/20 text-chart-4 hover:bg-chart-4/30"}`}
                            title={u.disabled ? t.admin_btn_enable : t.admin_btn_disable}
                          >
                            {u.disabled ? <><Unlock className="size-3" /> {t.admin_btn_enable}</> : <><Lock className="size-3" /> {t.admin_btn_disable}</>}
                          </button>
                        )}
                        <ExtendButton onExtend={(days) => extendMut.mutate({ userId: u.id, days })} />
                        <button
                          onClick={() => {
                            const v = prompt(t.admin_set_expiry_prompt, u.expires_at ? u.expires_at.slice(0,10) : "");
                            if (v === null) return;
                            const iso = v.trim() ? new Date(v).toISOString() : null;
                            setExpiryMut.mutate({ userId: u.id, expiresAt: iso });
                          }}
                          className="p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface rounded"
                          title={t.admin_th_expires}
                        ><Calendar className="size-3.5" /></button>
                        <button
                          onClick={() => { if (confirm(`${t.admin_btn_delete} ${u.email}?`)) deleteMut.mutate(u.id); }}
                          className="p-1.5 text-xs text-destructive hover:bg-destructive/10 rounded"
                        ><Trash2 className="size-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

function ExtendButton({ onExtend }: { onExtend: (days: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="px-2 py-1 text-xs rounded bg-surface hover:bg-surface-elevated border border-border">
        {t.admin_btn_extend}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 bg-surface-elevated border border-border rounded-md shadow-elevated p-1">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => { onExtend(d); setOpen(false); }} className="block w-full text-left px-3 py-1 text-xs hover:bg-surface rounded">
              +{d} {t.payment_days_unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "destructive" }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-4">
      <div className="text-xs font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function PaymentsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPaymentRequests);
  const reviewFn = useServerFn(adminReviewPayment);
  const { data: requests, isLoading } = useQuery({ queryKey: ["admin-payments"], queryFn: () => listFn() });

  const reviewMut = useMutation({
    mutationFn: (v: { requestId: string; action: "approve" | "reject" }) => reviewFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-payments"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>;

  return (
    <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
      {(requests ?? []).length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{t.admin_payments_none}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-muted-foreground bg-surface">
              <tr>
                <th className="text-left p-3">{t.payment_th_date}</th>
                <th className="text-left p-3">{t.admin_th_email}</th>
                <th className="text-left p-3">{t.admin_tab_plans}</th>
                <th className="text-left p-3">{t.payment_th_amount}</th>
                <th className="text-left p-3">{t.payment_th_txn}</th>
                <th className="text-left p-3">{t.payment_th_status}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {requests!.map((r) => (
                <tr key={r.id} className="border-t border-border/40">
                  <td className="p-3 font-mono text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 font-mono">{r.email}</td>
                  <td className="p-3">{r.plan_name} <span className="text-xs text-muted-foreground">({r.plan_days}d)</span></td>
                  <td className="p-3 font-mono">{r.amount_rwf.toLocaleString()} RWF</td>
                  <td className="p-3 font-mono">{r.transaction_id}</td>
                  <td className="p-3">
                    {r.status === "pending" && <span className="inline-flex items-center gap-1 text-chart-4 text-xs"><Clock className="size-3" /> {t.payment_status_pending}</span>}
                    {r.status === "approved" && <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="size-3" /> {t.payment_status_approved}</span>}
                    {r.status === "rejected" && <span className="inline-flex items-center gap-1 text-destructive text-xs"><XCircle className="size-3" /> {t.payment_status_rejected}</span>}
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => reviewMut.mutate({ requestId: r.id, action: "approve" })} className="px-2 py-1 text-xs rounded bg-success/20 text-success hover:bg-success/30">{t.admin_payments_approve}</button>
                        <button onClick={() => reviewMut.mutate({ requestId: r.id, action: "reject" })} className="px-2 py-1 text-xs rounded bg-destructive/20 text-destructive hover:bg-destructive/30">{t.admin_payments_reject}</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlansTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPlans);
  const upsertFn = useServerFn(adminUpsertPlan);
  const deleteFn = useServerFn(adminDeletePlan);
  const { data: plans, isLoading } = useQuery({ queryKey: ["admin-plans"], queryFn: () => listFn() });

  const upsertMut = useMutation({
    mutationFn: (v: { id?: string; name: string; durationDays: number; amountRwf: number; active: boolean; sortOrder: number }) => upsertFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_saved); qc.invalidateQueries({ queryKey: ["admin-plans"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success(t.admin_done); qc.invalidateQueries({ queryKey: ["admin-plans"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });

  const [draft, setDraft] = useState({ name: "", durationDays: 7, amountRwf: 2000, active: true, sortOrder: 99 });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>;

  return (
    <>
      <section className="rounded-xl border border-border bg-gradient-card p-6 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="size-4" /> {t.admin_plans_add}</h2>
        <form
          className="mt-4 grid sm:grid-cols-5 gap-3"
          onSubmit={(e) => { e.preventDefault(); upsertMut.mutate(draft, { onSuccess: () => setDraft({ name: "", durationDays: 7, amountRwf: 2000, active: true, sortOrder: 99 }) }); }}
        >
          <input required placeholder={t.admin_plans_name} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input required type="number" min={1} placeholder={t.admin_plans_days} value={draft.durationDays} onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input required type="number" min={0} placeholder={t.admin_plans_amount} value={draft.amountRwf} onChange={(e) => setDraft({ ...draft, amountRwf: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input type="number" placeholder="sort" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <button type="submit" disabled={upsertMut.isPending} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60">
            {upsertMut.isPending && <Loader2 className="size-4 animate-spin" />} {t.add}
          </button>
        </form>
      </section>

      <div className="space-y-2">
        {(plans ?? []).map((p) => (
          <PlanRow key={p.id} plan={p} onSave={(v) => upsertMut.mutate({ id: p.id, ...v })} onDelete={() => { if (confirm(`${t.admin_btn_delete} ${p.name}?`)) deleteMut.mutate(p.id); }} />
        ))}
      </div>
    </>
  );
}

function PlanRow({ plan, onSave, onDelete }: { plan: { id: string; name: string; duration_days: number; amount_rwf: number; active: boolean; sort_order: number }; onSave: (v: { name: string; durationDays: number; amountRwf: number; active: boolean; sortOrder: number }) => void; onDelete: () => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState({ name: plan.name, durationDays: plan.duration_days, amountRwf: plan.amount_rwf, active: plan.active, sortOrder: plan.sort_order });

  return (
    <div className="rounded-xl border border-border bg-gradient-card p-4 grid sm:grid-cols-6 gap-3 items-center">
      {edit ? (
        <>
          <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="px-2 py-1.5 rounded bg-surface border border-border text-sm font-mono" />
          <input type="number" value={v.durationDays} onChange={(e) => setV({ ...v, durationDays: Number(e.target.value) })} className="px-2 py-1.5 rounded bg-surface border border-border text-sm font-mono" />
          <input type="number" value={v.amountRwf} onChange={(e) => setV({ ...v, amountRwf: Number(e.target.value) })} className="px-2 py-1.5 rounded bg-surface border border-border text-sm font-mono" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> {t.admin_plans_active}</label>
          <input type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} className="px-2 py-1.5 rounded bg-surface border border-border text-sm font-mono" />
          <div className="flex gap-1 justify-end">
            <button onClick={() => { onSave(v); setEdit(false); }} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground">{t.save}</button>
            <button onClick={() => setEdit(false)} className="px-3 py-1.5 text-xs rounded bg-surface">{t.cancel}</button>
          </div>
        </>
      ) : (
        <>
          <div className="font-semibold">{plan.name}</div>
          <div className="font-mono text-sm">{plan.duration_days} {t.payment_days_unit}</div>
          <div className="font-mono text-sm">{plan.amount_rwf.toLocaleString()} RWF</div>
          <div className={plan.active ? "text-success text-xs" : "text-muted-foreground text-xs"}>{plan.active ? t.admin_plans_active : t.no}</div>
          <div className="text-xs text-muted-foreground font-mono">sort: {plan.sort_order}</div>
          <div className="flex gap-1 justify-end">
            <button onClick={() => setEdit(true)} className="p-1.5 hover:bg-surface rounded"><Pencil className="size-3.5" /></button>
            <button onClick={onDelete} className="p-1.5 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="size-3.5" /></button>
          </div>
        </>
      )}
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getPaymentPage);
  const updateFn = useServerFn(adminUpdateSettings);
  const { data, isLoading } = useQuery({ queryKey: ["payment-page"], queryFn: () => fetchFn() });

  const [code, setCode] = useState("");
  const [instr, setInstr] = useState("");

  const updateMut = useMutation({
    mutationFn: () => updateFn({ data: { mobileCode: code, instructions: instr } }),
    onSuccess: () => { toast.success(t.admin_saved); qc.invalidateQueries({ queryKey: ["payment-page"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>;
  if (!data) return null;

  return (
    <section className="rounded-xl border border-border bg-gradient-card p-6 max-w-2xl">
      <h2 className="text-lg font-semibold">{t.admin_settings_title}</h2>
      <p className="text-xs text-muted-foreground mt-1">{t.admin_settings_title}</p>
      <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); updateMut.mutate(); }}>
        <div>
          <label className="text-xs font-mono text-muted-foreground">{t.admin_settings_code}</label>
          <input
            defaultValue={data.settings.mobile_code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border font-mono text-xl tracking-widest"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-muted-foreground">{t.admin_settings_instructions}</label>
          <textarea
            defaultValue={data.settings.instructions}
            onChange={(e) => setInstr(e.target.value)}
            rows={6}
            className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={updateMut.isPending}
          onClick={() => { if (!code) setCode(data.settings.mobile_code); if (!instr) setInstr(data.settings.instructions); }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60"
        >
          {updateMut.isPending && <Loader2 className="size-4 animate-spin" />} {t.admin_settings_save}
        </button>
      </form>
    </section>
  );
}


function MomoTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListMomoSms);
  const update = useServerFn(adminUpdateMomoSms);
  const add = useServerFn(adminAddMomoSms);
  const [text, setText] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["momo-sms"], queryFn: () => list({}) });
  const mUpdate = useMutation({
    mutationFn: (input: { id: string; status: "pending" | "confirmed" | "dismissed" }) => update({ data: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["momo-sms"] }); toast.success("Byavuguruwe"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const mAdd = useMutation({
    mutationFn: (value: string) => add({ data: { text: value } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["momo-sms"] }); toast.success("Ubutumwa bwongewemo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2"><Smartphone className="size-4 text-primary-glow" /> Ubutumwa bwa MoMo (0791294492)</h2>
        <div className="mb-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">Sender ntigomba kuba nimero.</strong> Mu filter ya SMS Forwarder andika amagambo agaragara ku butumwa bwawe, urugero <code className="rounded bg-background px-1 py-0.5 font-mono">MoMo</code>, <code className="rounded bg-background px-1 py-0.5 font-mono">MTN</code> cyangwa <code className="rounded bg-background px-1 py-0.5 font-mono">received</code>. Ushobora no guhitamo kohereza SMS zose niba filter yanze.</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Kora rule nshya ya <strong className="text-foreground">HTTP POST / Webhook</strong>.</li>
            <li>URL: <code className="break-all rounded bg-background px-1 py-0.5 font-mono">https://nycodehub.lovable.app/api/public/momo-sms</code></li>
            <li>Header: <code className="rounded bg-background px-1 py-0.5 font-mono">x-momo-token</code> = token yawe yabitswe muri system.</li>
            <li>JSON body: <code className="rounded bg-background px-1 py-0.5 font-mono">{"{\"message\":\"{message}\",\"from\":\"{sender}\"}"}</code>. Niba app ikoresha <code>text</code> cyangwa <code>body</code> aho gukoresha <code>message</code>, na byo biremewe.</li>
            <li>Kanda <strong className="text-foreground">Test</strong>. Igisubizo cyiza ni <code className="rounded bg-background px-1 py-0.5 font-mono">{"{\"ok\":true}"}</code>.</li>
          </ol>
          <p>Sisitemu ihita ikuramo transaction ID n'amafaranga, ikayihuza n'uwiyandikishije, kandi ikamufungurira serivisi iyo transaction ihuye.</p>
        </div>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Omeka SMS ya MoMo hano (test)" className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={() => text.trim() && mAdd.mutate(text.trim())} disabled={mAdd.isPending} className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60">Ongeraho</button>
        </div>
      </div>

      {isLoading ? <Loader2 className="size-5 animate-spin" /> : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Transaction ID</th>
                <th className="p-3 text-left">Amafaranga</th>
                <th className="p-3 text-left">Ubutumwa</th>
                <th className="p-3 text-left">Uwishyuye</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="p-3 font-mono text-xs">{row.transaction_id ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{row.amount_rwf ? `${row.amount_rwf.toLocaleString()} RWF` : "—"}</td>
                  <td className="p-3 text-xs max-w-md text-muted-foreground">{row.raw_text.slice(0, 160)}</td>
                  <td className="p-3 text-xs">{row.payer_name ?? row.sender ?? "—"}</td>
                  <td className="p-3 text-xs">
                    <span className={row.status === "confirmed" ? "text-success" : row.status === "dismissed" ? "text-muted-foreground" : "text-chart-4"}>{row.status}</span>
                    {row.matched_request_id && <div className="text-[10px] text-primary-glow">✓ ihuye n'ubusabe ({row.matched_request_status})</div>}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => mUpdate.mutate({ id: row.id, status: "confirmed" })} className="rounded bg-success/20 px-2 py-1 text-[11px] text-success">Emeza</button>
                      <button onClick={() => mUpdate.mutate({ id: row.id, status: "dismissed" })} className="rounded border border-border px-2 py-1 text-[11px] text-muted-foreground">Kuraho</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">Nta butumwa buraboneka.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============= Imibare (Analytics) ============= */

function AnalyticsTab() {
  const fn = useServerFn(adminAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fn(), refetchInterval: 60_000 });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-sm font-mono text-muted-foreground mb-2">Abakoresha</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Bose" value={data.users.total} />
          <Stat label="Bakora" value={data.users.active} tone="success" />
          <Stat label="Barangiye" value={data.users.expired} tone="destructive" />
          <Stat label="Bashya (icyumweru)" value={data.users.newThisWeek} />
          <Stat label="Bashya (ukwezi)" value={data.users.newThisMonth} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-mono text-muted-foreground mb-2">Ubwishyu</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Bitegereje" value={data.payments.pending} />
          <Stat label="Byemejwe" value={data.payments.approved} tone="success" />
          <Stat label="Byanzwe" value={data.payments.rejected} tone="destructive" />
          <Stat label="Amafaranga yose (RWF)" value={data.payments.revenueRwf} />
          <Stat label="Ukwezi gushize (RWF)" value={data.payments.revenueThisMonthRwf} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-mono text-muted-foreground mb-2">NYCODER &amp; MoMo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Abakoresha NYCODER" value={data.nycoder.learners} />
          <Stat label="Ibibazo byose" value={data.nycoder.turns} />
          <Stat label="Bakoresheje iki cyumweru" value={data.nycoder.activeThisWeek} />
          <Stat label="Ubutumwa MoMo" value={data.momo.total} />
          <Stat label="MoMo itahuye" value={data.momo.unmatched} />
        </div>
      </div>
    </div>
  );
}

/* ============= NYCODER control & training ============= */

function NycoderTab() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetNycoder);
  const saveFn = useServerFn(adminSaveNycoder);
  const addFn = useServerFn(adminAddTraining);
  const delFn = useServerFn(adminDeleteTraining);
  const { data, isLoading } = useQuery({ queryKey: ["admin-nycoder"], queryFn: () => getFn() });

  const [prompt, setPrompt] = useState<string | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [selfImprove, setSelfImprove] = useState<boolean | null>(null);
  const [ex, setEx] = useState({ tag: "general", prompt: "", answer: "" });

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: {
      systemPrompt: prompt ?? (data?.settings.system_prompt as string) ?? "",
      temperature: temp ?? Number(data?.settings.temperature ?? 0.2),
      modelChain: (chain ?? ((data?.settings.model_chain as string[] | null) ?? []).join(", "))
        .split(",").map((s) => s.trim()).filter(Boolean),
      selfImprove: selfImprove ?? Boolean(data?.settings.self_improve),
    } }),
    onSuccess: () => { toast.success(t.admin_saved); qc.invalidateQueries({ queryKey: ["admin-nycoder"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const addMut = useMutation({
    mutationFn: () => addFn({ data: ex }),
    onSuccess: () => { toast.success("Icyitegererezo cyongewe"); setEx({ tag: ex.tag, prompt: "", answer: "" }); qc.invalidateQueries({ queryKey: ["admin-nycoder"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-nycoder"] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Abakoresha NYCODER" value={data.memoryCount} />
        <Stat label="Ibibazo byose" value={data.totalTurns} />
        <Stat label="Ingero z'imyitozo" value={data.training.length} />
      </div>

      <section className="rounded-xl border border-border bg-gradient-card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Bot className="size-4 text-primary-glow" /> Gucunga NYCODER</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-mono text-muted-foreground">Amabwiriza (system prompt)</label>
            <textarea
              rows={6}
              defaultValue={data.settings.system_prompt as string}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Urugero: Ba mugenzi w'umukoresha, subiza mu magambo make, uhereye ku ngero…"
              className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground">Ubushobozi bwo guhanga (0 – 1)</label>
              <input
                type="number" step="0.05" min={0} max={1}
                defaultValue={Number(data.settings.temperature ?? 0.2)}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">Urutonde rwa models (bitandukanyijwe na ,)</label>
              <input
                defaultValue={((data.settings.model_chain as string[] | null) ?? []).join(", ")}
                onChange={(e) => setChain(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              defaultChecked={Boolean(data.settings.self_improve)}
              onChange={(e) => setSelfImprove(e.target.checked)}
            />
            NYCODER yiyungura ubwenge (yibuka uburyo buri mukoresha akunda)
          </label>
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60"
          >
            {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {t.save}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-gradient-card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="size-4" /> Kwigisha NYCODER</h2>
        <p className="mt-1 text-xs text-muted-foreground">Andika ikibazo n'igisubizo cyiza — NYCODER izakurikiza ingero zawe.</p>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); addMut.mutate(); }}>
          <input
            value={ex.tag} onChange={(e) => setEx({ ...ex, tag: e.target.value })}
            placeholder="tag (urugero: python, html, logic)"
            className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
          />
          <textarea
            required rows={2} value={ex.prompt} onChange={(e) => setEx({ ...ex, prompt: e.target.value })}
            placeholder="Ikibazo cy'umukoresha"
            className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
          />
          <textarea
            required rows={4} value={ex.answer} onChange={(e) => setEx({ ...ex, answer: e.target.value })}
            placeholder="Igisubizo cyiza (uko NYCODER yagombye kusubiza)"
            className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
          />
          <button type="submit" disabled={addMut.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60">
            {addMut.isPending && <Loader2 className="size-4 animate-spin" />} {t.add}
          </button>
        </form>

        <div className="mt-5 space-y-2">
          {data.training.map((tr) => (
            <div key={tr.id as string} className="rounded-lg border border-border/60 bg-surface p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono rounded bg-primary/15 px-1.5 py-0.5 text-primary-glow">{tr.tag as string}</span>
                <button onClick={() => delMut.mutate(tr.id as string)} className="p-1 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="size-3.5" /></button>
              </div>
              <p className="mt-1.5 font-medium">{tr.prompt as string}</p>
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">{(tr.answer as string).slice(0, 300)}</p>
            </div>
          ))}
          {data.training.length === 0 && <p className="text-xs text-muted-foreground">Nta ngero z'imyitozo zirahari.</p>}
        </div>
      </section>
    </div>
  );
}

/* ============= Ubutumwa (Broadcast) ============= */

function BroadcastTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListBroadcasts);
  const saveFn = useServerFn(adminSaveBroadcast);
  const delFn = useServerFn(adminDeleteBroadcast);
  const { data: list } = useQuery({ queryKey: ["admin-broadcasts"], queryFn: () => listFn() });

  const [form, setForm] = useState({ title: "", message: "", videoUrl: "", active: true });
  const [uploading, setUploading] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => saveFn({ data: form }),
    onSuccess: () => { toast.success("Ubutumwa bwoherejwe"); setForm({ title: "", message: "", videoUrl: "", active: true }); qc.invalidateQueries({ queryKey: ["admin-broadcasts"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-broadcasts"] }),
  });

  async function uploadVideo(file: File) {
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `broadcasts/${Date.now()}-${safe}`;
      const { error } = await supabase.storage.from("course-videos").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("course-videos").getPublicUrl(path);
      setForm((f) => ({ ...f, videoUrl: data.publicUrl }));
      toast.success("Video yashyizweho");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Byanze");
    } finally { setUploading(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-xl border border-border bg-gradient-card p-6 max-w-2xl">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Megaphone className="size-4 text-primary-glow" /> Ohereza ubutumwa ku bakoresha bose</h2>
        <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); saveMut.mutate(); }}>
          <input
            required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Umutwe w'ubutumwa"
            className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm"
          />
          <textarea
            rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Ubutumwa (mu Kinyarwanda)"
            className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface text-xs cursor-pointer">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Shyiramo video
              <input type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadVideo(f); }} />
            </label>
            <input
              value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="cyangwa andika link ya video"
              className="flex-1 min-w-[200px] px-3 py-2 rounded-md bg-surface border border-border text-xs font-mono"
            />
          </div>
          <button type="submit" disabled={saveMut.isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60">
            {saveMut.isPending && <Loader2 className="size-4 animate-spin" />} Ohereza
          </button>
        </form>
      </section>

      <div className="space-y-2">
        {(list ?? []).map((b) => (
          <div key={b.id as string} className="rounded-lg border border-border bg-surface p-3 flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold text-sm">{b.title as string}</div>
              <p className="text-xs text-muted-foreground whitespace-pre-line">{b.message as string}</p>
              {b.video_url && <p className="text-[10px] font-mono text-primary-glow break-all">{b.video_url as string}</p>}
            </div>
            <button onClick={() => delMut.mutate(b.id as string)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============= Impapuro (page content) ============= */

function PagesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPages);
  const saveFn = useServerFn(adminSavePage);
  const { data: pages } = useQuery({ queryKey: ["admin-pages"], queryFn: () => listFn() });
  const saveMut = useMutation({
    mutationFn: (v: { slug: string; title: string; content: string }) => saveFn({ data: v }),
    onSuccess: () => { toast.success(t.admin_saved); qc.invalidateQueries({ queryKey: ["admin-pages"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin_failed),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <p className="text-xs text-muted-foreground">Hindura amagambo agaragara ku mpapuro z'urubuga.</p>
      {(pages ?? []).map((p) => (
        <PageEditor key={p.slug as string} page={p as { slug: string; title: string; content: string }} onSave={(v) => saveMut.mutate(v)} />
      ))}
    </div>
  );
}

function PageEditor({ page, onSave }: { page: { slug: string; title: string; content: string }; onSave: (v: { slug: string; title: string; content: string }) => void }) {
  const [v, setV] = useState({ slug: page.slug, title: page.title, content: page.content });
  return (
    <section className="rounded-xl border border-border bg-gradient-card p-5">
      <div className="text-xs font-mono text-primary-glow">/{page.slug}</div>
      <input
        value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })}
        className="mt-2 w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-semibold"
      />
      <textarea
        rows={4} value={v.content} onChange={(e) => setV({ ...v, content: e.target.value })}
        className="mt-2 w-full px-3 py-2 rounded-md bg-surface border border-border text-sm"
      />
      <button onClick={() => onSave(v)} className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs">
        <Save className="size-3.5" /> {t.save}
      </button>
    </section>
  );
}
