import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BodySchema = z.object({
  text: z.string().min(3).max(2000),
  sender: z.string().max(60).optional(),
  received_at: z.string().max(60).optional(),
});

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
        const provided = request.headers.get("x-momo-token") ?? "";
        if (!token || provided !== token) {
          return new Response("Unauthorized", { status: 401 });
        }

        let parsed: z.infer<typeof BodySchema>;
        try {
          parsed = BodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid body" }, { status: 400 });
        }

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false } },
        );

        const transactionId = parseTransactionId(parsed.text);
        const row = {
          raw_text: parsed.text,
          transaction_id: transactionId,
          amount_rwf: parseAmount(parsed.text),
          sender: parsed.sender ?? null,
          payer_name: parsePayer(parsed.text),
          received_at: parsed.received_at ?? new Date().toISOString(),
        };

        const { error } = await supabase.from("momo_sms").upsert(row, { onConflict: "transaction_id", ignoreDuplicates: true });
        if (error && !/duplicate/i.test(error.message)) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true, transaction_id: transactionId, amount_rwf: row.amount_rwf });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
