import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ask_codehelper",
  title: "Ask CODEHELPER",
  description: "Ask the NYCODEHUB CODEHELPER a coding question. Replies in Kinyarwanda.",
  inputSchema: {
    language: z.string().describe("Programming language, e.g. 'python'."),
    code: z.string().optional().describe("Current code (optional)."),
    question: z.string().describe("The student's question."),
  },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ language, code, question }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { content: [{ type: "text", text: "AI unavailable" }], isError: true };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Uri CODEHELPER, umufasha w'umunyeshuri wiga gukora porogaramu. Subiza MU KINYARWANDA, mu magambo magufi kandi yumvikana.",
          },
          {
            role: "user",
            content: `Ururimi: ${language}\n\nCode:\n\`\`\`${language}\n${code || "(nta code)"}\n\`\`\`\n\nIkibazo: ${question}`,
          },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { content: [{ type: "text", text: `AI error (${res.status}): ${text.slice(0, 200)}` }], isError: true };
    }
    const j = await res.json();
    const answer = j.choices?.[0]?.message?.content ?? "(nta gisubizo)";
    return { content: [{ type: "text", text: answer }] };
  },
});
