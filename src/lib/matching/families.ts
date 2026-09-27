import type { Facts, ObjectiveId, ProductFamily } from "./types";

/**
 * What the customer sees for each product family (spec §9). Never a lender
 * name. Editable here without touching the engine (spec §12, "Result copy").
 */
export const FAMILY_COPY: Record<ProductFamily, { label: string; description: string }> = {
  term_loan: {
    label: "Business Term Loan",
    description: "A lump sum repaid on a fixed schedule over one or more years.",
  },
  line_of_credit: {
    label: "Business Line of Credit",
    description: "Draw funds as you need them and pay only on what you use.",
  },
  unsecured_term_loan: {
    label: "Unsecured Business Financing",
    description: "Loans or credit lines based mainly on the owner's personal credit and income, with no collateral.",
  },
  revenue_based: {
    label: "Revenue-Based Financing",
    description: "Short-term capital repaid from future revenue. Faster to fund, but usually higher-cost.",
  },
  sba_loan: {
    label: "SBA Loan",
    description: "Government-guaranteed financing with longer terms and lower down payments.",
  },
  asset_based: {
    label: "Asset-Backed Financing",
    description: "Financing secured by assets the business already owns, such as vehicles or real estate.",
  },
  inventory_financing: {
    label: "Inventory Financing",
    description: "A revolving line secured by your inventory.",
  },
  equipment_financing: {
    label: "Equipment Financing",
    description: "Potential financing for qualifying business equipment, secured by the equipment itself.",
  },
  owner_user_cre: {
    label: "Owner-Occupied Commercial Real Estate",
    description: "Financing for property your business occupies, including SBA options.",
  },
  investment_cre: {
    label: "Investment Commercial Real Estate",
    description: "Financing for income-producing commercial property.",
  },
  commercial_mortgage: {
    label: "Commercial Mortgage",
    description: "Longer-term financing on commercial property.",
  },
  bridge_loan: {
    label: "Bridge Loan",
    description: "Short-term financing to buy, reposition or refinance property ahead of long-term financing.",
  },
  fix_and_flip: {
    label: "Fix & Flip Financing",
    description: "Short-term financing for the purchase and renovation of an investment property.",
  },
  ground_up_construction: {
    label: "Ground-Up Construction Financing",
    description: "Financing for new residential construction projects.",
  },
  rental_dscr: {
    label: "Rental Property (DSCR) Loan",
    description: "Long-term financing qualified on the property's rental income rather than personal income.",
  },
  multifamily: {
    label: "Multifamily Financing",
    description: "Financing for 5+ unit and mixed-use investment properties.",
  },
  invoice_factoring: {
    label: "Invoice Factoring",
    description: "Cash against unpaid invoices, based largely on your customers' credit rather than yours.",
  },
  ar_line: {
    label: "Accounts Receivable Line of Credit",
    description: "A revolving line that grows with your receivables.",
  },
  medical_receivables: {
    label: "Medical Receivables Financing",
    description: "Advances against insurance, Medicare and Medicaid claims.",
  },
  po_financing: {
    label: "Purchase Order Financing",
    description: "Funding to fulfil confirmed customer orders.",
  },
  debt_refinance: {
    label: "Business Debt Refinance",
    description: "Replace existing business debt with a longer term or a lower payment.",
  },
  debt_restructuring: {
    label: "Debt Restructuring Review",
    description: "A specialist renegotiates existing high-cost debt, without taking on a new loan.",
  },
  startup_credit_line: {
    label: "Startup Business Credit Lines",
    description: "Credit lines based on the owner's personal credit, for new and early-stage businesses.",
  },
  startup_term_loan: {
    label: "Startup Term Loan",
    description: "A term loan based on the owner's personal credit and income.",
  },
  retirement_rollover: {
    label: "Retirement-Funded Business Financing",
    description: "Invest eligible retirement funds in your business without taking on a loan.",
  },
  securities_based: {
    label: "Securities-Based Line of Credit",
    description: "A credit line secured by an investment portfolio.",
  },
  heloc: {
    label: "Home Equity Line of Credit",
    description: "A credit line secured by home equity.",
  },
};

export interface FamilySlot {
  family: ProductFamily;
  /** Serves the objective directly (true) or is a complementary option. */
  primary: boolean;
}

const P = (family: ProductFamily): FamilySlot => ({ family, primary: true });
const C = (family: ProductFamily): FamilySlot => ({ family, primary: false });

