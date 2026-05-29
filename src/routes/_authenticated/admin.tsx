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
import { listAdminCourses } from "@/lib/courses.functions";
import { adminListCourseVideos, adminCreateCourseVideo, adminDeleteCourseVideo } from "@/lib/course-admin.functions";
import { Loader2, Trash2, ShieldCheck, UserPlus, CreditCard, Settings as SettingsIcon, Users, Receipt, CheckCircle2, XCircle, Clock, Pencil, Plus, Calendar, Search, Lock, Unlock, Video, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";

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

type Tab = "users" | "plans" | "settings" | "payments" | "courses";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center size-11 rounded-md bg-gradient-primary shadow-glow">
            <ShieldCheck className="size-5 text-primary-foreground" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Admin console</h1>
            <p className="text-sm text-muted-foreground font-mono">// NYCODEHUB management</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-6 border-b border-border">
          {([
            ["users", Users, "Users & access"],
            ["courses", Video, "Courses & videos"],
            ["payments", Receipt, "Payments"],
            ["plans", CreditCard, "Plans"],
            ["settings", SettingsIcon, "Payment settings"],
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
    onSuccess: () => { toast.success("User created"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { userId: id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const extendMut = useMutation({
    mutationFn: (v: { userId: string; days: number }) => extendFn({ data: v }),
    onSuccess: () => { toast.success("Extended"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const setExpiryMut = useMutation({
    mutationFn: (v: { userId: string; expiresAt: string | null }) => setExpiryFn({ data: v }),
    onSuccess: () => { toast.success("Expiry set"); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "learner" as "admin" | "instructor" | "learner", days: 30 });

  const active = (users ?? []).filter((u) => u.active);
  const inactive = (users ?? []).filter((u) => !u.active);

  return (
    <>
      <section className="rounded-xl border border-border bg-gradient-card p-6 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><UserPlus className="size-4" /> Create account</h2>
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
          <input required type="email" placeholder="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input required minLength={6} type="text" placeholder="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input type="text" placeholder="display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono">
            <option value="learner">learner</option>
            <option value="instructor">instructor</option>
            <option value="admin">admin</option>
          </select>
          <div className="flex gap-2">
            <input type="number" min={0} max={3650} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} className="w-20 px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" title="initial subscription days" />
            <button type="submit" disabled={createMut.isPending} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60">
              {createMut.isPending && <Loader2 className="size-4 animate-spin" />} Create
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-muted-foreground font-mono">days = initial subscription length (0 = no access until you extend)</p>
      </section>

      <div className="grid gap-4 mb-4 sm:grid-cols-3">
        <Stat label="Total users" value={users?.length ?? 0} />
        <Stat label="Active (paid)" value={active.length} tone="success" />
        <Stat label="Disabled (unpaid)" value={inactive.length} tone="destructive" />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> loading…</div>
      ) : (
        <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs font-mono text-muted-foreground bg-surface">
                <tr>
                  <th className="text-left p-3">email</th>
                  <th className="text-left p-3">roles</th>
                  <th className="text-left p-3">status</th>
                  <th className="text-left p-3">expires</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id} className="border-t border-border/40">
                    <td className="p-3 font-mono">{u.email}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{u.roles.join(", ") || "—"}</td>
                    <td className="p-3">
                      {u.is_admin ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary-glow">admin (always active)</span>
                      ) : u.active ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-success/20 text-success">active</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-destructive/20 text-destructive">disabled</span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {u.expires_at ? new Date(u.expires_at).toLocaleString() : "—"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ExtendButton onExtend={(days) => extendMut.mutate({ userId: u.id, days })} />
                        <button
                          onClick={() => {
                            const v = prompt("Set expiry date (YYYY-MM-DD) — empty to clear:", u.expires_at ? u.expires_at.slice(0,10) : "");
                            if (v === null) return;
                            const iso = v.trim() ? new Date(v).toISOString() : null;
                            setExpiryMut.mutate({ userId: u.id, expiresAt: iso });
                          }}
                          className="p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface rounded"
                          title="Set custom expiry"
                        ><Calendar className="size-3.5" /></button>
                        <button
                          onClick={() => { if (confirm(`Delete ${u.email}?`)) deleteMut.mutate(u.id); }}
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
        Extend
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 bg-surface-elevated border border-border rounded-md shadow-elevated p-1">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => { onExtend(d); setOpen(false); }} className="block w-full text-left px-3 py-1 text-xs hover:bg-surface rounded">
              +{d} days
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
    onSuccess: () => { toast.success("Done"); qc.invalidateQueries({ queryKey: ["admin-payments"] }); qc.invalidateQueries({ queryKey: ["admin-overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> loading…</div>;

  return (
    <div className="rounded-xl border border-border bg-gradient-card overflow-hidden">
      {(requests ?? []).length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No payment requests yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-muted-foreground bg-surface">
              <tr>
                <th className="text-left p-3">date</th>
                <th className="text-left p-3">user</th>
                <th className="text-left p-3">plan</th>
                <th className="text-left p-3">amount</th>
                <th className="text-left p-3">txn id</th>
                <th className="text-left p-3">status</th>
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
                    {r.status === "pending" && <span className="inline-flex items-center gap-1 text-chart-4 text-xs"><Clock className="size-3" /> pending</span>}
                    {r.status === "approved" && <span className="inline-flex items-center gap-1 text-success text-xs"><CheckCircle2 className="size-3" /> approved</span>}
                    {r.status === "rejected" && <span className="inline-flex items-center gap-1 text-destructive text-xs"><XCircle className="size-3" /> rejected</span>}
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => reviewMut.mutate({ requestId: r.id, action: "approve" })} className="px-2 py-1 text-xs rounded bg-success/20 text-success hover:bg-success/30">Approve</button>
                        <button onClick={() => reviewMut.mutate({ requestId: r.id, action: "reject" })} className="px-2 py-1 text-xs rounded bg-destructive/20 text-destructive hover:bg-destructive/30">Reject</button>
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
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin-plans"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-plans"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [draft, setDraft] = useState({ name: "", durationDays: 7, amountRwf: 2000, active: true, sortOrder: 99 });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> loading…</div>;

  return (
    <>
      <section className="rounded-xl border border-border bg-gradient-card p-6 mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="size-4" /> Add plan</h2>
        <form
          className="mt-4 grid sm:grid-cols-5 gap-3"
          onSubmit={(e) => { e.preventDefault(); upsertMut.mutate(draft, { onSuccess: () => setDraft({ name: "", durationDays: 7, amountRwf: 2000, active: true, sortOrder: 99 }) }); }}
        >
          <input required placeholder="name (e.g. Monthly)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input required type="number" min={1} placeholder="days" value={draft.durationDays} onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input required type="number" min={0} placeholder="amount RWF" value={draft.amountRwf} onChange={(e) => setDraft({ ...draft, amountRwf: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <input type="number" placeholder="sort" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono" />
          <button type="submit" disabled={upsertMut.isPending} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60">
            {upsertMut.isPending && <Loader2 className="size-4 animate-spin" />} Add
          </button>
        </form>
      </section>

      <div className="space-y-2">
        {(plans ?? []).map((p) => (
          <PlanRow key={p.id} plan={p} onSave={(v) => upsertMut.mutate({ id: p.id, ...v })} onDelete={() => { if (confirm(`Delete ${p.name}?`)) deleteMut.mutate(p.id); }} />
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
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> active</label>
          <input type="number" value={v.sortOrder} onChange={(e) => setV({ ...v, sortOrder: Number(e.target.value) })} className="px-2 py-1.5 rounded bg-surface border border-border text-sm font-mono" />
          <div className="flex gap-1 justify-end">
            <button onClick={() => { onSave(v); setEdit(false); }} className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground">Save</button>
            <button onClick={() => setEdit(false)} className="px-3 py-1.5 text-xs rounded bg-surface">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="font-semibold">{plan.name}</div>
          <div className="font-mono text-sm">{plan.duration_days} days</div>
          <div className="font-mono text-sm">{plan.amount_rwf.toLocaleString()} RWF</div>
          <div className={plan.active ? "text-success text-xs" : "text-muted-foreground text-xs"}>{plan.active ? "active" : "inactive"}</div>
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
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["payment-page"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> loading…</div>;
  if (!data) return null;

  return (
    <section className="rounded-xl border border-border bg-gradient-card p-6 max-w-2xl">
      <h2 className="text-lg font-semibold">Payment page content</h2>
      <p className="text-xs text-muted-foreground font-mono mt-1">// what users see on /payment</p>
      <form className="mt-5 space-y-4" onSubmit={(e) => { e.preventDefault(); updateMut.mutate(); }}>
        <div>
          <label className="text-xs font-mono text-muted-foreground">mobile money code</label>
          <input
            defaultValue={data.settings.mobile_code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md bg-surface border border-border font-mono text-xl tracking-widest"
          />
        </div>
        <div>
          <label className="text-xs font-mono text-muted-foreground">instructions shown to users</label>
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
          {updateMut.isPending && <Loader2 className="size-4 animate-spin" />} Save settings
        </button>
      </form>
    </section>
  );
}
