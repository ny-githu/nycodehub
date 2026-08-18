import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(6).max(72),
        displayName: z.string().min(1).max(80).optional(),
        role: z.enum(["admin", "instructor", "learner"]).default("learner"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName ?? data.email.split("@")[0] },
    });
    if (error) throw new Error(error.message);

    if (data.role !== "learner" && created.user) {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    }

    return { id: created.user?.id, email: created.user?.email };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), disabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot disable yourself");
    const { error } = await supabaseAdmin.from("profiles").update({ disabled: data.disabled }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** All users with their roles — free platform, no expiry or plans. */
export const adminUsersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const [{ data: roles }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, disabled"),
    ]);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = roleMap.get(r.user_id as string) ?? [];
      arr.push(r.role as string);
      roleMap.set(r.user_id as string, arr);
    }
    const disabledMap = new Map((profiles ?? []).map((p) => [p.id as string, !!p.disabled]));
    return list.users.map((u) => {
      const userRoles = roleMap.get(u.id) ?? [];
      const disabled = disabledMap.get(u.id) ?? false;
      return {
        id: u.id,
        email: u.email ?? "",
        created_at: u.created_at,
        roles: userRoles,
        is_admin: userRoles.includes("admin"),
        disabled,
        active: !disabled,
      };
    });
  });
