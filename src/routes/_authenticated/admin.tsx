import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateUser, adminListUsers, adminDeleteUser } from "@/lib/admin.functions";
import { Loader2, Trash2, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login" });
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Admin — byteforge" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListUsers);
  const createFn = useServerFn(adminCreateUser);
  const deleteFn = useServerFn(adminDeleteUser);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
  });

  const createMut = useMutation({
    mutationFn: (vars: { email: string; password: string; displayName: string; role: "admin" | "instructor" | "learner" }) =>
      createFn({ data: vars }),
    onSuccess: () => {
      toast.success("User created");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (userId: string) => deleteFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [form, setForm] = useState({ email: "", password: "", displayName: "", role: "learner" as const });

  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <span className="grid place-items-center size-10 rounded-md bg-gradient-primary shadow-glow">
            <ShieldCheck className="size-5 text-primary-foreground" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Admin console</h1>
            <p className="text-sm text-muted-foreground font-mono">// manage accounts on byteforge</p>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-border bg-gradient-card p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="size-4" /> Create account
          </h2>
          <form
            className="mt-4 grid sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate(form, {
                onSuccess: () => setForm({ email: "", password: "", displayName: "", role: "learner" }),
              });
            }}
          >
            <input
              required
              type="email"
              placeholder="email@domain.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
            />
            <input
              required
              minLength={6}
              type="text"
              placeholder="temporary password (min 6)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
            />
            <input
              type="text"
              placeholder="display name (optional)"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
              className="px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono"
            >
              <option value="learner">learner</option>
              <option value="instructor">instructor</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-gradient-primary text-primary-foreground font-medium shadow-glow disabled:opacity-60"
            >
              {createMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Create user
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-xl border border-border bg-gradient-card p-6">
          <h2 className="text-lg font-semibold">Users</h2>
          {isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> loading…</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-mono text-muted-foreground border-b border-border">
                    <th className="py-2">email</th>
                    <th className="py-2">roles</th>
                    <th className="py-2">last sign-in</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map((u) => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="py-2 font-mono">{u.email}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{u.roles.join(", ") || "—"}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "never"}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${u.email}?`)) deleteMut.mutate(u.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="size-3" /> delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
