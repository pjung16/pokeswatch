import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"
import pluginReact from "eslint-plugin-react"
import stylisticTs from "@stylistic/eslint-plugin-ts"

const eslintConfig = [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    plugins: {
      "@stylistic/ts": stylisticTs,
    },
    rules: {
      "@/semi": ["error", "never"],
    },
  },
]

export default eslintConfig
