import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuration compatible avec Tauri : port fixe, pas d'écran effacé.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
