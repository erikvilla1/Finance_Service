/**
 * Deploys the current `main` to production, from this machine.
 *
 * Why not just push: Vercel blocks any Git-triggered build whose commit author
 * is not a member of the Vercel team —
 *
 *   readyStateReason: "The deployment was blocked because the commit author
 *                      doesn't have permission to create deployments"
 *   seatBlock: { blockCode: "TEAM_ACCESS_REQUIRED" }
 *
 * Kai commits to GitHub but holds no Vercel seat, so every build of a commit he
 * authored is BLOCKED. That includes `main` itself whenever he is the one who
 * merged the PR, and re-triggering does not help: a deploy hook aimed at the
 * same commit is blocked identically, because the check is on the commit author
 * rather than on whatever started the build.
 *
 * A CLI deploy carries no commit author at all — Vercel records `source: cli`
 * and attributes it to the logged-in user — so it is never seat-blocked. That is
 * what this script runs, and it is the dependable way to ship Kai's work.
 *
 * Usage: npm run deploy                (guards, then deploys production)
 *        npm run deploy -- --force     (skip the guards)
 */

import { execSync } from "node:child_process";

const force = process.argv.includes("--force");

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts }).trim();
}

function fail(msg, hint) {
  console.error(`\n  ✗ ${msg}`);
  if (hint) console.error(`    ${hint}`);
  console.error("\n    Re-run with --force to deploy anyway.\n");
  process.exit(1);
}

// The CLI uploads this working directory, not a git ref, so what ships is
// whatever sits on disk right now. These two checks are the difference between
// shipping `main` and shipping someone's half-finished afternoon.
if (!force) {
  const dirty = sh("git status --porcelain");
  if (dirty) {
    fail(
      "Working tree has uncommitted changes.",
      "A CLI deploy uploads the working tree, so these would ship as-is.",
    );
  }

  try {
    sh("git fetch origin main", { stdio: ["pipe", "pipe", "ignore"] });
  } catch {
    console.warn("  ! could not reach origin; comparing against the last fetch");
  }

  const local = sh("git rev-parse HEAD");
  const remote = sh("git rev-parse origin/main");
  if (local !== remote) {
    const branch = sh("git rev-parse --abbrev-ref HEAD");
    fail(
      `HEAD (${branch} @ ${local.slice(0, 8)}) is not origin/main (${remote.slice(0, 8)}).`,
      "Run: git checkout main && git pull",
    );
  }
}

const sha = sh("git rev-parse HEAD").slice(0, 8);
const subject = sh("git log -1 --format=%s");
const author = sh("git log -1 --format=%an");

console.log("\n  Deploying to production");
console.log(`  commit  ${sha}  ${subject}`);
console.log(`  author  ${author}${force ? "\n  mode    --force (guards skipped)" : ""}\n`);

// --archive=tgz uploads one compressed bundle rather than thousands of separate
// files; the plain upload aborted partway through on this repo. .vercelignore
// keeps the 64MB of brochure originals out of the bundle entirely.
try {
  execSync("vercel deploy --prod --yes --archive=tgz", { stdio: "inherit" });
} catch {
  console.error("\n  ✗ Deploy failed. Check the output above.\n");
  process.exit(1);
}

console.log("\n  ✓ Deployed. https://www.flscapitaladvisors.com\n");
