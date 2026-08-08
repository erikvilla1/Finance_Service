import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

/**
 * ESLint configuration.
 *
 * The `lint` script and its dependencies were in package.json from the start,
 * but this file never existed — so `npm run lint` had never run successfully.
 *
 * DO NOT reintroduce FlatCompat here. eslint-config-next 16.x already exports
 * native flat-config arrays, and pushing those back through the eslintrc compat
 * layer makes it JSON.stringify plugin objects that hold circular references —
 * which fails with "Converting circular structure to JSON" and no useful
 * pointer to the cause. FlatCompat is only for configs still published in the
 * old shape; this is not one.
 *
 * @eslint/eslintrc is consequently unused by this config. It's left in
 * package.json rather than removed as a drive-by change.
 */

const eslintConfig = [
  {
    // Flat config ignores nothing but node_modules by default, so build output
    // has to be excluded explicitly — otherwise ESLint walks the generated
    // JavaScript in .next and reports thousands of meaningless problems.
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
];

export default eslintConfig;
