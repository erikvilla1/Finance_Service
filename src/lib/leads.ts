import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { loadQuestions } from "@/lib/questions";
import { FORM_MODULES, isAnswered, targetFor } from "@/lib/application-form/mapping";
import { needsApplicant } from "@/lib/documents/checklist";
import { assessCompleteness } from "@/lib/funding-application/completeness";

/**
 * Who each lead actually is, and what is still outstanding on it.
 *
 * THE PROBLEM. `applications` holds no name, no email, no company. It never did
 * — the prequal is anonymous, so identity arrives later and lands in three
 * other tables: `profiles` when they create an account, `businesses` and
 * `application_owners` when they fill in the full application. The pipeline was
 * built before any of those were populated and so listed reference codes,
 * amounts and bands. That is a list of applications. Robert needs a list of
 * people.
 *
 * WHY THIS IS ONE PASS. Five queries for a page of a hundred leads, not five
 * per lead. The pipeline is the screen opened every morning and a per-row
 * lookup would make it slower with every deal won, which is precisely backwards.
 *
 * PROGRESS IS COMPUTED, NOT GUESSED. It would be cheaper to call an application
 * "complete" when `business_id` is set, and it would be wrong often enough to be
 * worse than showing nothing — a specialist who rings someone to package a file
 * that turns out to be half empty stops trusting the column. The required
 * questions are read from configuration and checked against the values that
 * actually exist, which is the same answer the applicant's own progress bar
 * gives them.
 */

type Client = SupabaseClient<Database>;

export interface LeadSummary {
  /** Best available human name, or null when nobody has told us one yet. */
  contactName: string | null;
  contactEmail: string | null;
  businessName: string | null;
  /**
   * How far through the form the applicant has got.
   *
   * NOT the same question as whether the file can be sent, and the two are
   * routinely different — see packageReady. This one exists to answer "have
   * they finished their bit", which is what decides whether to chase them.
   */
  formAnswered: number;
  formRequired: number;
  /**
   * Whether the lender package has everything it needs.
   *
   * Assessed against FUNDING_APPLICATION_FIELDS, which is the single source of
   * truth for what Robert's funding application requires. This is the one that
   * decides whether a file can go out, because it is the one measuring the
   * document that actually leaves the building.
   */
  packageReady: boolean;
  packagePresent: number;
  packageTotal: number;
  /** What the lender package is still missing, by its own field labels. */
  packageMissing: string[];
  /**
   * The labels of the required questions still unanswered, in the order they
   * are asked.
   *
   * "31 of 33" tells a specialist the file is nearly done and nothing about
   * whether the two gaps are a missing middle initial or the entire ownership
   * section. Carrying the labels costs nothing — the questions were loaded to
   * produce the count in the first place.
   */
  formMissing: string[];
  /** Checklist items still sitting with the applicant. */
  docsOutstanding: number;
  docsTotal: number;
  docsSettled: number;
  /** Files uploaded and waiting for someone here to look at them. */
  docsAwaitingReview: number;
}

export interface LeadRef {
  id: string;
  profile_id: string | null;
  business_id: string | null;
}

/**
 * The questions the summary cards answer, defined once.
 *
 * These live here rather than on the pipeline page because the dashboard asks
 * the same questions, and two copies of "ready to package" that disagree is a
 * specialist ringing someone about a file that is not ready.
 *
 * Deliberately separate from status. A status says where a file sits; these say
 * what it is waiting on, and the two disagree constantly — a lead can sit at
 * 'contacted' for a week while nobody has opened the documents that arrived on
 * day one.
 */
export type Need =
  | "review"
  | "applicant"
  | "docs_done"
  | "app_unfinished"
  | "package";

export const NEEDS: Need[] = [
  "review",
  "applicant",
  "docs_done",
  "app_unfinished",
  "package",
];

export const NEED_LABELS: Record<Need, { label: string; hint: string }> = {
  review: {
    label: "Files to review",
    hint: "Documents sent in and not yet looked at",
  },
  applicant: {
    label: "Waiting on the applicant",
    hint: "Still owe us at least one document",
  },
  docs_done: {
    label: "Documents complete",
    hint: "Every document accepted or waived",
  },
  app_unfinished: {
    label: "Application unfinished",
    hint: "Sent documents but haven't completed the form",
  },
  package: {
    label: "Ready to package",
    hint: "Lender package complete, every document settled",
  },
};

