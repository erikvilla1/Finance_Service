/**
 * What the pre-account flow is called, and how many steps it has.
 *
 * WHY IT IS NOT "YOUR APPLICATION". Nobody has applied for anything here. The
 * flow is: pick a goal, answer eight questions, see indicative options, then
 * create an account. The row written at the end of it is a lead record — the
 * result page's own comment is explicit that it "must NOT say an application
 * has been created or that a specialist is reviewing it", and the page under it
 * says in as many words that "nothing has been applied for yet".
 *
 * The progress bar above that page nevertheless read "Your application", which
 * is the one claim every other line of copy in the flow is careful not to make.
 * On a broker's site that is not just untidy: telling someone they have an
 * application in progress, on a page showing them estimated amounts, is exactly
 * the impression the disclosures at the foot of the page exist to prevent.
 *
 * "Your financing options" is what the button that starts the flow promises
 * ("See my financing options"), what the result page is titled, and what the
 * applicant is actually being walked toward.
 *
 * EXPORTED RATHER THAN REPEATED. There were four copies of this string across
 * four files and they had already drifted from the rest of the copy. Four
 * hardcoded literals will always eventually disagree; one will not.
 */
export const PREQUAL_FLOW_LABEL = "Your financing options";

/**
 * Steps in the bar: goal, questions, options. Three, not four.
 *
 * CREATE-ACCOUNT IS NOT ON THIS BAR ANY MORE, and the reasoning is worth
 * keeping because the obvious argument runs the other way.
 *
 * The case for four: a bar that reads complete is a stopping cue, and account
 * creation is the conversion this whole flow exists to reach — so leaving the
 * loop open through step four ought to pull people into it.
 *
 * The case that won: at four, the label had to name a journey that ends with an
 * account, while the thing the applicant came for is delivered on step three.
 * Every honest label for that arc either overclaims ("your application" —
 * nothing has been applied for) or describes something the visitor never asked
 * for. Three steps lets the bar mean exactly what it says: you asked to see
 * financing options, here they are.
 *
 * The account is then a fresh decision with its own page and its own framing,
 * pitched on what it gives them — somewhere to upload documents and track the
 * file — rather than on finishing a bar. If conversion drops, the bar is the
 * first thing to try putting back.
 */
export const PREQUAL_FLOW_STEPS = 3;
