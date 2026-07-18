import fs from "node:fs"
import { createRequire } from "node:module"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

const require = createRequire(import.meta.url)

/**
 * Serves and emits PDF.js's cMap and standard-font data.
 *
 * These ship as plain directories of binary files inside pdfjs-dist, not as
 * importable modules — `new URL("pdfjs-dist/cmaps/", import.meta.url)` looks
 * like it should work but Vite cannot resolve a bare directory specifier, so
 * the expression survives verbatim into the bundle and 404s at runtime.
 * Without these files, PDFs using CJK/Arabic encodings or relying on the
 * non-embedded standard 14 fonts render blank glyphs — and do so silently,
 * because PDF.js treats the failed fetch as a warning rather than an error.
 *
 * Copying them to a stable /pdfjs/ path fixes dev and build alike without
 * taking on vite-plugin-static-copy as a dependency.
 */
function pdfjsAssets(): Plugin {
  const dirs = ["cmaps", "standard_fonts"]
  const pkgRoot = () => path.dirname(require.resolve("pdfjs-dist/package.json"))

  return {
    name: "pdfjs-assets",

    // Dev: map /pdfjs/* onto the installed package directory.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/pdfjs/")) return next()
        const root = pkgRoot()
        const file = path.join(root, req.url.slice("/pdfjs/".length).split("?")[0])
        // Never let a crafted ../ escape the package directory.
        if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          return next()
        }
        fs.createReadStream(file).pipe(res)
      })
    },

    // Build: emit the directories into dist/pdfjs/.
    closeBundle() {
      for (const dir of dirs) {
        const from = path.join(pkgRoot(), dir)
        if (!fs.existsSync(from)) continue
        fs.cpSync(from, path.resolve(__dirname, "dist/pdfjs", dir), { recursive: true })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pdfjsAssets()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