export function isNeed(value: string | undefined): value is Need {
  return NEEDS.includes(value as Need);
}

const formComplete = (s: LeadSummary) =>
  s.formRequired > 0 && s.formAnswered === s.formRequired;

const docsComplete = (s: LeadSummary) =>
  s.docsTotal > 0 && s.docsSettled === s.docsTotal;

export function matchesNeed(summary: LeadSummary, need: Need): boolean {
  switch (need) {
    case "review":
      return summary.docsAwaitingReview > 0;

    case "applicant":
      return summary.docsOutstanding > 0;

    case "docs_done":
      return docsComplete(summary);

    case "app_unfinished":
      // Someone who has engaged — sent something in — but whose form is not
      // finished. Both halves matter: a lead who has sent nothing at all is a
      // lead nobody has chased yet, which is a different problem with a
      // different fix, and mixing them makes the number useless for both.
      return (
        summary.docsTotal > summary.docsOutstanding && !formComplete(summary)
      );

    case "package":
      // Measured against the lender package, not against how far through the
      // form the applicant got. Those are different questions and they were
      // giving different answers on the same file: the pipeline called Iwa
      // Media ready to package while its own detail page said 34 of 36, because
      // the form does not ask for everything the funding application needs —
      // owner title and existing obligations among them.
      //
      // Of the two, the package check is the one that matters. It measures the
      // document that actually leaves the building, and being wrong about it
      // means sending a lender an incomplete file.
      //
      // A file with no checklist at all is still not ready: it is one nobody
      // has asked anything of yet, and counting it here would put untouched
      // leads at the front of the queue.
      return summary.packageReady && docsComplete(summary);
  }
}

