import { FCRA_AUTHORIZATION_V1 } from "@/lib/funding-application/consent-text";
import type { CompletenessContext } from "@/lib/funding-application/fields";
import type { ExistingDebtRow } from "@/types/database";

/**
 * The funding application, prefilled, as a sheet of the paper form.
 *
 * One component, two audiences:
 *
 *   • The admin print route renders it in `paper` mode — signature rules and
 *     the authorization text included — for the applicant who asked to sign by
 *     hand.
 *   • The portal sign page renders it in `review` mode above the signature
 *     form, so the applicant reads the actual document before signing it. The
 *     signature form already presents the consents and captures the mark, so
 *     this mode leaves both off rather than saying them twice.
 *
 * The generated PDF (lib/funding-application/pdf.ts) draws this same layout
 * with pdf-lib. If a row changes here, change it there — the applicant must
 * sign what they were shown.
 *
 * SIGNER FIELDS ARE RENDERED BLANK ON PURPOSE. Tax ID, both SSNs, and the
 * signatures are ruled lines: on paper the applicant completes them by hand,
 * and in the portal they are typed at signing and drawn straight into the
 * signed PDF. We do not hold those values (BUSINESS_CONTEXT §14.1b), so there
 * is nothing here to accidentally render.
 */
export function FundingApplicationSheet({
  context,
  debts,
  referenceCode,
  mode = "paper",
}: {
  context: CompletenessContext;
  debts: ExistingDebtRow[];
  referenceCode: string | null;
  mode?: "paper" | "review";
}) {
  const app = context.application ?? {};
  const biz = context.business ?? {};
  const owners = context.owners;

  const v = (value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const money = (value: unknown): string => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <div>
      <header className="border-b-2 border-ink-900 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">Funding Application</h1>
          <span className="font-mono text-sm">{referenceCode}</span>
        </div>
        <p className="mt-1 text-sm text-ink-600">
          Financial Lending Specialists, Inc. — please complete all applicable fields
        </p>
      </header>

      {/* ------------------------------------------------------------ BUSINESS */}
      <Section title="Business">
        <Row>
          <Cell label="Business Legal Name" value={v(biz.legal_name)} width="2/3" />
          <Cell label="Business DBA" value={v(biz.dba)} />
        </Row>
        <Row>
          <Cell label="State of Incorporation" value={v(biz.state_of_incorporation)} />
          <Cell label="Tax ID Number" value="" signer />
          <Cell label="Business Start Date" value={v(biz.business_start_date)} />
          <Cell label="Industry Type" value={v(biz.industry)} />
        </Row>
        <Row>
          <Cell label="Business Entity Type" value={v(biz.entity_type).replaceAll("_", " ")} width="2/3" />
          <Cell label="Web Address" value={v(biz.website)} />
        </Row>
        <Row>
          <Cell label="Location Phone" value={v(biz.phone)} />
          <Cell label="Preferred Contact Phone" value={v(biz.preferred_contact_phone)} />
          <Cell label="Business Email Address" value={v(biz.email)} width="2/3" />
        </Row>
        <Row>
          <Cell label="Physical Street Address" value={v(biz.address_line1)} width="2/3" />
          <Cell label="City" value={v(biz.city)} />
          <Cell label="State" value={v(biz.state)} />
          <Cell label="Zip" value={v(biz.postal_code)} />
        </Row>
        <Row>
          <Cell label="Billing Address (if different)" value={v(biz.billing_address_line1)} width="2/3" />
          <Cell label="City" value={v(biz.billing_city)} />
          <Cell label="State" value={v(biz.billing_state)} />
          <Cell label="Zip" value={v(biz.billing_postal_code)} />
        </Row>
        <Row>
          <Cell label="Premises" value={v(biz.premises_status)} />
          <Cell label="Monthly Payment" value={money(biz.premises_monthly_payment)} />
          <Cell label="Landlord Name" value={v(biz.landlord_name)} />
          <Cell label="Landlord Phone" value={v(biz.landlord_phone)} />
        </Row>
      </Section>

      {/* ---------------------------------------------------------- FINANCIALS */}
      <Section title="Financial snapshot">
        <Row>
          <Cell label="Gross Annual Sales" value={money(app.gross_annual_sales)} />
          <Cell label="Average Monthly Credit Card Volume" value={money(app.avg_monthly_card_volume)} width="2/3" />
          <Cell label="Credit Card Processor" value={v(app.credit_card_processor)} />
        </Row>
        <Row>
          <Cell label="Open MCA or Loan Accounts?" value={v(app.has_existing_mca)} />
          <Cell label="Open judgments or tax liens?" value={v(app.has_open_judgments_or_liens)} />
          <Cell label="Balance" value={money(app.judgment_lien_balance)} />
          <Cell label="Bankruptcies?" value={v(app.has_bankruptcy)} />
          <Cell label="Year" value={v(app.bankruptcy_year)} />
        </Row>

        {debts.length > 0 && (
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink-300 text-left">
                <th className="py-1 font-semibold">Lender</th>
                <th className="py-1 font-semibold">Balance</th>
                <th className="py-1 font-semibold">Monthly payment</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => (
                <tr key={debt.id} className="border-b border-ink-100">
                  <td className="py-1">{debt.lender_name}</td>
                  <td className="py-1">{money(debt.balance)}</td>
                  <td className="py-1">{money(debt.monthly_payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* --------------------------------------------------------------- OWNERS */}
      {[0, 1].map((index) => {
        const owner = owners[index];
        // The second block prints blank rather than being omitted — a sole owner
        // today may add a partner before signing, and lenders expect the block.
        if (index === 1 && !owner && owners.length <= 1) return null;

        return (
          <Section key={index} title={index === 0 ? "Primary Owner / Officer" : "Secondary Owner / Officer"}>
            <Row>
              <Cell label="First Name" value={v(owner?.first_name)} />
              <Cell label="Last Name" value={v(owner?.last_name)} />
              <Cell label="Title" value={v(owner?.title)} />
              <Cell label="% of Ownership" value={owner?.ownership_pct ? `${owner.ownership_pct}%` : ""} />
            </Row>
            <Row>
              <Cell label="SS#" value="" signer />
              <Cell label="Date of Birth" value={v(owner?.date_of_birth)} />
              <Cell label="Home Phone" value={v(owner?.home_phone)} />
              <Cell label="Mobile Phone" value={v(owner?.mobile_phone)} />
            </Row>
            <Row>
              <Cell label="Email Address" value={v(owner?.email)} width="2/3" />
              <Cell label="Home Address" value={v(owner?.home_address_line1)} width="2/3" />
            </Row>
            <Row>
              <Cell label="City" value={v(owner?.home_city)} />
              <Cell label="State" value={v(owner?.home_state)} />
              <Cell label="Zip" value={v(owner?.home_postal_code)} />
            </Row>
          </Section>
        );
      })}

      {/* -------------------------------------------------------------- REQUEST */}
      <Section title="The request">
        <Row>
          <Cell label="Use of funds" value={v(app.use_of_funds)} width="2/3" />
          <Cell label="Desired Loan Amount" value={money(app.requested_amount)} />
        </Row>
      </Section>

      {mode === "paper" && (
        <>
          {/* ---------------------------------------------------- AUTHORIZATION */}
          <section className="mt-6 break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide">Authorization</h2>
            <p className="mt-2 text-[10px] leading-snug text-ink-800">
              {FCRA_AUTHORIZATION_V1.body}
            </p>
            <p className="mt-1 text-[9px] text-ink-500">
              Authorization version {FCRA_AUTHORIZATION_V1.version}
            </p>
          </section>

          {/* -------------------------------------------------------- SIGNATURE */}
          <section className="mt-8 break-inside-avoid">
            {[0, 1].map((index) => {
              if (index === 1 && owners.length <= 1) return null;
              const label = index === 0 ? "Primary" : "Secondary";
              return (
                <div key={index} className="mb-8 grid grid-cols-3 gap-6">
                  <SignatureLine label={`${label} Owner/Officer Print`} />
                  <SignatureLine label={`${label} Owner/Officer Signature`} />
                  <SignatureLine label="Date" />
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-2 border-b border-ink-300 pb-1 text-sm font-bold uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-2">{children}</div>;
}

/**
 * `signer` marks a field the applicant completes on the executed document.
 * It renders a ruled blank and never accepts a value — the prop is not even
 * read, which is the point.
 */
function Cell({
  label, value, width, signer,
}: {
  label: string;
  value: string;
  width?: "2/3";
  signer?: boolean;
}) {
  return (
    <div className={width === "2/3" ? "min-w-[14rem] flex-[2]" : "min-w-[7rem] flex-1"}>
      <div className="text-[9px] uppercase tracking-wide text-ink-500">{label}</div>
      <div
        className={
          signer
            ? "mt-0.5 min-h-[1.15rem] border-b border-dashed border-ink-400"
            : "mt-0.5 min-h-[1.15rem] border-b border-ink-200 text-sm"
        }
      >
        {signer ? "" : value}
      </div>
    </div>
  );
}

function SignatureLine({ label }: { label: string }) {
  return (
    <div>
      <div className="min-h-[2rem] border-b border-ink-900" />
      <div className="mt-1 text-[9px] uppercase tracking-wide text-ink-600">{label}</div>
    </div>
  );
}
