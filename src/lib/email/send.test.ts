import { test } from "node:test";
import assert from "node:assert/strict";
import { fromHeader } from "./send";

test("from header: a bare address gets the firm's name in front", () => {
  assert.equal(
    fromHeader("admin@flscapitaladvisors.com"),
    "FLS Capital Advisors <admin@flscapitaladvisors.com>",
  );
  assert.equal(
    fromHeader("  notifications@mail.flscapitaladvisors.com "),
    "FLS Capital Advisors <notifications@mail.flscapitaladvisors.com>",
  );
});

test("from header: a configured name is kept as written", () => {
  assert.equal(fromHeader("Robert at FLS <robert@flscapitaladvisors.com>"), "Robert at FLS <robert@flscapitaladvisors.com>");
});

test("from header: nothing configured falls back to Resend's onboarding sender", () => {
  assert.equal(fromHeader(undefined), "FLS Capital Advisors <onboarding@resend.dev>");
  assert.equal(fromHeader(""), "FLS Capital Advisors <onboarding@resend.dev>");
});
