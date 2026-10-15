import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildDebtScheduleTemplate,
  debtScheduleFilename,
} from "@/lib/documents/debt-schedule-template";

/**
 * Download the Business Debt Schedule template, prefilled for this application.
 *
 * A route handler because the response is a file. It runs entirely on the
 * caller's own client: the application lookup carries the profile_id filter
 * the portal pages use (see documents/page.tsx for why that is here and not
 * left to RLS), and the business and debt reads underneath it are scoped by
 * the policies in 0012 and 0014. There is no service role in this path.
 *
 * Nothing is written. Downloading the form is not a document event; the
 * upload that follows is.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Not signed in.", { status: 401 });
  }

  const { data: application } = await supabase
    .from("applications")
    .select("id, business_id")
    .eq("id", applicationId)
    .eq("profile_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!application) {
    return new NextResponse("No such application.", { status: 404 });
  }

  const [business, debts] = await Promise.all([
    application.business_id
      ? supabase
          .from("businesses")
          .select("legal_name")
          .eq("id", application.business_id)
          .maybeSingle()
          .then(({ data }) => data)
      : Promise.resolve(null),
    supabase
      .from("existing_debts")
      .select("lender_name, debt_type, original_amount, balance, monthly_payment")
      .eq("application_id", applicationId)
      .order("position", { nullsFirst: false })
      .order("created_at")
      .then(({ data }) => data ?? []),
  ]);

  const businessName = business?.legal_name ?? null;
  const bytes = await buildDebtScheduleTemplate({ businessName, debts });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${debtScheduleFilename(businessName)}"`,
      "Content-Length": String(bytes.length),
      // Carries whatever obligations they have already entered. Never cached.
      "Cache-Control": "no-store, private",
    },
  });
}
