import { test } from "node:test";
import assert from "node:assert/strict";
import { customerStatus } from "./customer-status";

test("customer status: a fresh draft is the applicant's to finish", () => {
  assert.equal(customerStatus("draft").stage, "started");
  assert.equal(customerStatus("draft", { applicationDone: true, documentsSent: false }).stage, "started");
  assert.equal(customerStatus("draft", { applicationDone: false, documentsSent: true }).stage, "started");
});

test("customer status: a draft with everything done reads as received", () => {
  const view = customerStatus("draft", { applicationDone: true, documentsSent: true });
  assert.equal(view.stage, "received");
  assert.equal(view.label, "Application received");
});

test("customer status: progress never moves a file backwards or past staff", () => {
  const none = { applicationDone: false, documentsSent: false };
  assert.equal(customerStatus("submitted", none).stage, "received");
  assert.equal(customerStatus("under_review", none).stage, "reviewing");
  assert.equal(customerStatus("documents_requested", { applicationDone: true, documentsSent: true }).stage, "need_from_you");
});
