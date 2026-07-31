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
import { listAdminCourses } from "@/lib/courses.functions";
import { adminListCourseVideos, adminCreateCourseVideo, adminDeleteCourseVideo } from "@/lib/course-admin.functions";
import { Loader2, Trash2, ShieldCheck, UserPlus, CreditCard, Settings as SettingsIcon, Users, Receipt, CheckCircle2, XCircle, Clock, Pencil, Plus, Calendar, Search, Lock, Unlock, Video, Upload, Link2, PlayCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login" });
    const { data: role } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Admin — NYCODEHUB" }] }),
  component: AdminPage,
});

type Tab = "users" | "plans" | "settings" | "payments" | "courses" | "momo";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
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

        <div className="flex flex-wrap gap-1 mb-6 border-b border-border">
          {([
            ["users", Users, t.admin_tab_users],
            ["courses", Video, t.admin_tab_courses],
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
            </button>
          ))}
        </div>

        {tab === "users" && <UsersTab />}
        {tab === "courses" && <CoursesTab />}
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

// ============= Courses & Videos =============

function CoursesTab() {
  const listFn = useServerFn(listAdminCourses);
  const { data: courses } = useQuery({ queryKey: ["admin-courses"], queryFn: () => listFn() });
  const [selected, setSelected] = useState<string | null>(null);
  const current = (courses ?? []).find((c) => c.id === selected) ?? courses?.[0];

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4">
      <aside className="rounded-xl border border-border bg-gradient-card p-3 max-h-[70vh] overflow-y-auto">
        <h3 className="text-xs font-mono text-muted-foreground mb-2">{t.nav_courses}</h3>
        <div className="space-y-1">
          {(courses ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`w-full text-left px-2 py-2 text-sm rounded transition ${
                (current?.id === c.id) ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-surface"
              }`}
            >
              <div className="font-semibold">{c.title}</div>
              <div className="text-[10px] font-mono opacity-70">{c.track ?? "General"}</div>
            </button>
          ))}
        </div>
      </aside>
      {current ? <VideosPanel courseId={current.id} title={current.title} /> : <div className="text-sm text-muted-foreground">{t.admin_courses_select}</div>}
    </div>
  );
}

