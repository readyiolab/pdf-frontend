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

/**
 * maxGraph ships a tiny `doEval` helper that uses direct `eval(...)`.
 * Rolldown/Vite warn on every production build, and direct eval can break
 * scope-hoisting. Rewrite to indirect eval `(0, eval)(...)` so the helper
 * still works if allowEval is ever enabled, without the build warning.
 * Our editor keeps allowEval disabled, so this path is not used at runtime.
 *
 * IMPORTANT: use Rolldown's native `filter` so this hook is NOT invoked for
 * every module (that was the PLUGIN_TIMINGS hot path). Only the one utils
 * file is transformed.
 */
function patchMaxGraphEval(): Plugin {
  const MATCH =
    /(?:^|[\\/])node_modules[\\/]@maxgraph[\\/]core[\\/].*[\\/]internal[\\/]utils\.js$/

  return {
    name: "patch-maxgraph-eval",
    enforce: "pre",
    transform: {
      filter: {
        id: { include: [MATCH] },
        code: { include: ["return eval(expression)"] },
      },
      handler(code) {
        if (!code.includes("return eval(expression)")) return null
        return {
          code: code.replace(
            "return eval(expression);",
            "return (0, eval)(expression);"
          ),
          map: null,
        }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pdfjsAssets(), patchMaxGraphEval()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    // The pdf chunk is deliberately large: the PDF.js worker is base64-inlined
    // into it (see lib/pdf.ts) so no host can mis-serve a separate .mjs worker.
    // It is lazy-loaded (only on a PDF/signing view) and cached, so this is a
    // known, accepted cost — raise the warning threshold rather than see a
    // scary (but harmless) size warning on every production build.
    // Diagram editor also pulls @maxgraph/core (~500KB) as a lazy chunk.
    chunkSizeWarningLimit: 2000,
    // Ignore leftover EVAL noise from deps we already patched / don't invoke.
    rolldownOptions: {
      onwarn(warning, warn) {
        const msg = String(warning.message || "")
        const id = String((warning as { id?: string }).id || "")
        if (
          (warning as { code?: string }).code === "EVAL" ||
          msg.includes("Use of direct `eval`")
        ) {
          if (id.includes("@maxgraph/core") || msg.includes("@maxgraph/core")) {
            return
          }
        }
        warn(warning)
      },
    },
  },
})
