import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Disclosures" };

/**
 * ⚠️  DRAFT — NOT REVIEWED BY COUNSEL. Platform spec §29.
 *
 * THE ITEM THAT NEEDS A DECISION, NOT JUST A REVIEW:
 *
 * Several states now impose specific, formatted disclosure obligations on
 * commercial financing — and in some of them the obligation reaches brokers,
 * not only funders. California (SB 1235, with DFPI regulations in force since
 * December 2022) and New York (Commercial Finance Disclosure Law, in force
 * since August 2023) are the two with the most developed regimes, and other
 * states have since adopted their own. They can require a prescribed
 * disclosure table at the time an offer is presented, and in some cases
 * disclosure of broker compensation.
 *
 * That is not something a page of general prose satisfies. If FLS presents
 * offers to businesses in those states, counsel needs to determine which
 * regimes apply, whether FLS is a covered party under each, and what the
 * required format is. This page should then say what those rules require it to
 * say. Until that determination is made, the section below is marked rather
 * than filled in — writing plausible-sounding disclosure language for a
 * regulated activity is worse than leaving the gap visible.
 *
 * Everything else here restates positions the product already takes: broker not
 * lender, estimates are not offers, no credit pull at pre-qualification. Those
 * are safe because they describe how the system actually behaves.
 */

const H = "mt-10 text-xl font-semibold tracking-tight text-ink-900";
const P = "mt-4 leading-relaxed text-ink-600";

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Disclosures
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              Important information about our role and the financing process.
            </p>
            <p className="mt-3 text-sm text-ink-500">Last updated [DATE]</p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <h2 className={H}>We are a broker, not a lender</h2>
            <p className={P}>
              Financial Lending Specialists arranges financing through
              third-party funding sources. We do not lend money and we do not
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
              [CONFIRM AND STATE. Describe plainly how FLS is compensated — for
              example whether a commission is paid by the funding source, and
              whether any fee is charged to the client. Several states now
              require broker compensation to be disclosed in commercial
              financing transactions, and a clear statement here is good
              practice regardless.]
            </p>

            <h2 className={H}>State commercial financing disclosures</h2>
            <p className={P}>
              [COUNSEL TO DETERMINE AND COMPLETE. Several states — including
              California and New York — require specific, formatted disclosures
              for commercial financing transactions, and in some cases those
              obligations reach brokers as well as funders. Which regimes apply
              depends on where FLS operates and where its clients are located.
              This section should set out what those rules require, in the form
              they require.]
            </p>

            <h2 className={H}>Licensing</h2>
            <p className={P}>
              [CONFIRM AND STATE. List any state licences or registrations FLS
              holds, with licence numbers, and the states in which it operates.
              If a state requires a licence FLS does not hold, that needs
              resolving before operating there.]
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
              [LEGAL ENTITY NAME] · [BUSINESS MAILING ADDRESS] ·
              [CONTACT EMAIL AND PHONE]
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
