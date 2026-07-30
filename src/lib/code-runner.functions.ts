import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ENDPOINTS = [
  "https://emkc.org/api/v2/piston/execute",
  "https://piston.rickyshi.workers.dev/api/v2/execute",
];

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
  html: { lang: "javascript", file: "main.js" },
  lua: { lang: "lua", file: "main.lua" },
  dart: { lang: "dart", file: "main.dart" },
  r: { lang: "rscript", file: "main.r" },
  perl: { lang: "perl", file: "main.pl" },
  scala: { lang: "scala", file: "Main.scala" },
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
  .handler(async ({ data }) => {
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
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          lastError = res.status === 429
            ? "Wabaze cyane. Tegereza amasegonda make usubiremo."
            : `Seriveri (${res.status}): ${text.slice(0, 160)}`;
          continue;
        }
        const j = (await res.json()) as {
          compile?: { stdout?: string; stderr?: string };
          run?: { stdout?: string; stderr?: string; code?: number };
        };
        const stdout = [j.compile?.stdout, j.run?.stdout].filter(Boolean).join("");
        const stderr = [j.compile?.stderr, j.run?.stderr].filter(Boolean).join("");
        return { ok: true, stdout, stderr, status: j.run?.code === 0 ? "success" : `exit ${j.run?.code ?? "?"}` };
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Byanze guhamagara seriveri";
      }
    }
    return {
      ok: false,
      stdout: "",
      stderr: `Seriveri y'ikoresha code ntiyabonetse ubu. ${lastError}\nGerageza nanone mu masegonda make.`,
      status: "error",
    };
  });
