import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const JUDGE0_LANGUAGES: Record<string, number> = {
  c: 50, cpp: 54, java: 62, csharp: 51, go: 60, rust: 73,
  php: 68, ruby: 72, kotlin: 78, swift: 83, bash: 46, sql: 82,
  typescript: 74,
};

export const runCodeRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    language: z.string().min(1).max(40),
    source: z.string().min(1).max(50_000),
    stdin: z.string().max(10_000).optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const langId = JUDGE0_LANGUAGES[data.language];
    if (!langId) {
      return { ok: false, stdout: "", stderr: `Language "${data.language}" is not supported by the remote runner.`, status: "unsupported" };
    }
    const key = process.env.RAPIDAPI_JUDGE0_KEY;
    if (!key) {
      return { ok: false, stdout: "", stderr: "Remote runner not configured. Ask the admin to set RAPIDAPI_JUDGE0_KEY.", status: "not_configured" };
    }
    try {
      const res = await fetch("https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-rapidapi-key": key,
          "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify({
          language_id: langId,
          source_code: data.source,
          stdin: data.stdin ?? "",
        }),
      });
      if (!res.ok) {
        return { ok: false, stdout: "", stderr: `Runner HTTP ${res.status}`, status: "error" };
      }
      const j = await res.json();
      return {
        ok: true,
        stdout: j.stdout ?? "",
        stderr: (j.stderr ?? "") + (j.compile_output ? `\n${j.compile_output}` : ""),
        status: j.status?.description ?? "done",
        time: j.time, memory: j.memory,
      };
    } catch (e) {
      return { ok: false, stdout: "", stderr: e instanceof Error ? e.message : "Runner request failed", status: "error" };
    }
  });
