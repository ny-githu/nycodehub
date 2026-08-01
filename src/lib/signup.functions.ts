import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extendAccess } from "./access.server";

/** Public: everything the create-account page needs (MoMo code + plans). */
export const getSignupInfo = createServerFn({ method: "GET" }).handler(async () => {
  const [{ data: settings }, { data: plans }] = await Promise.all([
    supabaseAdmin.from("payment_settings").select("mobile_code, instructions").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("payment_plans").select("id, name, duration_days, amount_rwf").eq("active", true).order("sort_order"),
  ]);
  return {
    settings: settings ?? { mobile_code: "1940525", instructions: "" },
    plans: plans ?? [],
  };
});

/**
 * Public: create an account together with a payment claim.
 * If the transaction ID already matches a MoMo SMS the admin received,
 * access is granted immediately; otherwise it waits for admin approval.
 */
export const createAccountWithPayment = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72),
        displayName: z.string().trim().min(1).max(80),
        planId: z.string().uuid(),
        transactionId: z.string().trim().min(3).max(100),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { data: plan } = await supabaseAdmin
      .from("payment_plans").select("*").eq("id", data.planId).maybeSingle();
    if (!plan) throw new Error("Uburyo bwo kwishyura ntibwabonetse.");

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Konti ntiyashoboye kuremwa.";
      throw new Error(/already/i.test(msg) ? "Iyi email isanzwe ifite konti. Injira." : msg);
    }
    const userId = created.user.id;

    const txn = data.transactionId.trim();
    const { data: request, error: reqErr } = await supabaseAdmin
      .from("payment_requests")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        transaction_id: txn,
        amount_rwf: plan.amount_rwf,
        note: "Yiyandikishije ku rupapuro rwo kwiyandikisha",
      })
      .select("id")
      .maybeSingle();
    if (reqErr) throw new Error(reqErr.message);

    // Try to auto-match the transaction against MoMo messages already received.
    const { data: sms } = await supabaseAdmin
      .from("momo_sms")
      .select("id, amount_rwf, transaction_id")
      .eq("status", "pending")
      .ilike("transaction_id", txn)
      .limit(1);
    const match = sms?.[0];

    if (match && request) {
      await extendAccess(userId, plan.duration_days);
      await supabaseAdmin
        .from("payment_requests")
        .update({ status: "approved", reviewed_at: new Date().toISOString(), note: "Yemejwe n'ubwikorezi (MoMo SMS)" })
        .eq("id", request.id);
      await supabaseAdmin
        .from("momo_sms")
        .update({ status: "confirmed", linked_request_id: request.id })
        .eq("id", match.id);
      return { ok: true, autoApproved: true, plan: plan.name };
    }

    return { ok: true, autoApproved: false, plan: plan.name };
  });
