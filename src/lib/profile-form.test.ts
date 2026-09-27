import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProfileForm } from "./profile-form";

const form = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

test("profile: tidies the name and formats the phone", () => {
  const { values, errors } = parseProfileForm(form({ full_name: "  Kai   Saucedo ", phone: "1 310.555.1234" }));
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { fullName: "Kai Saucedo", phone: "(310) 555-1234" });
});

test("profile: a phone number is optional", () => {
  const { values, errors } = parseProfileForm(form({ full_name: "Kai Saucedo", phone: "  " }));
  assert.deepEqual(errors, {});
  assert.equal(values.phone, null);
});

test("profile: a name is required and a short phone number is refused", () => {
  const { errors } = parseProfileForm(form({ full_name: "   ", phone: "555-1234" }));
  assert.equal(errors.full_name, "Enter your full name.");
  assert.match(errors.phone ?? "", /too short/);
});

test("profile: an over-long name is refused", () => {
  const { errors } = parseProfileForm(form({ full_name: "x".repeat(121) }));
  assert.match(errors.full_name ?? "", /under 120/);
});
