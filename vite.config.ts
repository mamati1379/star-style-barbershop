import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";

// Plugin to copy fonts to dist during build
function copyFontsPlugin(): Plugin {
  return {
    name: "copy-fonts",
    apply: "build",
    async generateBundle() {
      const fontsDir = path.resolve(__dirname, "public/fonts");
      const distFontsDir = path.resolve(__dirname, "dist/fonts");

      // Create dist/fonts directory
      if (!fs.existsSync(distFontsDir)) {
        fs.mkdirSync(distFontsDir, { recursive: true });
      }

      // Copy all font files
      const files = fs.readdirSync(fontsDir);
      for (const file of files) {
        const src = path.join(fontsDir, file);
        const dest = path.join(distFontsDir, file);
        fs.copyFileSync(src, dest);
        console.log(`✓ Copied font: ${file}`);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), copyFontsPlugin()],
    base: "/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
  };
});
