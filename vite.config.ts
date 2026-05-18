// @lovable.dev/vite-tanstack-config already includes tanstackStart, viteReact, tailwindcss, etc.
// For Vercel: cloudflare build plugin off + Nitro (https://vercel.com/docs/frameworks/full-stack/tanstack-start).
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  cloudflare: false,
  plugins: [nitro()],
  tanstackStart: {
    server: { entry: "server" },
  },
});
