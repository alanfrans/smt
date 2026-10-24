import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 4317,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4317,
    strictPort: true,
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
