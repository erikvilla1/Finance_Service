import type { Metadata } from "next";
import { Container, Section } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

/**
 * ⚠️  DRAFT — NOT REVIEWED BY COUNSEL. Platform spec §29.
 *
 * WHAT THIS IS. A substantive first draft written from what the application
 * actually does, not from a template. Every factual claim below was checked
 * against the schema and the code:
 *
 *   - the data listed in "What we collect" is the union of contact_submissions,
 *     profiles, businesses, application_owners, documents and consents;
 *   - "we store only the last four digits" is true — funding-application/fields
 *     marks the full SSN as signer-input, never persisted, and the only stored
 *     column is owner.ssn_last4;
 *   - "no advertising or analytics trackers" is true as of this commit: there
 *     is no gtag, GA, Segment, PostHog, Meta pixel or similar anywhere in src/,
 *     and the only cookies set are Supabase's auth cookies;
 *   - the consents table records IP address and user agent, so that is
 *     disclosed rather than omitted.
 *
 * WHY IT STILL NEEDS A LAWYER. A privacy policy is a representation about a
 * company's actual practices. Getting it wrong is a deceptive act under FTC Act
 * §5 regardless of intent. The parts I cannot verify from code are marked in
 * [BRACKETS] on the page — they are deliberately visible so this cannot ship
 * unnoticed. Retention periods, the legal entity, the state-law rights section
 * and any sale/sharing of data are Robert's facts to state, not mine to guess.
 *
 * ALSO OUTSTANDING: if FLS serves California or other states with commercial
 * financing disclosure laws, this policy is not the whole obligation. See the
 * note on /disclosures.
 */

const H = "mt-10 text-xl font-semibold tracking-tight text-ink-900";
const P = "mt-4 leading-relaxed text-ink-600";
const UL = "mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink-600";

export default function Page() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50">
        <Container>
          <div className="py-16 sm:py-20">
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-ink-900 sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
              How we collect, use, and protect your information.
            </p>
            <p className="mt-3 text-sm text-ink-500">
              Last updated [DATE] · Effective [DATE]
            </p>
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <div className="max-w-3xl">
            <p className={P}>
              This policy explains what Financial Lending Specialists
              (&ldquo;FLS,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) collects
              when you use this website, why we collect it, and who we share it
              with. It applies to this site and to the application portal.
            </p>

            <h2 className={H}>Information you give us</h2>
            <p className={P}>
              Most of what we hold is information you enter yourself:
            </p>
            <ul className={UL}>
              <li>
                <strong className="font-semibold text-ink-800">
                  Contact details
                </strong>{" "}
                — your name, email address, phone number, and the content of any
                message you send us.
              </li>
              <li>
                <strong className="font-semibold text-ink-800">
                  Business information
                </strong>{" "}
                — your business&apos;s legal name, industry, time in business,
                revenue, existing obligations, and assets, as you report them.
              </li>
              <li>
                <strong className="font-semibold text-ink-800">
                  Owner information
                </strong>{" "}
                — name, contact details, ownership percentage, and the last four
                digits of a Social Security number where a funding source
                requires it. We do not store a full Social Security number.
              </li>
              <li>
                <strong className="font-semibold text-ink-800">
                  Documents you upload
                </strong>{" "}
                — for example bank statements, tax returns, or invoices, when a
                specific file requires them.
              </li>
              <li>
                <strong className="font-semibold text-ink-800">
                  Account details
                </strong>{" "}
                — your email address and password if you create an account.
                Passwords are hashed by our authentication provider; we never
                see or store them in readable form.
              </li>
            </ul>

            <h2 className={H}>Information collected automatically</h2>
            <p className={P}>
              When you agree to something on the site — a consent or an
              authorization — we record the date and time, the wording you were
              shown, your IP address, and your browser&apos;s user-agent string.
              That record exists so we can show what was agreed to and when.
            </p>
            <p className={P}>
              We do not use advertising trackers, analytics pixels, or
              third-party marketing cookies on this site. The only cookies set
              are the ones required to keep you signed in.
            </p>

            <h2 className={H}>Why we use it</h2>
            <ul className={UL}>
              <li>To respond to your enquiry.</li>
              <li>
                To produce indicative financing estimates from the information
                you provide.
              </li>
              <li>
                To prepare and submit an application to funding sources on your
                behalf, when you ask us to.
              </li>
              <li>To keep you updated on the status of a file.</li>
              <li>
                To keep records we are required to keep, and to detect and
                prevent fraud.
              </li>
            </ul>

            <h2 className={H}>Who we share it with</h2>
            <p className={P}>
              We are a broker. Arranging financing means giving your information
              to third parties, and you should assume the following:
            </p>
            <ul className={UL}>
              <li>
                <strong className="font-semibold text-ink-800">
                  Funding sources.
                </strong>{" "}
                When you ask us to seek financing, we share your application and
                supporting documents with lenders and funders we believe fit
                your situation. Each of them handles your information under
                their own privacy policy, which we do not control.
              </li>
              <li>
                <strong className="font-semibold text-ink-800">
                  Service providers.
                </strong>{" "}
                Companies that host this site, store our database and documents,
                and send transactional email act on our instructions.
              </li>
              <li>
                <strong className="font-semibold text-ink-800">
                  Legal and safety.
                </strong>{" "}
                Where we are required to by law, or to establish or defend legal
                claims.
              </li>
            </ul>
            <p className={P}>
              [CONFIRM: whether FLS sells personal information, shares it for
              cross-context behavioural advertising, or discloses it to any
              party other than those above. If none, this section should say so
              explicitly — that is a meaningful statement and several state laws
              require it either way.]
            </p>

            <h2 className={H}>How long we keep it</h2>
            <p className={P}>
              [CONFIRM RETENTION PERIODS. State how long application records,
              uploaded documents, contact messages, and consent records are
              retained, and what happens to them after that. This must reflect
              what actually happens, including any record-keeping obligations
              that apply to a commercial finance broker.]
            </p>

            <h2 className={H}>Security</h2>
            <p className={P}>
              Access to application data is restricted to the account it belongs
              to and to FLS staff who need it to work your file. Documents are
              stored in access-controlled storage. Traffic to this site is
              encrypted in transit. No system is perfectly secure, and we cannot
              guarantee that unauthorised access will never occur.
            </p>

            <h2 className={H}>Your choices and rights</h2>
            <p className={P}>
              You can ask us for a copy of the information we hold about you,
              ask us to correct it, or ask us to delete it. We may need to keep
              some records where the law requires it.
            </p>
            <p className={P}>
              [CONFIRM STATE-LAW RIGHTS. Depending on where FLS operates and
              where its clients are, California (CCPA/CPRA), and other state
              privacy statutes may grant specific rights and require specific
              response timelines and a designated request channel. Counsel
              should determine which apply and add the required language.]
            </p>

            <h2 className={H}>Children</h2>
            <p className={P}>
              This site is for business financing and is not directed to anyone
              under 18. We do not knowingly collect information from children.
            </p>

            <h2 className={H}>Changes</h2>
            <p className={P}>
              If we change this policy we will update the date at the top of
              this page.
            </p>

            <h2 className={H}>Contact</h2>
            <p className={P}>
              Questions about this policy, or requests about your information:
              [PRIVACY CONTACT EMAIL] · [BUSINESS MAILING ADDRESS] ·
              [LEGAL ENTITY NAME AND STATE OF FORMATION].
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
