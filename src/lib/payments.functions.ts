import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

// ---------- Public-ish (authenticated user) ----------

export const getPaymentPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: settings }, { data: plans }, { data: profile }, { data: myRequests }] = await Promise.all([
      supabaseAdmin.from("payment_settings").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("payment_plans").select("*").eq("active", true).order("sort_order"),
      supabaseAdmin.from("profiles").select("expires_at").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.from("payment_requests").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      settings: settings ?? { mobile_code: "1940525", instructions: "" },
      plans: plans ?? [],
      expiresAt: (profile?.expires_at as string | null) ?? null,
      myRequests: myRequests ?? [],
    };
  });

export const submitPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    planId: z.string().uuid(),
    transactionId: z.string().min(3).max(100),
    note: z.string().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: plan } = await supabaseAdmin.from("payment_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan) throw new Error("Plan not found");
    const { error } = await supabaseAdmin.from("payment_requests").insert({
      user_id: context.userId,
      plan_id: plan.id,
      transaction_id: data.transactionId.trim(),
      amount_rwf: plan.amount_rwf,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: settings ----------

export const adminUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    mobileCode: z.string().min(1).max(50),
    instructions: z.string().min(1).max(2000),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("payment_settings").upsert({
      id: 1, mobile_code: data.mobileCode, instructions: data.instructions, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: plans CRUD ----------

export const adminListPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("payment_plans").select("*").order("sort_order");
    return data ?? [];
  });

export const adminUpsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(80),
    durationDays: z.number().int().min(1).max(3650),
    amountRwf: z.number().int().min(0).max(10_000_000),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const row = {
      name: data.name, duration_days: data.durationDays, amount_rwf: data.amountRwf,
      active: data.active, sort_order: data.sortOrder, updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await supabaseAdmin.from("payment_plans").update(row).eq("id", data.id)
      : await supabaseAdmin.from("payment_plans").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("payment_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: user expiry ----------

export const adminSetUserExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    // ISO date string or null
    expiresAt: z.string().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({ expires_at: data.expiresAt }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminExtendUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    userId: z.string().uuid(),
    days: z.number().int().min(1).max(3650),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: profile } = await supabaseAdmin.from("profiles").select("expires_at").eq("id", data.userId).maybeSingle();
    const current = profile?.expires_at ? new Date(profile.expires_at as string) : new Date();
    const base = current > new Date() ? current : new Date();
    base.setDate(base.getDate() + data.days);
    const { error } = await supabaseAdmin.from("profiles").update({ expires_at: base.toISOString() }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { expiresAt: base.toISOString() };
  });

// ---------- Admin: payment requests ----------

export const adminListPaymentRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: reqs } = await supabaseAdmin
      .from("payment_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (!reqs) return [];
    const userIds = Array.from(new Set(reqs.map((r) => r.user_id)));
    const planIds = Array.from(new Set(reqs.map((r) => r.plan_id)));
    const [{ data: users }, { data: plans }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
      supabaseAdmin.from("payment_plans").select("id,name,duration_days").in("id", planIds),
    ]);
    const uMap = new Map(users?.users.filter((u) => userIds.includes(u.id)).map((u) => [u.id, u.email]));
    const pMap = new Map((plans ?? []).map((p) => [p.id, p]));
    return reqs.map((r) => ({
      ...r,
      email: uMap.get(r.user_id) ?? "(unknown)",
      plan_name: pMap.get(r.plan_id)?.name ?? "—",
      plan_days: pMap.get(r.plan_id)?.duration_days ?? 0,
    }));
  });

export const adminReviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    requestId: z.string().uuid(),
    action: z.enum(["approve", "reject"]),
    note: z.string().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: req } = await supabaseAdmin.from("payment_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) throw new Error("Request not found");
    if (req.status !== "pending") throw new Error("Already reviewed");

    if (data.action === "approve") {
      const { data: plan } = await supabaseAdmin.from("payment_plans").select("duration_days").eq("id", req.plan_id).maybeSingle();
      const days = plan?.duration_days ?? 0;
      const { data: profile } = await supabaseAdmin.from("profiles").select("expires_at").eq("id", req.user_id).maybeSingle();
      const current = profile?.expires_at ? new Date(profile.expires_at as string) : new Date();
      const base = current > new Date() ? current : new Date();
      base.setDate(base.getDate() + days);
      await supabaseAdmin.from("profiles").update({ expires_at: base.toISOString() }).eq("id", req.user_id);
    }
    const { error } = await supabaseAdmin.from("payment_requests").update({
      status: data.action === "approve" ? "approved" : "rejected",
      note: data.note ?? null,
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", data.requestId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: paid/unpaid overview ----------

export const adminUsersOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    const ids = users?.users.map((u) => u.id) ?? [];
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, expires_at, disabled").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    const pMap = new Map((profiles ?? []).map((p) => [p.id, { expires_at: p.expires_at as string | null, disabled: !!p.disabled }]));
    const rMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rMap.get(r.user_id) ?? [];
      arr.push(r.role);
      rMap.set(r.user_id, arr);
    });
    const now = new Date();
    return (users?.users ?? []).map((u) => {
      const prof = pMap.get(u.id) ?? { expires_at: null, disabled: false };
      const isAdmin = (rMap.get(u.id) ?? []).includes("admin");
      const active = isAdmin || (!prof.disabled && !!prof.expires_at && new Date(prof.expires_at) > now);
      return {
        id: u.id, email: u.email, created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: rMap.get(u.id) ?? [],
        expires_at: prof.expires_at,
        disabled: prof.disabled,
        active, is_admin: isAdmin,
      };
    });
  });

