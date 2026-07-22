// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss,
// tsConfigPaths, cloudflare (build-only), componentTagger (dev-only), VITE_* env injection,
// @ path alias, React/TanStack dedupe, error logger plugins, and sandbox detection.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [mcpPlugin()],
  },
});
