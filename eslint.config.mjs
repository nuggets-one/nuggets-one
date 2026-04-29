import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const coreWebVitals = require("eslint-config-next/core-web-vitals");
const typescript = require("eslint-config-next/typescript");

const eslintConfig = [
  {
    ignores: ["tailwind.config.js", "postcss.config.js"],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@dnd-kit/*"],
              message: "@dnd-kit is allowed in app/admin/** only",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
