/**
 * Authorization language from Robert's funding application.
 *
 * BUSINESS_CONTEXT §12: "his applications already carry the correct FCRA
 * authorization language — reuse it, don't improvise." This is that text,
 * transcribed verbatim from Funding_Application_Fillable.docx.
 *
 * DO NOT EDIT THE WORDING. If it needs to change, add a new version below and
 * leave this one in place. The `consents` table records which version a person
 * accepted, and that record is worthless if the text behind a version can move.
 *
 * Not reviewed by counsel for online use. Platform spec §29 requires that
 * review before launch — the wording is Robert's, but presenting it in a web
 * flow rather than on paper is a different context.
 */

export interface ConsentTextVersion {
  version: string;
  effectiveFrom: string;
  /** Which consent_type enum value this satisfies. */
  consentType: "fcra_authorization" | "terms_of_use";
  source: string;
  body: string;
}

export const FCRA_AUTHORIZATION_V1: ConsentTextVersion = {
  version: "fcra-2026-08-05",
  effectiveFrom: "2026-08-05",
  consentType: "fcra_authorization",
  source: "Funding_Application_Fillable.docx",
  body: `Each of the undersigned owner(s) submit this application for a financing facility on behalf of the applicant business. Each of the undersigned certify that there are no misrepresentations in this application or in any documents submitted in connection therewith, that all such information and documentation submitted is true, complete and accurate and does not omit any material information. The undersigned each agree that any funds made available pursuant to a financing facility will used only for the applicant's working capital and not for any illegal purpose. By each undersigned's signature below, Financial Lending Specialists, Inc ("FLS") is hereby authorized to obtain (i) a consumer credit report through a credit agency chosen by FLS for purposes of FLS's due diligence as part of the credit approval process of the financing facility for the applicant; and (ii) information from any third party and to make any other investigation of credit, either directly or indirectly through any agent of FLS on applicant and/or each of the undersigned. Each of the undersigned grants permission for the release and/or disclosure of financial information to a credit reporting agency or other third party as to FLS's experience or transactions with applicant and/or the undersigned. Each of the undersigned understands that FLS will retain and rely on this application and any other credit or financial information FLS receives, even if a financing facility is not approved. These representations and authorizations and the documents submitted in connection with or related to this application and any potential facility may be relied on by FLS, any insurer of credit and any third party to whom FLS may sell / assign all or part of a financing facility. The undersigned each further authorize FLS to provide and/or disclosure to any such insurer or third party any information and documentation that such party may request with respect to the application or facility. If an adverse decision is made, in whole or in part, due to the information on a consumer report, a summary of the respective undersigned's rights under the Fair Credit Reporting Act and the source of the information will be provided by FLS.`,
};

/**
 * The tick box on the account-creation screen.
 *
 * SHORT, AND THAT IS THE POINT. What gets recorded has to be the wording the
 * person actually saw, not the documents it points at — this is the sentence
 * beside the checkbox, verbatim. The Terms and the Privacy Policy have their
 * own effective dates on their own pages; this records that on a given day a
 * given person was shown this line and ticked it.
 *
 * If the label on the form changes by so much as a word, add a V2 below and
 * leave this in place. The record is only worth anything if the text behind a
 * version cannot move.
 *
 * NOT REVIEWED BY COUNSEL. Same standing caveat as the FCRA text above, and it
 * matters more here: whether a tick box is sufficient assent, and whether the
 * Terms need separate acceptance from the Privacy Policy, are questions for a
 * lawyer rather than for this file. Platform spec §29.
 */
export const TERMS_OF_USE_V1: ConsentTextVersion = {
  version: "terms-2026-08-15",
  effectiveFrom: "2026-08-15",
  consentType: "terms_of_use",
  source: "create-account checkbox label",
  body: `I agree to the Terms of Use and the Privacy Policy.`,
};

export const CONSENT_TEXTS = [FCRA_AUTHORIZATION_V1, TERMS_OF_USE_V1];

export function currentConsentText(
  consentType: ConsentTextVersion["consentType"],
): ConsentTextVersion | null {
  const matches = CONSENT_TEXTS.filter((c) => c.consentType === consentType);
  if (matches.length === 0) return null;
  return matches.reduce((latest, candidate) =>
    candidate.effectiveFrom > latest.effectiveFrom ? candidate : latest,
  );
}

/**
 * Stable fingerprint of the wording, stored alongside the consent record.
 *
 * The version string says which text was shown; the hash proves it. If the
 * constant above were ever edited in place, existing records would no longer
 * match and the discrepancy would be visible rather than silent.
 *
 * Uses Web Crypto, which is available in both the Node and Edge runtimes.
 */
export async function hashConsentText(body: string): Promise<string> {
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
