import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_STAGES,
  CUSTOMER_STAGE_LABELS,
  FORBIDDEN_CUSTOMER_WORDS,
  customerStatus,
} from "./customer-status";

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

test("customer status: funded and closed are different end states", () => {
  assert.equal(customerStatus("funded").stage, "funded");
  assert.equal(customerStatus("funded").label, "Funded");
  assert.equal(customerStatus("closed").stage, "closed");
  assert.equal(customerStatus("withdrawn").stage, "closed");
  assert.equal(customerStatus("withdrawn").label, "Closed");
  assert.notEqual(customerStatus("funded").description, customerStatus("closed").description);
});

test("customer status: a single funder's decision is never the file's outcome", () => {
  assert.equal(customerStatus("approved").stage, "with_funder");
  assert.equal(customerStatus("declined").stage, "reviewing");
});

test("customer status: no internal vocabulary in anything an applicant reads", () => {
  for (const stage of CUSTOMER_STAGES) {
    const text = `${CUSTOMER_STAGE_LABELS[stage]} ${customerStatus(stage === "funded" ? "funded" : stage === "closed" ? "closed" : "draft").description}`.toLowerCase();
    for (const word of FORBIDDEN_CUSTOMER_WORDS) {
      assert.ok(!text.includes(word), `"${word}" in ${stage}: ${text}`);
    }
  }
});

