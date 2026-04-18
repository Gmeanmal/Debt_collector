import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/types/api.generated.ts", "e2e", "playwright-report", "test-results"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style']",
          message: "No inline CSS — use Tailwind utilities or tokens.css.",
        },
        // Catches literal alt text like alt="goddess" / alt="avatar" directly on <img> tags.
        // Expressions (alt={variable}) are intentionally exempt — the rule targets copy-paste errors.
        {
          selector:
            "JSXOpeningElement[name.name='img'] > JSXAttribute[name.name='alt'] > Literal[value=/avatar|user|goddess|sub/i]",
          message:
            "Do not hardcode user-identity words in img alt. Use <AvatarImage avatarKey={…} /> for user avatars — alt must derive from display_name, not a generic label.",
        },
        {
          selector: "MemberExpression[property.name='toLocaleDateString']",
          message: "Use formatLondon from @/services/format/datetime instead.",
        },
        {
          selector: "MemberExpression[property.name='toLocaleString']",
          message: "Use formatLondon from @/services/format/datetime instead.",
        },
        {
          selector: "MemberExpression[property.name='toLocaleTimeString']",
          message: "Use formatLondon from @/services/format/datetime instead.",
        },
      ],
    },
  },
);
