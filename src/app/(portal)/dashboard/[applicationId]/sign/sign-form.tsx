"use client";

import { useActionState, useState } from "react";
import { SignaturePad } from "@ark-ui/react/signature-pad";
import { Button, Field, Input } from "@/components/ui";
import type { ConsentTextVersion } from "@/lib/funding-application/consent-text";
import { signAction, type SignState } from "./actions";

/**
 * Signing the funding application.
 *
 * Built on Ark UI's signature pad. Capturing a signature has more edge cases
 * than it looks like — stylus pressure, touch scrolling fighting the stroke,
 * high-DPI canvases producing a mark at the wrong scale — and getting any of
 * them wrong is invisible until somebody cannot sign.
 *
 * The mark is captured on every `onDrawEnd` as a PNG data URL and carried in a
 * hidden input. The server draws it into the PDF; the browser never produces
 * the document itself, because a client that hands back a finished PDF is a
 * client that can hand back any PDF.
 *
 * Both agreements are separate checkboxes on purpose. The FCRA authorization is
 * Robert's wording and covers the credit pull; the ESIGN consent is agreement to
 * transact electronically at all. Bundling them into one tick is the most common
 * way an electronic signature turns out not to be one.
 */
export function SignForm({
  applicationId,
  fcra,
  esign,
  defaultName,
  defaultTitle,
}: {
  applicationId: string;
  fcra: ConsentTextVersion;
  esign: ConsentTextVersion;
  defaultName: string;
  defaultTitle: string;
}) {
  const [state, formAction, pending] = useActionState<SignState, FormData>(
    signAction,
    {},
  );

  const [signature, setSignature] = useState("");
  const [name, setName] = useState(defaultName);
  const [title, setTitle] = useState(defaultTitle);
  const [ssn, setSsn] = useState("");
  const [taxId, setTaxId] = useState("");
  const [agreedFcra, setAgreedFcra] = useState(false);
  const [agreedESign, setAgreedESign] = useState(false);

  const ready =
    signature.length > 0 && name.trim().length > 0 && agreedFcra && agreedESign;

  if (state.signed) {
    return (
      <div className="rounded-lg bg-success-50 p-5">
        <p className="text-base font-semibold text-success-700">
          Signed. Thank you.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">
          Your signed application has been added to your documents, and your
          specialist has it. There is nothing else you need to do right now.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="application_id" value={applicationId} />
      <input type="hidden" name="signature" value={signature} />

      {/* ------------------------------------------------------- agreements */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">
          What you&apos;re agreeing to
        </h2>

        <ConsentBlock consent={fcra} label="Authorization" />
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-ink-50 p-4">
          <input
            type="checkbox"
            name="agree_fcra"
            checked={agreedFcra}
            onChange={(event) => setAgreedFcra(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-sm leading-relaxed text-ink-800">
            I have read the authorization above and I agree to it.
          </span>
        </label>

        <ConsentBlock consent={esign} label="Signing electronically" />
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-ink-50 p-4">
          <input
            type="checkbox"
            name="agree_esign"
            checked={agreedESign}
            onChange={(event) => setAgreedESign(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span className="text-sm leading-relaxed text-ink-800">
            I agree to sign electronically and to receive documents this way.
          </span>
        </label>
      </section>

      {/* ------------------------------------------------- signer-only fields */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">
          Details for the signed form
        </h2>
        <p className="text-sm leading-relaxed text-ink-600">
          These appear on the signed document only. We don&apos;t keep them in
          your account — the last four digits of the Tax ID are the only part
          stored, so your specialist can match your file.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your full name" htmlFor="signer_name" required>
            <Input
              id="signer_name"
              name="signer_name"
              value={name}
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Field label="Your title" htmlFor="signer_title" hint="Owner, President, Managing Member">
            <Input
              id="signer_title"
              name="signer_title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field label="Tax ID number" htmlFor="tax_id">
            <Input
              id="tax_id"
              name="tax_id"
              value={taxId}
              inputMode="numeric"
              placeholder="12-3456789"
              onChange={(event) => setTaxId(event.target.value)}
            />
          </Field>

          <Field label="Social Security number" htmlFor="ssn">
            <Input
              id="ssn"
              name="ssn"
              value={ssn}
              inputMode="numeric"
              placeholder="123-45-6789"
              onChange={(event) => setSsn(event.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ---------------------------------------------------------- the mark */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink-900">Your signature</h2>

        <SignaturePad.Root
          onDrawEnd={(details) => {
            void details.getDataUrl("image/png").then(setSignature);
          }}
        >
          <SignaturePad.Label className="sr-only">
            Draw your signature
          </SignaturePad.Label>

          <SignaturePad.Control className="relative h-40 w-full rounded-lg bg-white ring-1 ring-inset ring-ink-300">
            <SignaturePad.Segment className="h-full w-full fill-ink-900 stroke-ink-900" />

            <SignaturePad.ClearTrigger
              onClick={() => setSignature("")}
              className="absolute right-2 top-2 rounded bg-ink-100 px-2 py-1 text-xs font-medium text-ink-600 hover:bg-ink-200"
            >
              Clear
            </SignaturePad.ClearTrigger>

            <SignaturePad.Guide className="absolute bottom-6 left-4 right-4 border-b border-dashed border-ink-300" />
          </SignaturePad.Control>
        </SignaturePad.Root>

        <p className="text-sm text-ink-500">
          {signature
            ? "Signature captured. Clear it if you want to sign again."
            : "Draw your signature above using your finger, stylus or mouse."}
        </p>
      </section>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg bg-danger-50 p-4 text-sm font-medium text-danger-700"
        >
          {state.error}
        </p>
      )}

      <div className="border-t border-ink-100 pt-5">
        <Button type="submit" size="lg" disabled={!ready || pending}>
          {pending ? "Signing…" : "Sign and submit"}
        </Button>
        {!ready && (
          <p className="mt-2 text-sm text-ink-500">
            Both agreements, your name and a signature are needed before you can
            submit.
          </p>
        )}
      </div>
    </form>
  );
}

function ConsentBlock({
  consent,
  label,
}: {
  consent: ConsentTextVersion;
  label: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </p>
      {/*
        Scrollable rather than collapsed. Someone can decline to read it, but
        nobody should have to go looking for it — and a signature against text
        that was never on screen is the weakest kind.
      */}
      <div className="max-h-48 overflow-y-auto rounded-lg bg-white p-4 text-xs leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200">
        {consent.body}
      </div>
    </div>
  );
}
