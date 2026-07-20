// eslint-config-next 16.x exports its flat config directly (an array of
// flat-config objects) — there is no more `next/core-web-vitals` shareable
// string to run through @eslint/eslintrc's FlatCompat, which is the
// pre-flat-config pattern from earlier Next versions. Using FlatCompat here
// double-wraps the plugin objects and produces a circular structure error
// from newer ESLint versions.
import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ["supabase/migrations/**", "coverage/**"],
  },
];

export default eslintConfig;
