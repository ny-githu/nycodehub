import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PISTON = "https://emkc.org/api/v2/piston/execute";

const RUNTIME: Record<string, { lang: string; file: string }> = {
  c: { lang: "c", file: "main.c" },
  cpp: { lang: "c++", file: "main.cpp" },
  java: { lang: "java", file: "Main.java" },
  csharp: { lang: "csharp.net", file: "Program.cs" },
  go: { lang: "go", file: "main.go" },
  rust: { lang: "rust", file: "main.rs" },
  php: { lang: "php", file: "index.php" },
  ruby: { lang: "ruby", file: "main.rb" },
  kotlin: { lang: "kotlin", file: "Main.kt" },
  swift: { lang: "swift", file: "main.swift" },
  bash: { lang: "bash", file: "main.sh" },
  sql: { lang: "sqlite3", file: "query.sql" },
  typescript: { lang: "typescript", file: "index.ts" },
  python: { lang: "python", file: "main.py" },
  javascript: { lang: "javascript", file: "main.js" },
  lua: { lang: "lua", file: "main.lua" },
  dart: { lang: "dart", file: "main.dart" },
  r: { lang: "rscript", file: "main.r" },
  perl: { lang: "perl", file: "main.pl" },
  scala: { lang: "scala", file: "Main.scala" },
};

export const runCodeRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        language: z.string().min(1).max(40),
        source: z.string().min(1).max(80_000),
        stdin: z.string().max(10_000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const runtime = RUNTIME[data.language];
    if (!runtime) {
      return { ok: false, stdout: "", stderr: `Ururimi "${data.language}" ntirwemewe kuri seriveri.`, status: "unsupported" };
    }
    try {
      const res = await fetch(PISTON, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          language: runtime.lang,
          version: "*",
          files: [{ name: runtime.file, content: data.source }],
          stdin: data.stdin ?? "",
          compile_timeout: 10_000,
          run_timeout: 10_000,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 429) return { ok: false, stdout: "", stderr: "Wabaze cyane. Tegereza akanya usubiremo.", status: "rate_limited" };
        return { ok: false, stdout: "", stderr: `Seriveri yagize ikibazo (${res.status}): ${text.slice(0, 200)}`, status: "error" };
      }
      const j = (await res.json()) as {
        compile?: { stdout?: string; stderr?: string };
        run?: { stdout?: string; stderr?: string; code?: number };
      };
      const stdout = [j.compile?.stdout, j.run?.stdout].filter(Boolean).join("");
      const stderr = [j.compile?.stderr, j.run?.stderr].filter(Boolean).join("");
      return { ok: true, stdout, stderr, status: j.run?.code === 0 ? "success" : `exit ${j.run?.code ?? "?"}` };
    } catch (e) {
      return { ok: false, stdout: "", stderr: e instanceof Error ? e.message : "Byanze guhamagara seriveri", status: "error" };
    }
  });
