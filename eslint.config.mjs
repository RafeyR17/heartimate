import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "**/.next/**",
    "**/node_modules/**",
    "**/dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/purity": "error",
      "react-hooks/set-state-in-effect": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "react/jsx-no-comment-textnodes": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/static-components": "off",
    },
  },
]);

export default eslintConfig;
