import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite"; // ✅ v4 권장 플러그인

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
