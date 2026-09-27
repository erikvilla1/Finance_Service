// Lets `node --test` run the TypeScript engine modules directly:
//   node --import ./scripts/test-loader.mjs --test "src/**/*.test.ts"
//
// Node 24 strips TypeScript types natively, but ESM resolution still wants a
// file extension, and the app imports its own modules extensionless (the way
// Next resolves them). The hooks file maps those imports to the .ts beside
// them. No build step, no dependency.
import { register } from "node:module";

register("./test-resolve-hooks.mjs", import.meta.url);
