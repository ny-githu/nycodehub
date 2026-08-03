import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

/* ---------------- NYCODER control ---------------- */

export const adminGetNycoder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [{ data: settings }, { data: training }, { data: memory }] = await Promise.all([
      supabaseAdmin.from("nycoder_settings").select("*").eq("id", 1).maybeSingle(),
      supabaseAdmin.from("nycoder_training").select("*").order("created_at", { ascending: false }).limit(100),
      supabaseAdmin.from("nycoder_memory").select("user_id, turns, updated_at").order("updated_at", { ascending: false }).limit(50),
    ]);
    return {
      settings: settings ?? { system_prompt: "", temperature: 0.2, model_chain: [], self_improve: true },
      training: training ?? [],
      memoryCount: (memory ?? []).length,
      totalTurns: (memory ?? []).reduce((s, m) => s + ((m.turns as number | null) ?? 0), 0),
    };
  });

export const adminSaveNycoder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      systemPrompt: z.string().max(8000).default(""),
      temperature: z.number().min(0).max(1).default(0.2),
      modelChain: z.array(z.string().min(1).max(120)).max(8).default([]),
      selfImprove: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("nycoder_settings").update({
      system_prompt: data.systemPrompt,
      temperature: data.temperature,
      model_chain: data.modelChain,
      self_improve: data.selfImprove,
    }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAddTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      tag: z.string().max(60).default("general"),
      prompt: z.string().min(1).max(4000),
      answer: z.string().min(1).max(8000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("nycoder_training").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTraining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("nycoder_training").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------------- Analytics ---------------- */

export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = Date.now();
    const week = new Date(now - 7 * 864e5).toISOString();
    const month = new Date(now - 30 * 864e5).toISOString();

    const [{ data: profiles }, { data: requests }, { data: sms }, { data: memory }, { data: plans }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, created_at, expires_at, disabled"),
      supabaseAdmin.from("payment_requests").select("status, amount_rwf, created_at"),
      supabaseAdmin.from("momo_sms").select("id, amount_rwf, status, received_at"),
      supabaseAdmin.from("nycoder_memory").select("user_id, turns, updated_at"),
      supabaseAdmin.from("payment_plans").select("id, name, active"),
    ]);

    const users = profiles ?? [];
    const reqs = requests ?? [];
    const activeUsers = users.filter((u) => !u.disabled && u.expires_at && new Date(u.expires_at as string) > new Date());
    const approved = reqs.filter((r) => r.status === "approved");

    return {
      users: {
        total: users.length,
        active: activeUsers.length,
        expired: users.length - activeUsers.length,
        newThisWeek: users.filter((u) => (u.created_at as string) >= week).length,
        newThisMonth: users.filter((u) => (u.created_at as string) >= month).length,
      },
      payments: {
        pending: reqs.filter((r) => r.status === "pending").length,
        approved: approved.length,
        rejected: reqs.filter((r) => r.status === "rejected").length,
        revenueRwf: approved.reduce((s, r) => s + ((r.amount_rwf as number | null) ?? 0), 0),
        revenueThisMonthRwf: approved
          .filter((r) => (r.created_at as string) >= month)
          .reduce((s, r) => s + ((r.amount_rwf as number | null) ?? 0), 0),
      },
      momo: {
        total: (sms ?? []).length,
        unmatched: (sms ?? []).filter((s) => s.status === "pending").length,
      },
      nycoder: {
        learners: (memory ?? []).length,
        turns: (memory ?? []).reduce((s, m) => s + ((m.turns as number | null) ?? 0), 0),
        activeThisWeek: (memory ?? []).filter((m) => (m.updated_at as string) >= week).length,
      },
      plans: (plans ?? []).length,
    };
  });

/* ---------------- Broadcasts ---------------- */

export const listBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("broadcasts").select("*").eq("active", true).order("created_at", { ascending: false }).limit(5);
    return data ?? [];
  });

export const adminListBroadcasts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("broadcasts").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminSaveBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      title: z.string().min(1).max(200),
      message: z.string().max(4000).default(""),
      videoUrl: z.string().max(600).default(""),
      active: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("broadcasts").insert({
      title: data.title,
      message: data.message,
      video_url: data.videoUrl || null,
      active: data.active,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("broadcasts").delete().eq("id", data.id);
    return { ok: true };
  });

/* ---------------- Editable pages ---------------- */

export const getSitePage = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ slug: z.string().min(1).max(60) }).parse(i))
  .handler(async ({ data }) => {
    const { data: page } = await supabaseAdmin
      .from("site_pages").select("slug, title, content").eq("slug", data.slug).maybeSingle();
    return page ?? null;
  });

export const adminListPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("site_pages").select("*").order("slug");
    return data ?? [];
  });

export const adminSavePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      slug: z.string().min(1).max(60),
      title: z.string().max(200).default(""),
      content: z.string().max(20_000).default(""),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("site_pages").upsert({
      slug: data.slug,
      title: data.title,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
