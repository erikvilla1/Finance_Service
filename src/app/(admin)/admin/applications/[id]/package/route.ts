import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildLenderPackage } from "@/lib/funding-application/package";

/**
 * Download the lender package as a zip.
 *
 * A route handler rather than a server action: the response is a file, and
 * actions return values to React rather than streams to a browser.
 *
 * THE STAFF CHECK IS THIS FILE'S JOB, and it is not decoration. The assembly it
 * calls runs on the service role — it has to, to read a dozen files out of a
 * private bucket in one request — so RLS is not standing behind it the way it
 * stands behind every other read in the app. Everything downstream of this
 * function trusts that the check above it happened.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Not signed in.", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "customer") {
    return new NextResponse("Not permitted.", { status: 403 });
  }

  const result = await buildLenderPackage(id);

  if (!result) {
    return new NextResponse("No such application.", { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.zip), {
    headers: {
      "Content-Type": "application/zip",
      // The filename carries the reference code and the business, so a folder
      // of these is readable without opening any of them.
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Content-Length": String(result.zip.length),
      // Contains bank statements and tax returns. Never cached, anywhere.
      "Cache-Control": "no-store, private",
    },
  });
}
