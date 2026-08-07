import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  text: z.string().optional(),
  message: z.string().optional(),
  body: z.string().optional(),
  sms: z.string().optional(),
  subject: z.string().optional(),
  sender: z.string().optional(),
  from: z.string().optional(),
  address: z.string().optional(),
  received_at: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
}).passthrough();

function parseTransactionId(text: string): string | null {
  const patterns = [
    /(?:TxId|Transaction\s*Id|Financial\s*Transaction\s*Id|Ref)\s*[:#]?\s*([A-Za-z0-9]{6,30})/i,
    /\b(\d{8,20})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function parseAmount(text: string): number | null {
  const match = text.match(/([\d,.]{2,15})\s*RWF/i) ?? text.match(/RWF\s*([\d,.]{2,15})/i);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(/[,\s]/g, "").replace(/\.\d{2}$/, ""));
  return Number.isFinite(value) ? Math.round(value) : null;
}

function parsePayer(text: string): string | null {
  const match = text.match(/from\s+([A-Za-z' -]{3,40})/i) ?? text.match(/kuri\s+([A-Za-z' -]{3,40})/i);
  return match?.[1]?.trim() ?? null;
}

export const Route = createFileRoute("/api/public/momo-sms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["MOMO_SMS_TOKEN"];
        const url = new URL(request.url);
        const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const provided = request.headers.get("x-momo-token") ?? bearer ?? url.searchParams.get("token") ?? "";
        if (!token || provided !== token) {
          return Response.json({ ok: false, error: "Unauthorized: x-momo-token ntabwo ihuye" }, { status: 401 });
        }

        let raw: unknown;
        try {
          const contentType = request.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) raw = await request.json();
          else if (contentType.includes("form")) raw = Object.fromEntries((await request.formData()).entries());
          else raw = { text: await request.text() };
        } catch {
          return Response.json({ ok: false, error: "Ubutumwa ntibusomeka" }, { status: 400 });
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) return Response.json({ ok: false, error: "Payload ntiyumvikana" }, { status: 400 });
        const text = [parsed.data.text, parsed.data.message, parsed.data.body, parsed.data.sms, parsed.data.subject]
          .find((value) => typeof value === "string" && value.trim().length >= 3)?.trim();
        if (!text) return Response.json({ ok: false, error: "Shyiramo SMS muri text, message, body cyangwa sms" }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const transactionId = parseTransactionId(text);
        const row = {
          raw_text: text,
          transaction_id: transactionId,
          amount_rwf: parseAmount(text),
          sender: parsed.data.sender ?? parsed.data.from ?? parsed.data.address ?? null,
          payer_name: parsePayer(text),
          received_at: parsed.data.received_at ?? (parsed.data.timestamp
            ? new Date(typeof parsed.data.timestamp === "number" && parsed.data.timestamp < 10_000_000_000 ? parsed.data.timestamp * 1000 : parsed.data.timestamp).toISOString()
            : new Date().toISOString()),
        };

        let saved: { id: string } | null = null;
        const { data: inserted, error } = await supabaseAdmin.from("momo_sms").insert(row).select("id").maybeSingle();
        saved = inserted;
        if (error && /duplicate|unique/i.test(error.message) && transactionId) {
          const { data: existing } = await supabaseAdmin.from("momo_sms").select("id").ilike("transaction_id", transactionId).maybeSingle();
          saved = existing;
        } else if (error) {
          console.error("MoMo SMS save failed", error.message);
          return Response.json({ ok: false, error: "Ubutumwa ntibwashoboye kubikwa" }, { status: 500 });
        }
        let matched = false;
        if (transactionId) {
          const { data: claims } = await supabaseAdmin.from("payment_requests").select("id,user_id,plan_id").eq("status", "pending").ilike("transaction_id", transactionId).limit(1);
          const claim = claims?.[0];
          if (claim) {
            const [{ data: plan }, { data: profile }] = await Promise.all([
              supabaseAdmin.from("payment_plans").select("duration_days").eq("id", claim.plan_id).maybeSingle(),
              supabaseAdmin.from("profiles").select("expires_at").eq("id", claim.user_id).maybeSingle(),
            ]);
            const base = profile?.expires_at && new Date(profile.expires_at) > new Date() ? new Date(profile.expires_at) : new Date();
            base.setDate(base.getDate() + (plan?.duration_days ?? 0));
            await Promise.all([
              supabaseAdmin.from("profiles").update({ expires_at: base.toISOString(), disabled: false }).eq("id", claim.user_id),
              supabaseAdmin.from("payment_requests").update({ status: "approved", reviewed_at: new Date().toISOString(), note: "Yemejwe na MoMo SMS" }).eq("id", claim.id),
              saved?.id ? supabaseAdmin.from("momo_sms").update({ status: "confirmed", linked_request_id: claim.id }).eq("id", saved.id) : Promise.resolve(),
            ]);
            matched = true;
          }
        }
        return Response.json({ ok: true, transaction_id: transactionId, amount_rwf: row.amount_rwf, matched });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
