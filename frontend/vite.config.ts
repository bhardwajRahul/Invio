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

/**
 * @preact/signals@2.5.1 has a bug in dist/signals.module.js (the "browser"
 * export): it references an undeclared variable `r` where it should reference
 * `Fragment` from preact.  We patch the import to include Fragment.
 */
function preactSignalsFix(): Plugin {
  return {
    name: "preact-signals-fix",
    enforce: "pre",
    transform(code, id) {
      if (
        id.includes("@preact") &&
        id.includes("signals") &&
        id.includes("signals.module.js")
      ) {
        // The file imports from "preact" but is missing Fragment.
        // Add Fragment to the existing preact import.
        if (
          !code.includes("Fragment") &&
          code.includes('from "preact"') ||
          code.includes("from 'preact'")
        ) {
          const patched = code.replace(
            /import\s*\{([^}]*)\}\s*from\s*["']preact["']/,
            (match, imports) => {
              if (imports.includes("Fragment")) return match;
              return `import {${imports}, Fragment } from "preact"`;
            },
          );
          // Also replace the bare `r` reference with `Fragment`
          // In the minified source: `if (n.type !== r)` where n is vnode
          const final = patched.replace(
            /\.type\s*!==\s*r\b/,
            ".type !== Fragment",
          );
          if (final !== code) {
            return { code: final, map: null };
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    preactSignalsFix(),
    lucidePreactFix(),
    fresh(),
    tailwindcss(),
  ],
});