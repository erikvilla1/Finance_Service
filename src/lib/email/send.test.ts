import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTACT_ADDRESS, fromHeader, wrapHtml } from "./send";
import { EMAIL_LOGO_CID } from "./logo";

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

test("wrapper: the logo travels inside the message, and the footer gives the admin inbox", () => {
  const html = wrapHtml({ heading: "Hello", body: "<p>Body</p>" });
  // Remote images are blocked for anything in Junk, which is where a new
  // sending domain starts out; a Content-ID reference shows regardless.
  assert.ok(html.includes(`src="cid:${EMAIL_LOGO_CID}"`));
  assert.ok(!html.includes("/brand/fls-capital-dark.png"));
  assert.ok(html.includes(`mailto:${CONTACT_ADDRESS}`));
  assert.equal(CONTACT_ADDRESS, "admin@flscapitaladvisors.com");
});