export async function loadLeadSummaries(
  supabase: Client,
  applications: LeadRef[],
): Promise<Map<string, LeadSummary>> {
  const summaries = new Map<string, LeadSummary>();
  if (applications.length === 0) return summaries;

  const ids = applications.map((a) => a.id);
  const profileIds = applications.map((a) => a.profile_id).filter(isString);
  const businessIds = applications.map((a) => a.business_id).filter(isString);

  const [
    { data: profiles },
    { data: businesses },
    { data: owners },
    { data: requests },
    { data: answers },
    { data: debts },
    questions,
  ] = await Promise.all([
    profileIds.length
      ? supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    // WHOLE ROWS, NOT JUST THE DISPLAY COLUMNS. These are read twice: once for
    // the name on the card, and once by the completeness check below, which
    // looks up whatever column the mapping points a question at. Selecting
    // `legal_name, dba` was enough for the first and quietly broke the second —
    // every business and owner field came back undefined and counted as
    // unanswered, so a finished application reported 7 of 18 with every field
    // visibly filled in.
    businessIds.length
      ? supabase.from("businesses").select("*").in("id", businessIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("application_owners")
      .select("*")
      .in("application_id", ids)
      .eq("is_primary", true),
    supabase
      .from("document_requests")
      .select("application_id, status, is_required")
      .in("application_id", ids)
      .eq("is_required", true),
    supabase
      .from("application_answers")
      .select("application_id, question_key, value")
      .in("application_id", ids),
    // Needed only for its count: the lender package requires at least one
    // existing-obligation row, and nothing else here reads the rows themselves.
    supabase.from("existing_debts").select("application_id").in("application_id", ids),
    // Track is deliberately null: every module in FORM_MODULES is universal, so
    // the required set is the same for every lead and can be loaded once. When
    // the track modules land this becomes a per-track lookup.
    loadQuestions([...FORM_MODULES], null),
  ]);

  const requiredQuestions = questions.filter((question) => question.isRequired);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const businessById = new Map((businesses ?? []).map((b) => [b.id, b]));
  const ownerByApplication = new Map(
    (owners ?? []).map((o) => [o.application_id, o]),
  );

  const answersByApplication = new Map<string, Record<string, unknown>>();
  for (const row of answers ?? []) {
    const bag = answersByApplication.get(row.application_id) ?? {};
    bag[row.question_key] = row.value;
    answersByApplication.set(row.application_id, bag);
  }

  // Column-sourced answers need the row they live on. Fetched per application
  // rather than joined, for the same reason the checklist does it: the
  // hand-written Database type declares no relationships, so an embedded select
  // resolves its nested rows to never.
  const applicationRows = new Map<string, Record<string, unknown>>();
  const { data: fullApplications } = await supabase
    .from("applications")
    .select("*")
    .in("id", ids);

  for (const row of fullApplications ?? []) {
    applicationRows.set(row.id, row as unknown as Record<string, unknown>);
  }

  for (const application of applications) {
    const profile = application.profile_id
      ? profileById.get(application.profile_id)
      : undefined;
    const business = application.business_id
      ? businessById.get(application.business_id)
      : undefined;
    const owner = ownerByApplication.get(application.id);

    const sources: Record<string, Record<string, unknown> | null> = {
      application: applicationRows.get(application.id) ?? null,
      business: (business ?? null) as unknown as Record<string, unknown> | null,
      owner: (owner ?? null) as unknown as Record<string, unknown> | null,
    };
    const bag = answersByApplication.get(application.id) ?? {};

    let formAnswered = 0;
    const formMissing: string[] = [];

    for (const question of requiredQuestions) {
      const target = targetFor(question.key);
      const value =
        target.table === "answer"
          ? bag[question.key]
          : sources[target.table]?.[target.column];

      if (isAnswered(value)) {
        formAnswered += 1;
      } else {
        formMissing.push(question.label);
      }
    }

    const appRequests = (requests ?? []).filter(
      (r) => r.application_id === application.id,
    );

    // The authoritative readiness check, run against the same field list the
    // application detail page uses — so the card and the page cannot disagree
    // about whether a file can go out.
    const report = assessCompleteness({
      application: sources.application,
      business: sources.business,
      owners: owner ? [owner as unknown as Record<string, unknown>] : [],
      answers: bag,
      debtCount: (debts ?? []).filter((d) => d.application_id === application.id)
        .length,
    });

    summaries.set(application.id, {
      // The owner named on the application beats the account holder's name: a
      // bookkeeper often creates the account, and the person a lender needs is
      // the owner. Falls back through the account to nothing rather than
      // printing a placeholder.
      contactName: owner?.full_name ?? profile?.full_name ?? null,
      contactEmail: owner?.email ?? profile?.email ?? null,
      businessName: business?.legal_name ?? business?.dba ?? null,
      formAnswered,
      formRequired: requiredQuestions.length,
      formMissing,
      packageReady: report.readyToSend,
      packagePresent: report.requiredPresent,
      packageTotal: report.requiredTotal,
      packageMissing: report.missing.map((field) => field.formLabel),
      docsTotal: appRequests.length,
      docsOutstanding: appRequests.filter((r) => needsApplicant(r.status)).length,
      docsSettled: appRequests.filter(
        (r) => r.status === "accepted" || r.status === "waived",
      ).length,
      docsAwaitingReview: appRequests.filter(
        (r) => r.status === "uploaded" || r.status === "under_review",
      ).length,
    });
  }

  return summaries;
}

/**
 * Applications whose people match a search term.
 *
 * Searching a pipeline for "farsh" returned nothing, because the filter only
 * covered reference code, industry and financing goal — none of which is ever a
 * person. Names live on other tables, so they are resolved to ids first and
 * those ids folded into the main filter.
 */
export async function findApplicationIdsByPerson(
  supabase: Client,
  search: string,
): Promise<{ profileIds: string[]; businessIds: string[]; applicationIds: string[] }> {
  const term = `%${search}%`;

  const [{ data: profiles }, { data: businesses }, { data: owners }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.${term},email.ilike.${term}`)
        .limit(200),
      supabase
        .from("businesses")
        .select("id")
        .or(`legal_name.ilike.${term},dba.ilike.${term}`)
        .limit(200),
      supabase
        .from("application_owners")
        .select("application_id")
        .or(`full_name.ilike.${term},email.ilike.${term}`)
        .limit(200),
    ]);

  return {
    profileIds: (profiles ?? []).map((p) => p.id),
    businessIds: (businesses ?? []).map((b) => b.id),
    applicationIds: (owners ?? []).map((o) => o.application_id),
  };
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}
