import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAccount } from "./access.server";

import { callAIWithFallback, SMART_CHAIN, FAST_CHAIN } from "./ai-call.server";
import { loadBrain, brainPrompt, rememberUser } from "./nycoder-brain.server";

async function callAI(chain: string[], body: Record<string, unknown>) {
  return callAIWithFallback(chain, body);
}

function parseJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch { /* fallthrough */ }
    }
    return null;
  }
}

const FileSchema = z.object({ name: z.string().min(1).max(200), content: z.string().max(60_000) });
const MessageSchema = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) });

const ActionSchema = z.object({
  op: z.enum(["write", "delete"]).default("write"),
  path: z.string().default(""),
  content: z.string().default(""),
});

const AgentSchema = z.object({
  reply: z.string().default(""),
  logic: z.string().default(""),
  blocked: z.boolean().default(false),
  actions: z.array(ActionSchema).default([]),
  findings: z
    .array(
      z.object({
        file: z.string().default(""),
        line: z.number().int().min(1).default(1),
        severity: z.enum(["error", "warning", "info"]).default("info"),
        message: z.string().default(""),
        fix: z.string().default(""),
      }),
    )
    .default([]),
});


export type NycoderAction = z.infer<typeof ActionSchema>;
export type NycoderResult = z.infer<typeof AgentSchema>;

const RULES =
  "Uri NYCODER: AI y'umuhanga mu gukora porogaramu (senior software engineer) ikorera NYCODEHUB. " +
  "Uzi indimi zose: HTML, CSS, JavaScript, TypeScript, Python, Java, C, C++, C#, Go, Rust, PHP, Ruby, Kotlin, Swift, Bash, SQL, Lua, Dart, R, Perl, Scala. " +
  "Uvugana MU KINYARWANDA (amagambo ya tekiniki asigara mu cyongereza). " +
  "Ushobora KWANDIKA no KUVUGURURA dosiye z'umushinga w'umukoresha ukoresheje 'actions'.\n" +
  "SUBIZA JSON GUSA ifite iyi miterere:\n" +
  '{"reply":"...","logic":"...","blocked":false,"actions":[{"op":"write","path":"src/app.js","content":"<code yose y\'iyo dosiye>"}],' +
  '"findings":[{"file":"app.js","line":12,"severity":"error","message":"...","fix":"..."}]}\n' +
  "Amabwiriza:\n" +
  "- 'reply': igisubizo cyawe mu Kinyarwanda (mu magambo make, ushobora gukoresha markdown).\n" +
  "- 'actions': iyo ugomba guhindura cyangwa gushyiraho dosiye. 'path' ishobora kugira folder (urugero 'src/pages/home.js') — sisitemu izayikora. 'content' iba code YOSE y'iyo dosiye (ntukoreshe '...'). Koresha op 'delete' iyo dosiye igomba gukurwamo.\n" +
  "- Iyo umukoresha atanze igitekerezo cy'umushinga, kora umushinga WOSE: dosiye zose zikenewe, folders, README.md, no run.sh + run.bat kugira ngo ukorere kuri Linux na Windows.\n" +
  "- Code yose igomba kuba ikora nta makosa, ifite comments nkeya zisobanura mu Kinyarwanda.\n" +
  "- 'findings': gusa imirongo ifite ikibazo nyakuri; 'line' iba umurongo NYAWO w'iyo dosiye.\n" +
  "- Iyo nta hindura rikenewe, 'actions' iba urutonde rusa.\n" +
  "- 'logic': sobanura muri make logic y'ibyo umukoresha asaba (bikoreshwa muri sisitemu gusa, ntibigaragara kuri mukoresha).\n" +
  "- UMUCO MWIZA: niba ubutumwa busaba ibintu bibi cyangwa binyuranyije n'amategeko (malware, virus, hacking, kwiba amakuru/konti, phishing, ransomware, spam, ibisebya, ibyangiza abandi), shyira 'blocked': true, 'actions' isa, kandi muri 'reply' usobanure mu Kinyarwanda ko udashobora kubifasha n'impamvu. Ubundi 'blocked': false.";

export const nycoderAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        language: z.string().min(1).max(40),
        mode: z.enum(["chat", "build", "debug", "fix"]).default("chat"),
        files: z.array(FileSchema).max(60).default([]),
        history: z.array(MessageSchema).max(24).default([]),
        message: z.string().min(1).max(6000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertActiveAccount(context.userId);
    const workspace = data.files.length
      ? data.files.map((f) => `### DOSIYE: ${f.name}\n${f.content}`).join("\n\n")
      : "(umushinga ntacyo urimo)";

    const task =
      data.mode === "build"
        ? "UMURIMO: kora umushinga WOSE ukurikije igitekerezo cy'umukoresha. Shyira dosiye zose muri 'actions'."
        : data.mode === "debug"
          ? "UMURIMO: sesengura umushinga, sobanura logic yawo, wereke amakosa muri 'findings' ukoresheje file na line nyayo."
          : data.mode === "fix"
            ? "UMURIMO: kosora amakosa yose muri code, wandike dosiye zakosowe muri 'actions', hanyuma usobanure ibyo wahinduye."
            : "UMURIMO: ganira n'umukoresha kandi umufashe gutegura umushinga mbere y'uko ukorwa. Muri 'chat' ntukandike dosiye — 'actions' iba urutonde rusa keretse iyo umukoresha abisabye asobanutse; ahubwo mubaze ibibazo, mugire inama, wereke code ngufi muri 'reply'.";

    const raw = await callAI(data.mode === "chat" ? FAST_CHAIN : SMART_CHAIN, {
      temperature: data.mode === "chat" ? 0.4 : 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${RULES}\n${task}` },
        ...data.history.map((m) => ({ role: m.role, content: m.content })),
        {
          role: "user",
          content: `Ururimi nyamukuru: ${data.language}\n\nUMUSHINGA URIHO:\n${workspace}\n\nUBUTUMWA: ${data.message}`,
        },
      ],
    });

    const parsed = parseJson(raw);
    if (!parsed) return { reply: raw || "(nta gisubizo)", logic: "", blocked: false, actions: [], findings: [] } as NycoderResult;
    const safe = AgentSchema.safeParse(parsed);
    if (!safe.success) return { reply: raw.slice(0, 2000), logic: "", blocked: false, actions: [], findings: [] } as NycoderResult;
    return {
      ...safe.data,
      actions: safe.data.actions.filter((a) => a.path.trim().length > 0),
    };
  });
