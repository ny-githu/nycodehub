/**
 * Resilient AI caller for NYCODEHUB.
 * Tries several models in order so NYCODER never goes down because one model
 * is rate-limited or out of credits. An optional OPENROUTER_API_KEY is used as
 * a last resort.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions";

/** Strongest first, cheapest last — used for build/debug/fix work. */
export const SMART_CHAIN = [
  "google/gemini-3.1-pro-preview",
  "google/gemini-3.6-flash",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

/** Fast/cheap first — used for chat and quick analysis. */
export const FAST_CHAIN = [
  "google/gemini-3.6-flash",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];

const OPENROUTER_FALLBACK = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

type Body = Record<string, unknown>;

/** Retryable = worth trying another model or waiting a moment. */
function retryable(status: number) {
  return status === 402 || status === 429 || status === 400 || status >= 500;
}

async function post(url: string, key: string, body: Body) {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
}

function extract(json: unknown) {
  const j = json as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

/**
 * Calls the first model in `chain` that answers successfully.
 * Returns the text content of the answer.
 */
export async function callAIWithFallback(chain: string[], body: Body): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  let lastStatus = 0;
  let lastText = "";

  if (key) {
    for (const model of chain) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await post(GATEWAY, key, { model, ...body }).catch(() => null);
        if (!res) break;
        if (res.ok) return extract(await res.json());
        lastStatus = res.status;
        lastText = (await res.text()).slice(0, 200);
        if (!retryable(res.status)) break;
        // A short pause helps with momentary rate limits before switching model.
        if (res.status === 429 && attempt === 0) await new Promise((r) => setTimeout(r, 900));
        else break;
      }
    }
  }

  const orKey = process.env["OPENROUTER_API_KEY"];
  if (orKey) {
    for (const model of OPENROUTER_FALLBACK) {
      const res = await post(OPENROUTER, orKey, { model, ...body }).catch(() => null);
      if (res?.ok) return extract(await res.json());
      if (res) {
        lastStatus = res.status;
        lastText = (await res.text()).slice(0, 200);
      }
    }
  }

  if (!key && !orKey) throw new Error("NYCODER ntiyabashije gukora. Vugana n'umuyobozi.");
  if (lastStatus === 402) {
    throw new Error("Amafaranga ya AI yarangiye kuri modeli zose. Vugana n'umuyobozi (ashobora kongeramo credits cyangwa OPENROUTER_API_KEY).");
  }
  if (lastStatus === 429) {
    throw new Error("Ibibazo byinshi ku isaha imwe kuri modeli zose. Tegereza akanya gato usubiremo.");
  }
  throw new Error(`NYCODER yagize ikibazo (${lastStatus || "network"}): ${lastText}`);
}
