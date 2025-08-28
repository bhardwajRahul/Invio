import { Options } from "$fresh/plugins/twind.ts";
import { defineConfig } from "@twind/core";
import presetTailwind from "@twind/preset-tailwind";

export default {
  ...defineConfig({
    presets: [presetTailwind()],
  }),
  selfURL: import.meta.url,
} as Options;
