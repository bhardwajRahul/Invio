import tsParser from "@typescript-eslint/parser";
import eslintPluginSvelte from "eslint-plugin-svelte";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  ...eslintPluginSvelte.configs["flat/recommended"],
  eslintConfigPrettier,
  ...eslintPluginSvelte.configs["flat/prettier"],
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parserOptions: {
        parser: tsParser,
      },
    },
    rules: {
      // The app uses plain <a href> links throughout — resolve() is not required
      // for static string hrefs and enforcing it would require rewriting every
      // navigation link in the codebase.
      "svelte/no-navigation-without-resolve": "off",

      // Keyed each blocks are good practice but not enforced — downgraded to a
      // warning so existing code is not broken and new code gets a nudge.
      "svelte/require-each-key": "warn",
    },
  },
  {
    ignores: [".svelte-kit/", "build/", "node_modules/"],
  },
];
