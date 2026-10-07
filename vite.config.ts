import { defineConfig } from "vitest/config";
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
  test: {
    // `npm run coverage` : le parseur Fountain doit rester couvert à 90 % au moins.
    coverage: {
      include: ["src/screenplay/**/*.ts"],
      exclude: ["**/__tests__/**"],
      reporter: ["text"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
