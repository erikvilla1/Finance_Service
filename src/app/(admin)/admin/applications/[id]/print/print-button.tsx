"use client";

import { Button } from "@/components/ui";

/**
 * Opens the browser print dialog.
 *
 * The only client component on the page — everything else is server-rendered,
 * so the document is fully formed before any JavaScript runs. If scripting
 * fails the page still prints correctly via Ctrl+P.
 */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Print / Save as PDF
    </Button>
  );
}
