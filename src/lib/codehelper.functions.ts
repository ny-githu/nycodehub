import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { callAIWithFallback, FAST_CHAIN } from "./ai-call.server";

async function callAI(body: Record<string, unknown>) {
  const content = await callAIWithFallback(FAST_CHAIN, body);
  return { choices: [{ message: { content } }] };
}

export const askCodeHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      language: z.string().min(1).max(40),
      code: z.string().max(30_000),
      question: z.string().min(1).max(1000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const j = await callAI({
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Uri NYCODER, AI isesengura kandi ikosora code. Subiza MU KINYARWANDA, mu magambo make. " +
            "Iyo werekana ikibazo, vuga izina rya dosiye n'umurongo (urugero: app.js:12). " +
            "Ntugasubiremo code yose — erekana gusa umurongo ukwiye guhindurwa.",
        },
        {
          role: "user",
          content: `Ururimi: ${data.language}\n\nUmushinga:\n${data.code || "(nta code)"}\n\nIkibazo: ${data.question}`,
        },
      ],
    });
    return { answer: j.choices?.[0]?.message?.content ?? "(nta gisubizo)" };
  });

const FindingSchema = z.object({
  file: z.string().default(""),
  line: z.number().int().min(1).default(1),
  severity: z.enum(["error", "warning", "info"]).default("info"),
  message: z.string().default(""),
  fix: z.string().default(""),
});

export type Finding = z.infer<typeof FindingSchema>;

const ReportSchema = z.object({
  logic: z.string().default(""),
  summary: z.string().default(""),
  findings: z.array(FindingSchema).default([]),
});

export const analyzeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      language: z.string().min(1).max(40),
      code: z.string().max(60_000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const j = await callAI({
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Uri NYCODER: AI isesengura code nk'umuhanga wa debugging. Wakira umushinga ufite dosiye nyinshi; " +
            "buri dosiye itangirwa na '### DOSIYE: <izina>' hanyuma imirongo yayo ibarwa uhereye kuri 1.\n" +
            "Subiza JSON GUSA ifite iyi miterere:\n" +
            '{"logic":"...","summary":"...","findings":[{"file":"app.js","line":12,"severity":"error","message":"...","fix":"..."}]}\n' +
            "Amabwiriza:\n" +
            "- 'logic': sobanura MU KINYARWANDA icyo umushinga ukora muri rusange (interuro 2-4).\n" +
            "- 'summary': interuro imwe y'incamake y'ibibazo.\n" +
            "- 'findings': gusa imirongo ifite ikibazo nyakuri (syntax, logic bug, runtime risk, best practice). " +
            "'line' igomba kuba umurongo NYAWO muri iyo dosiye. 'message' na 'fix' biba mu Kinyarwanda, magufi. " +
            "'fix' iba code igufi y'umurongo ukosoye gusa — ntukwandike code yose.\n" +
            "- Niba nta kibazo, findings iba urutonde rusa.",
        },
        { role: "user", content: `Ururimi: ${data.language}\n\n${data.code || "(nta code)"}` },
      ],
    });
    const raw = j.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return ReportSchema.parse(JSON.parse(cleaned));
    } catch {
      return { logic: cleaned.slice(0, 800), summary: "", findings: [] as Finding[] };
    }
  });
