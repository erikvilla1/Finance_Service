import type { Metadata } from "next";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "Disclosures" };

/**
 * ⚠️  DRAFT — NOT REVIEWED BY COUNSEL. Platform spec §29.
 *
 * STATE COMMERCIAL FINANCING DISCLOSURE LAWS. California (SB 1235, DFPI
 * regulations in force since December 2022) and New York (Commercial Finance
 * Disclosure Law, in force since August 2023) require a prescribed disclosure
 * table — total cost of financing, estimated APR — at the time a commercial
 * financing offer is made, and other states have since adopted similar
 * regimes. That table is transaction-specific: it depends on the amount,
 * rate, and term of a particular offer, so it cannot live as static text on
 * this page. The section below states who is responsible for providing it
 * (the funding source making the offer) and FLS's role (facilitating that,
 * not issuing it) — the general position, not the prescribed table itself.
 * Counsel should confirm this framing holds for every state FLS operates in.
 *
 * NO LICENSING SECTION. FLS does not hold, and does not represent that it
 * holds, any state lending or financing-broker licence — nothing here should
 * claim one. If FLS begins operating in a state that requires one, that is
 * an operational decision to resolve before entering that state, not a page
 * edit.
 *
 * Everything else here restates positions the product already takes: broker not
 * lender, estimates are not offers, no credit pull at pre-qualification. Those
 * are safe because they describe how the system actually behaves.
 *
 * MOVED UNDER (application), NOT (marketing). See the note on the Privacy
 * Policy page — same reasoning, same background and header, same reason the
 * old tinted hero band is gone.
 */

const H = "mt-10 text-xl font-semibold tracking-tight text-ink-900";
const P = "mt-4 leading-relaxed text-ink-600";

export default function Page() {
  return (
    <Container>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Disclosures
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-600">
          Important information about our role and the financing process.
        </p>
        <p className="mt-3 text-sm text-ink-500">Last updated September 14, 2026</p>

        <div className="mt-12">
          <h2 className={H}>We are a broker, not a lender</h2>
          <p className={P}>
            Financial Lending Specialists D.B.A. FLS Capital Advisors
            arranges financing through third-party funding sources. We do
            not lend money and we do not
            make credit decisions. Every approval, decline, and set of terms
            comes from the funding source, under its own underwriting
            criteria.
          </p>

          <h2 className={H}>Nothing on this site is an offer of credit</h2>
          <p className={P}>
            Program descriptions, amount ranges, and any estimate produced by
            the pre-qualification questions are indicative only. They are
            based on unverified information you provide and do not constitute
            a commitment to lend, an offer, a pre-approval, or a guarantee of
            any particular amount, rate, or term. All financing is subject to
            qualification, funding-source review, documentation, and program
            availability.
          </p>

          <h2 className={H}>Pre-qualification does not affect your credit</h2>
          <p className={P}>
            The questions in the pre-qualification flow do not trigger a
            credit inquiry. Nothing you answer there is reported to a credit
            bureau. If you go on to submit a full application, a funding
            source may run a credit check as part of its own process — that
            step is theirs, and it will be disclosed to you before it happens.
          </p>

          <h2 className={H}>Program terms change</h2>
          <p className={P}>
            Rates, amounts, terms, and eligibility criteria are set by funding
            sources and change without notice. Materials on this site,
            including downloadable program sheets, describe programs generally
            and may not reflect current terms.
          </p>

          <h2 className={H}>How we are paid</h2>
          <p className={P}>
            FLS is compensated by the funding source that ultimately provides
            your financing, typically through a commission or fee paid at
            closing. We do not charge you a fee to prepare, submit, or shop
            your application. Compensation may vary by funding source and by
            program, which can affect which offers we bring to you — you are
            never obligated to accept any offer we present.
          </p>

          <h2 className={H}>State commercial financing disclosures</h2>
          <p className={P}>
            California, New York, and a small number of other states require
            a specific, formatted disclosure — covering figures like the
            total cost of financing and the estimated annual percentage rate
            — to be given at the time a commercial financing offer is made.
            Where that requirement applies to an offer arranged through FLS,
            the funding source making the offer provides it, in the form the
            applicable law requires, before you accept. FLS&apos;s role is to
            facilitate that process, not to issue the disclosure itself.
          </p>

          <h2 className={H}>Equal opportunity</h2>
          <p className={P}>
            We do not discriminate on any basis prohibited by law. If a
            funding source declines an application, it — not FLS — is
            responsible for providing any notice of the reasons that the law
            requires.
          </p>

          <h2 className={H}>Contact</h2>
          <p className={P}>
            Financial Lending Specialists, Inc. D.B.A. FLS Capital Advisors ·
            [BUSINESS MAILING ADDRESS] · [CONTACT EMAIL AND PHONE]
          </p>
        </div>
      </div>
    </Container>
  );
}
