import type {
  CreditBand,
  RevenueBand,
  TimeInBusinessBand,
  UrgencyBand,
} from "@/types/database";

/**
 * Banded values and their display labels.
 *
 * Platform spec §8 STEP 6: use ranges during early qualification. Asking for an
 * exact credit score up front costs conversion and buys nothing — the lender
 * pulls it anyway.
 *
 * The *_ORDER maps make bands comparable so a rule can say
 * "credit_band gte 680_719".
 */

export const CREDIT_BAND_ORDER: Record<CreditBand, number> = {
  unknown: 0,
  below_600: 1,
  "600_649": 2,
  "650_679": 3,
  "680_719": 4,
  "720_759": 5,
  "760_plus": 6,
};

export const CREDIT_BAND_LABELS: Record<CreditBand, string> = {
  below_600: "Below 600",
  "600_649": "600–649",
  "650_679": "650–679",
  "680_719": "680–719",
  "720_759": "720–759",
  "760_plus": "760 or above",
  unknown: "I'm not sure",
};

export const TIME_IN_BUSINESS_ORDER: Record<TimeInBusinessBand, number> = {
  startup_under_1y: 1,
  "1_2y": 2,
  "2_5y": 3,
  "5_10y": 4,
  "10y_plus": 5,
};

export const TIME_IN_BUSINESS_LABELS: Record<TimeInBusinessBand, string> = {
  startup_under_1y: "Startup — less than 1 year",
  "1_2y": "1–2 years",
  "2_5y": "2–5 years",
  "5_10y": "5–10 years",
  "10y_plus": "10+ years",
};

export const REVENUE_BAND_ORDER: Record<RevenueBand, number> = {
  unknown: 0,
  under_100k: 1,
  "100k_250k": 2,
  "250k_500k": 3,
  "500k_1m": 4,
  "1m_5m": 5,
  "5m_plus": 6,
};

export const REVENUE_BAND_LABELS: Record<RevenueBand, string> = {
  under_100k: "Under $100,000",
  "100k_250k": "$100,000 – $250,000",
  "250k_500k": "$250,000 – $500,000",
  "500k_1m": "$500,000 – $1 million",
  "1m_5m": "$1 million – $5 million",
  "5m_plus": "Over $5 million",
  unknown: "I'm not sure",
};

export const URGENCY_LABELS: Record<UrgencyBand, string> = {
  immediately: "As soon as possible",
  within_30_days: "Within 30 days",
  within_90_days: "Within 90 days",
  just_exploring: "Just exploring options",
};

export function orderedOptions<T extends string>(
  labels: Record<T, string>,
  order: Record<T, number>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[])
    .sort((a, b) => order[a] - order[b])
    .map((value) => ({ value, label: labels[value] }));
}
