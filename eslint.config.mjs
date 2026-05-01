import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const coreWebVitals = require("eslint-config-next/core-web-vitals");
const typescript = require("eslint-config-next/typescript");

const eslintConfig = [
  {
    ignores: ["tailwind.config.js", "postcss.config.js", ".tmp-*"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@dnd-kit/*"],
              message: "@dnd-kit is allowed in app/admin/** only",
            },
            {
              group: [
                "mongoose",
                "@types/mongoose",
                "pg",
                "@types/pg",
                "jsdom",
                "@types/jsdom",
                "bullmq",
                "redis",
                "framer-motion",
                "slugify",
                "react-router-dom",
                "@tanstack/*",
              ],
              // Audit S2-F7 decision: forbid ETL-only and banned imports in app code paths.
              message: "Forbidden import for Nuggets v2 app runtime (audit S2-F7).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