/**
 * Which families each objective may show, best structure first (spec §5, §10).
 *
 * Order encodes client structure quality, not lender preference: lower-cost,
 * longer-term options come before revenue-based ones, which "should not be
 * promoted above lower-cost/longer-term options when both are plausible"
 * (spec §6.1). Families not listed for an objective are suppressed entirely,
 * however generic thresholds come out (spec §17, last bullet).
 *
 * Some objectives refine the list from the answers (owner-occupied vs
 * investment CRE, the investment property sub-objective, cross-routes); see
 * familiesFor below.
 */
const BASE: Record<Exclude<ObjectiveId, "unsure">, FamilySlot[]> = {
  working_capital: [
    P("term_loan"),
    P("line_of_credit"),
    C("sba_loan"),
    C("unsecured_term_loan"),
    C("asset_based"),
    C("inventory_financing"),
    P("revenue_based"),
  ],
  equipment: [P("equipment_financing")],
  commercial_real_estate: [
    P("owner_user_cre"),
    P("investment_cre"),
    P("commercial_mortgage"),
    C("bridge_loan"),
    C("multifamily"),
  ],
  investment_real_estate: [
    P("fix_and_flip"),
    P("ground_up_construction"),
    P("rental_dscr"),
    P("multifamily"),
    P("bridge_loan"),
  ],
  business_acquisition: [
    P("sba_loan"),
    C("unsecured_term_loan"),
    C("term_loan"),
    C("retirement_rollover"),
  ],
  accounts_receivable: [
    P("invoice_factoring"),
    P("ar_line"),
    // Primary only for medical receivables (see familiesFor); otherwise it is
    // simply not mentioned when it doesn't fit.
    C("medical_receivables"),
    C("po_financing"),
  ],
  debt_refinance: [
    P("debt_refinance"),
    C("sba_loan"),
    C("asset_based"),
    P("debt_restructuring"),
    C("revenue_based"),
  ],
  startup: [
    P("startup_credit_line"),
    P("startup_term_loan"),
    P("unsecured_term_loan"),
    C("sba_loan"),
    C("retirement_rollover"),
  ],
};

const RE_SUBOBJECTIVE: Record<string, FamilySlot[]> = {
  fix_and_flip: [P("fix_and_flip"), C("bridge_loan")],
  ground_up: [P("ground_up_construction"), C("bridge_loan")],
  rental: [P("rental_dscr")],
  multifamily: [P("multifamily"), C("bridge_loan"), C("rental_dscr")],
  bridge: [P("bridge_loan"), C("fix_and_flip")],
  cash_out_refi: [P("rental_dscr"), C("bridge_loan")],
};

/**
 * The family list for one objective, refined by what the applicant said.
 * Cross-routes the spec calls for are added here: equipment for a startup
 * whose request includes equipment (§6.8), the debt-refinance route for
 * working capital meant to refinance (§6.1), inventory financing when the
 * funds are for inventory.
 */
export function familiesFor(objective: Exclude<ObjectiveId, "unsure">, facts: Facts): FamilySlot[] {
  let slots = [...BASE[objective]];

  if (objective === "commercial_real_estate") {
    const use = facts.cre_occupancy_type;
    if (use === "owner_occupied") {
      slots = [P("owner_user_cre"), P("commercial_mortgage"), C("bridge_loan")];
    } else if (use === "investment") {
      slots = [P("investment_cre"), P("commercial_mortgage"), P("bridge_loan"), C("multifamily")];
    }
  }

  if (objective === "investment_real_estate" && typeof facts.re_subobjective === "string") {
    slots = RE_SUBOBJECTIVE[facts.re_subobjective] ?? slots;
  }

  if (objective === "accounts_receivable" && facts.ar_medical === true) {
    slots = [P("medical_receivables"), P("invoice_factoring"), P("ar_line"), C("po_financing")];
  }

  if (objective === "working_capital") {
    if (facts.use_of_funds !== "inventory") {
      slots = slots.filter((slot) => slot.family !== "inventory_financing");
    }
    if (facts.use_of_funds === "refinance") {
      slots.splice(2, 0, C("debt_refinance"), C("debt_restructuring"));
    }
  }

  if (objective === "debt_refinance") {
    // Heavy stacking or a current default: restructuring first, because new
    // credit is unlikely and more of it would not help (spec §6.7).
    const heavy =
      facts.current_default === true ||
      (typeof facts.positions_low === "number" && facts.positions_low >= 4);
    if (heavy) {
      slots = [P("debt_restructuring"), ...slots.filter((s) => s.family !== "debt_restructuring")];
    }
  }

  if (objective === "startup" && facts.startup_equipment === true) {
    slots.splice(3, 0, C("equipment_financing"));
  }

  return slots;
}