function VideosPanel({ courseId, title }: { courseId: string; title: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCourseVideos);
  const createFn = useServerFn(adminCreateCourseVideo);
  const deleteFn = useServerFn(adminDeleteCourseVideo);
  const { data: videos, isLoading } = useQuery({ queryKey: ["admin-course-videos", courseId], queryFn: () => listFn({ data: { courseId } }) });

  const [mode, setMode] = useState<"url" | "upload">("url");
  const [form, setForm] = useState({ topic: "Intro", title: "", description: "", videoUrl: "", sortOrder: 0 });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const createMut = useMutation({
    mutationFn: (v: { topic: string; title: string; description: string; videoUrl?: string; storagePath?: string; sortOrder: number }) =>
      createFn({ data: { courseId, ...v } }),
    onSuccess: () => {
      toast.success("Video added");
      qc.invalidateQueries({ queryKey: ["admin-course-videos", courseId] });
      setForm({ topic: form.topic, title: "", description: "", videoUrl: "", sortOrder: form.sortOrder + 1 });
      setFile(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-course-videos", courseId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title) { toast.error("Title required"); return; }
    if (mode === "url") {
      if (!form.videoUrl) { toast.error("URL required"); return; }
      createMut.mutate({ ...form });
    } else {
      if (!file) { toast.error("Pick a file"); return; }
      setUploading(true);
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${courseId}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("course-videos").upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw error;
        createMut.mutate({ ...form, storagePath: path });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      } finally { setUploading(false); }
    }
  }

  return (
    <div className="animate-fade-in">
      <section className="rounded-xl border border-border bg-gradient-card p-5 mb-4">
        <h2 className="text-base font-semibold flex items-center gap-2"><Video className="size-4 text-primary-glow" /> {title} — {t.admin_videos_add}</h2>
        <div className="mt-3 inline-flex rounded-md border border-border bg-surface overflow-hidden text-xs">
          <button type="button" onClick={() => setMode("url")} className={`px-3 py-1.5 inline-flex items-center gap-1 ${mode === "url" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <Link2 className="size-3" /> {t.admin_videos_url_tab}
          </button>
          <button type="button" onClick={() => setMode("upload")} className={`px-3 py-1.5 inline-flex items-center gap-1 ${mode === "upload" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <Upload className="size-3" /> {t.admin_videos_upload}
          </button>
        </div>
        <form onSubmit={submit} className="mt-3 grid sm:grid-cols-2 gap-3">
          <input required placeholder={t.admin_videos_topic} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="px-3 py-2 rounded bg-surface border border-border text-sm" />
          <input required placeholder={t.admin_videos_title} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded bg-surface border border-border text-sm" />
          {mode === "url" ? (
            <input required type="url" placeholder={t.admin_videos_url_placeholder} value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} className="px-3 py-2 rounded bg-surface border border-border text-sm sm:col-span-2 font-mono" />
          ) : (
            <input required type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="px-3 py-2 rounded bg-surface border border-border text-sm sm:col-span-2" />
          )}
          <textarea placeholder={t.admin_videos_desc} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="px-3 py-2 rounded bg-surface border border-border text-sm sm:col-span-2" />
          <input type="number" placeholder={t.admin_videos_sort} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="px-3 py-2 rounded bg-surface border border-border text-sm" />
          <button type="submit" disabled={uploading || createMut.isPending} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow disabled:opacity-60 hover-scale animated-gradient">
            {(uploading || createMut.isPending) && <Loader2 className="size-4 animate-spin" />} {t.admin_videos_submit}
          </button>
        </form>
      </section>

      {isLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t.loading}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(videos ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-lg text-center sm:col-span-2 lg:col-span-3">{t.admin_videos_none}</p>
          ) : (
            (videos ?? []).map((v) => {
              const url = v.video_url ?? (v.storage_path ? supabase.storage.from("course-videos").getPublicUrl(v.storage_path).data.publicUrl : null);
              const yt = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
              return (
                <div key={v.id} className="rounded-lg border border-border bg-gradient-card overflow-hidden animate-scale-in hover-scale">
                  <div className="aspect-video bg-black grid place-items-center relative">
                    {yt ? (
                      <img src={`https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`} alt={v.title} className="w-full h-full object-cover" />
                    ) : url ? (
                      <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <PlayCircle className="size-10 text-muted-foreground" />
                    )}
                    <PlayCircle className="absolute size-10 text-white/80 pointer-events-none" />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface text-primary-glow">{v.topic}</span>
                      <span className="text-[10px] font-mono text-muted-foreground ml-auto">#{v.sort_order}</span>
                    </div>
                    <div className="mt-1.5 font-medium text-sm line-clamp-1">{v.title}</div>
                    <div className="mt-0.5 text-[10px] font-mono text-muted-foreground truncate">{url ?? "—"}</div>
                    <div className="mt-2 flex gap-1">
                      {url && <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-center px-2 py-1 text-xs rounded bg-surface hover:bg-surface-elevated">Reba</a>}
                      <button onClick={() => { if (confirm(t.admin_videos_confirm_delete)) deleteMut.mutate(v.id); }} className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
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
        <p className="text-xs text-muted-foreground mb-3">
          Shyira SMS forwarder kuri telefoni yawe, itume ubutumwa bwa MTN MoMo kuri:
          <code className="mx-1 rounded bg-background px-1 py-0.5 font-mono">POST /api/public/momo-sms</code>
          ifite header <code className="rounded bg-background px-1 py-0.5 font-mono">x-momo-token</code> na body
          <code className="mx-1 rounded bg-background px-1 py-0.5 font-mono">{"{ \"text\": \"<SMS>\" }"}</code>.
          Sisitemu ikuramo transaction ID n'amafaranga, hanyuma iyishyira kuri urutonde rutegereje kwemezwa.
        </p>
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
