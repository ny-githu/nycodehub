import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NycoderBrain = {
  systemPrompt: string;
  temperature: number | null;
  chainOverride: string[] | null;
  selfImprove: boolean;
  examples: { prompt: string; answer: string }[];
  memory: string;
};

/** Loads admin-controlled settings, training examples and this user's memory. */
export async function loadBrain(userId: string): Promise<NycoderBrain> {
  const [{ data: settings }, { data: training }, { data: memory }] = await Promise.all([
    supabaseAdmin.from("nycoder_settings").select("*").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("nycoder_training").select("prompt, answer").eq("active", true).order("created_at", { ascending: false }).limit(12),
    supabaseAdmin.from("nycoder_memory").select("notes").eq("user_id", userId).maybeSingle(),
  ]);

  return {
    systemPrompt: (settings?.system_prompt as string | null)?.trim() ?? "",
    temperature: settings?.temperature != null ? Number(settings.temperature) : null,
    chainOverride: (settings?.model_chain as string[] | null)?.length ? (settings!.model_chain as string[]) : null,
    selfImprove: settings?.self_improve ?? true,
    examples: (training ?? []) as { prompt: string; answer: string }[],
    memory: (memory?.notes as string | null) ?? "",
  };
}

/** Extra system text built from admin training + per-user memory. */
export function brainPrompt(brain: NycoderBrain) {
  const parts: string[] = [];
  if (brain.systemPrompt) parts.push(`AMABWIRIZA Y'UMUYOBOZI:\n${brain.systemPrompt}`);
  if (brain.examples.length) {
    parts.push(
      "INGERO Z'IMYITOZO (kurikiza uburyo bwo gusubiza bwazo):\n" +
        brain.examples.map((e, i) => `${i + 1}. Q: ${e.prompt}\n   A: ${e.answer}`).join("\n"),
    );
  }
  if (brain.memory) parts.push(`IBYO WIBUKA KURI UYU MUKORESHA (koresha kugira ngo usubize mu buryo bumunogeye):\n${brain.memory}`);
  return parts.join("\n\n");
}

/**
 * Self-improvement: keeps a short rolling note about the user's style so
 * NYCODER adapts to their vibe over time.
 */
export async function rememberUser(userId: string, addition: string) {
  const clean = addition.trim().slice(0, 400);
  if (!clean) return;
  const { data } = await supabaseAdmin.from("nycoder_memory").select("notes, turns").eq("user_id", userId).maybeSingle();
  const lines = ((data?.notes as string | null) ?? "").split("\n").filter(Boolean);
  const next = [...lines, clean].slice(-12).join("\n");
  await supabaseAdmin
    .from("nycoder_memory")
    .upsert({ user_id: userId, notes: next, turns: ((data?.turns as number | null) ?? 0) + 1, updated_at: new Date().toISOString() });
}
