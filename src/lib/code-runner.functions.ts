import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveAccount } from "./access.server";


const ENDPOINTS = [
  "https://emkc.org/api/v2/piston/execute",
  "https://piston.rickyshi.workers.dev/api/v2/execute",
  "https://piston.thomasarmstrong.dev/api/v2/execute",
  "https://api.piston.rs/api/v2/execute",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RUNTIME: Record<string, { lang: string; file: string; judge: number }> = {
  c: { lang: "c", file: "main.c", judge: 50 },
  cpp: { lang: "c++", file: "main.cpp", judge: 54 },
  java: { lang: "java", file: "Main.java", judge: 62 },
  csharp: { lang: "csharp.net", file: "Program.cs", judge: 51 },
  go: { lang: "go", file: "main.go", judge: 60 },
  rust: { lang: "rust", file: "main.rs", judge: 73 },
  php: { lang: "php", file: "index.php", judge: 68 },
  ruby: { lang: "ruby", file: "main.rb", judge: 72 },
  kotlin: { lang: "kotlin", file: "Main.kt", judge: 78 },
  swift: { lang: "swift", file: "main.swift", judge: 83 },
  bash: { lang: "bash", file: "main.sh", judge: 46 },
  sql: { lang: "sqlite3", file: "query.sql", judge: 82 },
  typescript: { lang: "typescript", file: "index.ts", judge: 74 },
  python: { lang: "python", file: "main.py", judge: 71 },
  javascript: { lang: "javascript", file: "main.js", judge: 63 },
  html: { lang: "javascript", file: "main.js", judge: 63 },
  lua: { lang: "lua", file: "main.lua", judge: 64 },
  dart: { lang: "dart", file: "main.dart", judge: 90 },
  r: { lang: "rscript", file: "main.r", judge: 80 },
  perl: { lang: "perl", file: "main.pl", judge: 85 },
  scala: { lang: "scala", file: "Main.scala", judge: 81 },
};

const EXT: Record<string, string[]> = {
  c: [".c", ".h"],
  cpp: [".cpp", ".cc", ".hpp", ".h"],
  java: [".java"],
  csharp: [".cs"],
  go: [".go"],
  rust: [".rs"],
  php: [".php"],
  ruby: [".rb"],
  kotlin: [".kt"],
  swift: [".swift"],
  bash: [".sh"],
  sql: [".sql"],
  typescript: [".ts"],
  python: [".py"],
  javascript: [".js", ".mjs", ".cjs"],
  html: [".js", ".mjs"],
  lua: [".lua"],
  dart: [".dart"],
  r: [".r", ".R"],
  perl: [".pl"],
  scala: [".scala"],
};

export const runCodeRemote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        language: z.string().min(1).max(40),
        source: z.string().max(80_000).default(""),
        entry: z.string().max(200).optional(),
        files: z.array(z.object({ name: z.string().min(1).max(200), content: z.string().max(80_000) })).max(40).optional(),
        stdin: z.string().max(10_000).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertActiveAccount(context.userId);

    const runtime = RUNTIME[data.language];
    if (!runtime) {
      return { ok: false, stdout: "", stderr: `Ururimi "${data.language}" ntirwemewe kuri seriveri.`, status: "unsupported" };
    }

    const allowed = EXT[data.language] ?? [];
    const extra = (data.files ?? []).filter(
      (f) => f.name !== data.entry && allowed.some((ext) => f.name.toLowerCase().endsWith(ext.toLowerCase())),
    );
    const entryName = data.entry && allowed.some((e) => data.entry!.toLowerCase().endsWith(e.toLowerCase()))
      ? data.entry.split("/").pop()!
      : runtime.file;

    const payload = {
      language: runtime.lang,
      version: "*",
      files: [
        { name: entryName, content: data.source },
        ...extra.map((f) => ({ name: f.name.split("/").pop()!, content: f.content })),
      ],
      stdin: data.stdin ?? "",
      compile_timeout: 10_000,
      run_timeout: 10_000,
    };

    let lastError = "";
    for (const endpoint of ENDPOINTS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const text = await res.text();
            lastError = `(${res.status}) ${text.slice(0, 120)}`;
            // Rate limit or gateway hiccup: wait, then try the same mirror again.
            if (res.status === 429 || res.status >= 500) {
              await sleep(700 * (attempt + 1));
              continue;
            }
            break;
          }
          const j = (await res.json()) as {
            compile?: { stdout?: string; stderr?: string };
            run?: { stdout?: string; stderr?: string; code?: number };
          };
          const stdout = [j.compile?.stdout, j.run?.stdout].filter(Boolean).join("");
          const stderr = [j.compile?.stderr, j.run?.stderr].filter(Boolean).join("");
          return { ok: true, stdout, stderr, status: j.run?.code === 0 ? "success" : `exit ${j.run?.code ?? "?"}` };
        } catch (e) {
          lastError = e instanceof Error ? e.message : "network";
          await sleep(400);
        }
      }
    }

    try {
      const res = await fetch("https://ce.judge0.com/submissions?wait=true", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language_id: runtime.judge, source_code: data.source, stdin: data.stdin ?? "" }),
      });
      if (res.ok) {
        const result = await res.json() as {
          stdout?: string | null;
          stderr?: string | null;
          compile_output?: string | null;
          message?: string | null;
          status?: { description?: string };
        };
        const stderr = [result.compile_output, result.stderr, result.message].filter(Boolean).join("\n");
        return {
          ok: !stderr,
          stdout: result.stdout ?? "",
          stderr,
          status: result.status?.description ?? (stderr ? "error" : "success"),
        };
      }
      lastError = `backup ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "backup network";
    }
    return {
      ok: false,
      stdout: "",
      stderr: `Ntabwo code ishoboye gukora ubu${lastError ? ` — ${lastError}` : ""}. Ongera ugerageze mu kanya gato.`,
      status: "error",
    };
  });
