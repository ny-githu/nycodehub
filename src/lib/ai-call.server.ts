/**
 * Resilient AI caller for NYCODEHUB.
 * OpenRouter's free router is the primary and only provider for NYCODER.
 * It chooses an available free model automatically and retries transient failures.
 */

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

const OPENROUTER_MODEL = "openrouter/free";

type Body = Record<string, unknown>;

/** Retryable = worth trying another model or waiting a moment. */
function retryable(status: number) {
  return status === 402 || status === 429 || status === 400 || status >= 500;
}

async function post(url: string, key: string, body: Body) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      "HTTP-Referer": "https://nycodehub.lovable.app",
      "X-Title": "NYCODEHUB NYCODER",
    },
    body: JSON.stringify(body),
  });
}

function extract(json: unknown) {
  const j = json as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

/**
 * Calls the first model that answers successfully.
 * Uses OpenRouter's free model router. The chain parameter is retained so
 * existing callers and admin settings remain backwards compatible.
 */
export async function callAIWithFallback(_chain: string[], body: Body): Promise<string> {
  const orKey = process.env["OPENROUTER_API_KEY"];
  let lastStatus = 0;
  let lastText = "";

  if (!orKey) throw new Error("NYCODER ntabwo irimo gutangira neza. Umuyobozi agomba kugenzura OPENROUTER_API_KEY.");

  // Fewer, faster attempts: users get an answer quickly instead of waiting on backoff.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await post(OPENROUTER, orKey, { ...body, model: OPENROUTER_MODEL }).catch(() => null);
    if (!res) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      continue;
    }
    if (res.ok) {
      const text = extract(await res.json());
      if (text.trim()) return text;
      lastText = "empty response";
    } else {
      lastStatus = res.status;
      lastText = (await res.text()).slice(0, 240);
      if (!retryable(res.status)) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
  }

  if (lastStatus === 429) {
    throw new Error("NYCODER irimo kwakira abantu benshi. Ongera ugerageze mu kanya gato.");
  }
  console.error("OpenRouter failure", lastStatus, lastText);
  throw new Error("NYCODER ntiyashoboye gusubiza ubu. Ongera ugerageze mu kanya gato.");
}

