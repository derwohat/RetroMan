import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // These React 19 rules flag common valid patterns (setState in async
      // effect callbacks, helper components inside component bodies).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      // German UI text legitimately contains " characters.
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
