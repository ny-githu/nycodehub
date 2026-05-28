import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const askCodeHelper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      language: z.string().min(1).max(40),
      code: z.string().max(20_000),
      question: z.string().min(1).max(1000),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI ntiyabashije gukora. Vugana n'umuyobozi.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Uri CODEHELPER, umufasha w'umunyeshuri wiga gukora porogaramu. Subiza MU KINYARWANDA, mu magambo magufi kandi yumvikana. Sobanura code n'ibyitegererezo. Niba code ifite ikibazo, garagaza umurongo n'igisubizo gikwiye. Koresha urutonde n'amagambo macye.",
          },
          {
            role: "user",
            content: `Ururimi: ${data.language}\n\nCode iriho:\n\`\`\`${data.language}\n${data.code || "(nta code)"}\n\`\`\`\n\nIkibazo cy'umunyeshuri: ${data.question}`,
          },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Wabaze umufasha cyane. Tegereza akanya.");
      if (res.status === 402) throw new Error("Konti ya AI ntifite amafaranga. Vugana n'umuyobozi.");
      throw new Error(`AI yagize ikibazo (${res.status}): ${text.slice(0, 160)}`);
    }
    const j = await res.json();
    return { answer: j.choices?.[0]?.message?.content ?? "(nta gisubizo)" };
  });
