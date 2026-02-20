import { defineConfig, type Plugin } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * lucide-preact's ESM build uses bare `h()` calls without importing `h` from
 * preact.  This plugin injects the missing import into those files so SSR
 * (preact-render-to-string) can resolve the symbol.
 */
function lucidePreactFix(): Plugin {
  return {
    name: "lucide-preact-fix",
    transform(code, id) {
      if (
        id.includes("lucide-preact") &&
        id.endsWith(".js") &&
        !code.includes('import { h') &&
        /\bh\s*\(/.test(code)
      ) {
        return {
          code: `import { h } from "preact";\n${code}`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    lucidePreactFix(),
    fresh(),
    tailwindcss(),
  ],
});