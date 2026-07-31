import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
  return supabaseAdmin;
}

export const adminListMomoSms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await admin(context.userId);
    const [{ data: sms }, { data: requests }] = await Promise.all([
      supabaseAdmin.from("momo_sms").select("*").order("received_at", { ascending: false }).limit(100),
      supabaseAdmin.from("payment_requests").select("id, transaction_id, status, user_id, amount_rwf").limit(300),
    ]);
    const byTx = new Map((requests ?? []).map((r) => [String(r.transaction_id).trim().toLowerCase(), r]));
    return (sms ?? []).map((m) => {
      const match = m.transaction_id ? byTx.get(String(m.transaction_id).trim().toLowerCase()) : undefined;
      return {
        ...m,
        matched_request_id: match?.id ?? null,
        matched_request_status: match?.status ?? null,
      };
    });
  });

export const adminUpdateMomoSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "confirmed", "dismissed"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await admin(context.userId);
    const { error } = await supabaseAdmin.from("momo_sms").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAddMomoSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ text: z.string().min(3).max(2000) }).parse(i))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await admin(context.userId);
    const tx = data.text.match(/(?:TxId|Transaction\s*Id|Ref)\s*[:#]?\s*([A-Za-z0-9]{6,30})/i)?.[1]
      ?? data.text.match(/\b(\d{8,20})\b/)?.[1] ?? null;
    const amountRaw = data.text.match(/([\d,.]{2,15})\s*RWF/i)?.[1] ?? data.text.match(/RWF\s*([\d,.]{2,15})/i)?.[1];
    const amount = amountRaw ? Math.round(Number(amountRaw.replace(/[,\s]/g, ""))) : null;
    const { error } = await supabaseAdmin.from("momo_sms").insert({
      raw_text: data.text,
      transaction_id: tx,
      amount_rwf: Number.isFinite(amount as number) ? amount : null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
