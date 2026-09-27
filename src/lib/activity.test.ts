import { test } from "node:test";
import assert from "node:assert/strict";
import { buildActivity, timeAgo } from "./activity";

const doc = (id: string, uploadedAt: string, extra: Partial<{ verifiedAt: string | null; status: string; source: string }> = {}) => ({
  id,
  uploadedAt,
  verifiedAt: null,
  status: "uploaded",
  source: "applicant_upload",
  ...extra,
}) as never;

test("activity: uploads close together are one line, newest first", () => {
  const events = buildActivity({
    startedAt: "2026-09-26T10:00:00Z",
    applicationUpdatedAt: "2026-09-26T11:00:00Z",
    applicationComplete: true,
    items: [
      {
        label: "Bank Statements",
        documents: [doc("a", "2026-09-26T12:00:00Z"), doc("b", "2026-09-26T12:01:00Z"), doc("c", "2026-09-26T12:02:00Z")],
      },
    ],
  });
  assert.deepEqual(
    events.map((e) => e.text),
    ["You uploaded 3 files for Bank Statements", "You completed your application", "You started your application"],
  );
});

test("activity: a specialist's accept and return show; staff uploads don't", () => {
  const events = buildActivity({
    startedAt: "2026-09-26T10:00:00Z",
    applicationUpdatedAt: null,
    applicationComplete: false,
    items: [
      { label: "Tax Returns", documents: [doc("a", "2026-09-26T11:00:00Z", { status: "accepted", verifiedAt: "2026-09-26T13:00:00Z" })] },
      { label: "ID", documents: [doc("b", "2026-09-26T11:00:00Z", { status: "rejected", verifiedAt: "2026-09-26T14:00:00Z" })] },
      { label: "Lease", documents: [doc("c", "2026-09-26T11:30:00Z", { source: "staff_upload" })] },
    ],
  });
  const texts = events.map((e) => e.text);
  assert.equal(texts[0], "Another copy of ID needed");
  assert.equal(texts[1], "Tax Returns accepted");
  assert.ok(!texts.some((t) => t.includes("Lease")));
});

test("activity: time ago", () => {
  const now = Date.parse("2026-09-26T12:00:00Z");
  assert.equal(timeAgo("2026-09-26T11:59:30Z", now), "Just now");
  assert.equal(timeAgo("2026-09-26T11:48:00Z", now), "12 min ago");
  assert.equal(timeAgo("2026-09-26T09:00:00Z", now), "3 hours ago");
  assert.equal(timeAgo("2026-09-25T10:00:00Z", now), "Yesterday");
  assert.equal(timeAgo("2026-09-22T12:00:00Z", now), "4 days ago");
});
