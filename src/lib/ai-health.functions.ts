import { createServerFn } from "@tanstack/react-start";

export type AiStatus = {
  ok: boolean;
  label: string;
  detail: string;
};

/**
 * Verifies the OpenRouter key before NYCODER is used, so the CODEROOM can show
 * a clear status indicator instead of failing mid-request.
 */
export const checkAiStatus = createServerFn({ method: "GET" }).handler(async (): Promise<AiStatus> => {
  const key = process.env["OPENROUTER_API_KEY"];
  if (!key) {
    return { ok: false, label: "NYCODER idafite urufunguzo", detail: "OPENROUTER_API_KEY ntiyashyizwemo. Umuyobozi agomba kuyongeramo." };
  }
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { authorization: `Bearer ${key}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, label: "Urufunguzo rwanzwe", detail: "OPENROUTER_API_KEY ntiyemewe. Umuyobozi agomba kuyisimbuza indi." };
    }
    if (!res.ok) {
      return { ok: false, label: "OpenRouter ntiyitaba", detail: `Seriveri yagarutse (${res.status}). Gerageza nanone mu kanya.` };
    }
    return { ok: true, label: "NYCODER irakora", detail: "Urufunguzo rwa OpenRouter rurakora neza." };
  } catch {
    return { ok: false, label: "Nta murongo wa internet", detail: "Ntabwo dushobora kugera kuri OpenRouter ubu." };
  }
});
