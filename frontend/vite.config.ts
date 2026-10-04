import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: { port: 5173, host: "0.0.0.0", proxy: { "/api": "http://localhost:5000" } },
  preview: { port: 5173, host: "0.0.0.0" },
  build: { sourcemap: false, target: "es2022" }
});
