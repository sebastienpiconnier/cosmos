import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configuration compatible avec Tauri : port fixe, pas d'écran effacé.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Ne pas surveiller la partie Rust : ses fichiers de compilation sont verrouillés
    // pendant le build (erreurs EBUSY sous Windows) et Tauri gère lui-même ce dossier.
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_"],
});
