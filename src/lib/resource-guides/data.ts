/**
 * Resource guide content.
 *
 * SOURCE. Content masters supplied by Robert
 * ("FLS_Detailed_Resource_Guides_IWA_Package_COMPLETE", 2026-09-10), one docx
 * per financing category. Each master's own "For IWA / internal content note"
 * section is a build note to whoever lays the guide out — routing caveats
 * about which lender data is provisional — and is deliberately not carried
 * into this file. It was never customer copy.
 *
 * ONE SHAPE FOR ELEVEN GUIDES. The masters are structurally identical guide to
 * guide (intro, use cases, how lenders evaluate a request, what to prepare,
 * a five-step process, a closing tip) with different words in each slot, so
 * they are data rather than eleven near-duplicate page components. The
 * landing-page route and the PDF export both render off this one array —
 * one branding pass here reaches every guide.
 *
 * A page number ("FINANCING GUIDE / 04") only meant something in the docx
 * layout, so `order` is kept for stable sorting but is not shown to visitors.
 */

export interface EvaluationArea {
  title: string;
  body: string;
}

export interface PrepItem {
  category: string;
  body: string;
}

export interface ProcessStep {
  title: string;
  body: string;
}

export interface ResourceGuide {
  slug: string;
  order: number;
  title: string;
  dek: string;
  intro: string[];
  useCasesTitle: string;
  useCases: string[];
  evaluationAreas: EvaluationArea[];
  evaluationNote?: string;
  prepChecklist: PrepItem[];
  process: ProcessStep[];
  strengthenTip: string;
}

export const RESOURCE_GUIDES: ResourceGuide[] = [
  {
    slug: "equipment-financing",
    order: 1,
    title: "Equipment Financing",
    dek: "A practical guide to financing the equipment your business needs to operate, expand, and generate revenue.",
    intro: [
      "Equipment financing is designed to help a business acquire equipment without paying the full purchase price in cash at closing. Depending on the program, the structure may be a loan, lease, lease-to-own arrangement, or another business-purpose financing structure.",
      "The equipment itself is often a central part of the underwriting decision. Lenders may evaluate its age, type, cost, resale market, useful life, and how directly it contributes to business revenue.",
    ],
    useCasesTitle: "Common equipment categories",
    useCases: [
      "Construction and yellow iron",
      "Vocational trucks and local transportation",
      "Manufacturing and CNC equipment",
      "Materials handling and forklifts",
      "Auto repair and service equipment",
      "Landscaping and agricultural equipment",
      "Medical, office, and gym equipment",
      "Restaurant and food-service equipment",
      "Trailers and specialty business equipment",
    ],
    evaluationAreas: [
      {
        title: "Business cash flow",
        body: "Lenders may review recent business bank statements, average deposits, ending balances, existing obligations, and whether cash flow appears sufficient to support the proposed payment.",
      },
      {
        title: "Borrower profile",
        body: "Time in business, personal and business credit history, comparable borrowing experience, bankruptcies, liens, delinquencies, and guarantor strength can affect available structures.",
      },
      {
        title: "Equipment / collateral",
        body: "Equipment age, type, condition, title status, secondary-market value, invoice amount, and ease of resale can influence leverage and terms.",
      },
      {
        title: "Transaction strength",
        body: "A down payment, additional guarantor, additional collateral, strong industry experience, or clear evidence that the equipment will increase revenue can strengthen a request.",
      },
    ],
    evaluationNote:
      "There is no single universal minimum credit score or universal advance rate across the FLS lender network. Some programs are credit-driven; others place heavier emphasis on business revenue and equipment quality.",
    prepChecklist: [
      {
        category: "Business information",
        body: "Legal business name, entity type, ownership, industry, time in business, and a short explanation of how the business generates revenue.",
      },
      {
        category: "Equipment details",
        body: "Vendor quote or invoice, equipment description, year, make, model, serial/VIN when applicable, purchase price, and whether the seller is a dealer or private party.",
      },
      {
        category: "Financial information",
        body: "Recent consecutive business bank statements are common. Larger or more complex requests may require additional financial information.",
      },
      {
        category: "Owner / guarantor information",
        body: "Completed application and owner information. Personal guarantees and credit review requirements vary by program.",
      },
      {
        category: "Transaction context",
        body: "Explain why the equipment is needed, how it will be used, whether it replaces existing equipment, and how it is expected to support revenue or operations.",
      },
    ],
    process: [
      { title: "Define the purchase", body: "Identify the equipment, vendor, total cost, and how the asset will be used." },
      { title: "Review the business profile", body: "FLS reviews the request, business history, credit profile, cash flow, equipment, and other relevant factors." },
      { title: "Match the request", body: "The transaction is routed toward financing programs that appear aligned with the borrower and equipment." },
      { title: "Lender underwriting", body: "The funding source reviews the complete file and may request clarification, additional documents, inspection, insurance, or other conditions." },
      { title: "Documents & funding", body: "After final approval and required documents/conditions are satisfied, funds are released according to the approved transaction structure." },
    ],
    strengthenTip:
      "Strong and consistent business deposits, adequate ending balances, relevant borrowing history, additional cash contribution, strong guarantor support, additional collateral, and a clear business case for the equipment can all help — depending on the lender and program.",
  },
  {
    slug: "sba-financing",
    order: 2,
    title: "SBA Financing",
    dek: "A practical guide to longer-term business financing for acquisitions, owner-occupied real estate, expansion, equipment, and other eligible business purposes.",
    intro: [
      "SBA financing can be a strong option for established businesses and qualified buyers who need longer repayment periods or a financing structure tied to a major business transaction. The SBA does not simply replace lender underwriting; the lender still evaluates the borrower, business, transaction, cash flow, and eligibility.",
      "FLS uses SBA financing primarily as a transaction-specific solution. Owner-occupied real estate, business acquisitions, partner buyouts, expansion, equipment, and qualifying refinance or working-capital needs may require different documentation and underwriting analysis.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Purchase an operating business",
      "Purchase or refinance owner-occupied commercial real estate",
      "Finance an expansion or additional location",
      "Finance eligible equipment and business investment",
      "Complete a qualifying partner buyout",
      "Refinance eligible business debt when the transaction meets program requirements",
    ],
    evaluationAreas: [
      {
        title: "Business cash flow",
        body: "Historical tax returns, interim financial statements, revenue stability, existing debt, and projected debt service are central to many SBA transactions.",
      },
      {
        title: "Borrower strength",
        body: "Credit profile, management experience, liquidity, personal financial position, and ownership structure can affect the lender's view of the request.",
      },
      {
        title: "Transaction structure",
        body: "Purchase price, use of proceeds, equity injection, seller financing, collateral, real estate, and business valuation can all matter depending on the transaction.",
      },
      {
        title: "Eligibility",
        body: "The business, ownership, use of funds, industry, and transaction must fit applicable SBA and lender requirements.",
      },
    ],
    prepChecklist: [
      {
        category: "Business information",
        body: "Three years of business tax returns when requested; current P&L and balance sheet; business debt schedule; business plan and projections when applicable.",
      },
      {
        category: "Personal information",
        body: "Personal tax returns, personal financial statement, recent bank statements, and owner resume.",
      },
      {
        category: "Transaction documents",
        body: "Detailed use of funds; purchase contract or LOI for acquisitions or real estate; payoff information for refinance; affiliate-company information when applicable.",
      },
    ],
    process: [
      { title: "Define the transaction", body: "Define the transaction and total project/use-of-funds need." },
      { title: "Review the request", body: "FLS reviews the business, owners, cash flow, transaction structure, and available SBA paths." },
      { title: "Assemble the package", body: "A preliminary package is assembled and routed to an appropriate SBA lending source." },
      { title: "Lender underwriting", body: "The lender completes eligibility and credit underwriting and may request valuation, appraisal, environmental, legal, or other third-party items." },
      { title: "Approval & funding", body: "Final approval, closing conditions, loan documents, and funding follow if the transaction is approved." },
    ],
    strengthenTip:
      "Complete financials, stable cash flow, relevant management experience, sufficient liquidity/equity, realistic projections, clean documentation, and a clearly supported purchase price or project budget can strengthen an SBA request.",
  },
  {
    slug: "commercial-real-estate-financing",
    order: 3,
    title: "Commercial Real Estate Financing",
    dek: "A practical guide to financing the purchase, refinance, or repositioning of commercial and investment real estate.",
    intro: [
      "Commercial real estate financing is not one product. Owner-occupied properties, stabilized investment properties, transitional assets, multifamily, mixed-use, and bridge transactions can be underwritten under very different programs.",
      "FLS evaluates the property, borrower or sponsor, cash flow, leverage, occupancy, use of proceeds, and exit strategy before determining which financing path may be appropriate.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Purchase an owner-occupied business property",
      "Acquire a stabilized investment property",
      "Refinance existing commercial debt",
      "Access equity through an eligible cash-out refinance",
      "Bridge a transitional or time-sensitive property transaction",
      "Finance small-balance commercial, mixed-use, or multifamily assets",
    ],
    evaluationAreas: [
      {
        title: "Property and occupancy",
        body: "Property type, condition, tenant mix, occupancy, owner-use percentage, location, and marketability can affect program selection.",
      },
      {
        title: "Leverage",
        body: "Purchase price, current value, requested loan amount, existing debt, and borrower equity determine LTV/LTC and can materially affect terms.",
      },
      {
        title: "Property cash flow",
        body: "For income-producing assets, lenders may evaluate NOI, rents, expenses, DSCR, lease terms, and tenant concentration.",
      },
      {
        title: "Sponsor profile",
        body: "Experience, credit, liquidity, net worth, track record, and exit strategy may be important, particularly for bridge or transitional assets.",
      },
    ],
    prepChecklist: [
      {
        category: "Property package",
        body: "Purchase contract or payoff statement, property details, rent roll, leases, trailing operating statements, and current photos when applicable.",
      },
      {
        category: "Borrower / sponsor",
        body: "Application, entity documents, ownership schedule, personal financial statement, liquidity verification, and experience information.",
      },
      {
        category: "Third-party items",
        body: "Appraisal, environmental review, title, insurance, inspections, and other reports are typically ordered or required later depending on program.",
      },
    ],
    process: [
      { title: "Identify the transaction", body: "Identify owner-occupied vs. investment use and the transaction type." },
      { title: "Review the request", body: "Review value, requested leverage, property cash flow, sponsor strength, and timeline." },
      { title: "Match the program", body: "Match the transaction to SBA, stabilized CRE, bridge, DSCR, or other appropriate programs." },
      { title: "Lender underwriting", body: "Complete lender underwriting and required third-party reports." },
      { title: "Closing & funding", body: "Satisfy closing conditions and fund if approved." },
    ],
    strengthenTip:
      "Lower leverage, strong property cash flow, experienced sponsorship, adequate liquidity, clean title/ownership, stable occupancy, and a credible exit strategy can improve a CRE request.",
  },
  {
    slug: "fix-and-flip-financing",
    order: 4,
    title: "Fix & Flip Financing",
    dek: "A practical guide to short-term financing for the acquisition and renovation of non-owner-occupied investment property.",
    intro: [
      "Fix & flip financing is designed around the investment project rather than the borrower's personal residence. The lender generally evaluates the purchase basis, renovation scope, as-is value, after-repair value, investor experience, liquidity, credit profile, and exit strategy.",
      "Because leverage can change based on experience and transaction strength, a headline maximum should never be treated as an automatic advance for every project.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Acquire a distressed or dated investment property",
      "Finance purchase plus eligible renovation costs",
      "Complete a value-add renovation for resale",
      "Refinance an eligible in-progress investment project",
      "Bridge a property until sale or long-term refinance",
    ],
    evaluationAreas: [
      {
        title: "Purchase basis and value",
        body: "Purchase price, as-is value, and whether the acquisition basis is supported by the market.",
      },
      {
        title: "Rehab and ARV",
        body: "Detailed scope, construction budget, expected after-repair value, contingency, and project feasibility.",
      },
      {
        title: "Investor experience",
        body: "Completed projects can affect leverage and program selection; first-time investors may receive more conservative structures.",
      },
      {
        title: "Liquidity and credit",
        body: "Available cash, reserves, credit profile, existing obligations, and ability to handle overruns or delays.",
      },
      {
        title: "Exit strategy",
        body: "Expected resale, refinance, or rental exit and the timeline needed to execute it.",
      },
    ],
    prepChecklist: [
      {
        category: "Property",
        body: "Purchase contract, property address/details, photos, preliminary title information, and valuation support as requested.",
      },
      {
        category: "Rehab",
        body: "Detailed scope of work, line-item budget, contractor/GC information, and project timeline.",
      },
      {
        category: "Borrower",
        body: "Entity documents, application, liquidity verification, credit authorization, and experience schedule where applicable.",
      },
    ],
    process: [
      { title: "Analyze the project", body: "Analyze purchase price, rehab budget, and expected ARV." },
      { title: "Calculate leverage", body: "Calculate requested leverage against cost and value." },
      { title: "Review the borrower", body: "Review experience, liquidity, credit, property type, and exit." },
      { title: "Route the request", body: "Route to the best-fit fix-and-flip/bridge program." },
      { title: "Close & fund", body: "Complete valuation, underwriting, closing, and construction-draw requirements if approved." },
    ],
    strengthenTip:
      "Buying below market, a realistic rehab budget, conservative ARV, adequate reserves, relevant experience, and a clear exit can materially strengthen a project.",
  },
  {
    slug: "ground-up-construction-financing",
    order: 5,
    title: "Ground-Up Construction Financing",
    dek: "A practical guide to financing non-owner-occupied residential construction and development projects.",
    intro: [
      "Ground-up construction financing adds construction risk to the real estate underwriting process. Lenders typically evaluate the land or acquisition basis, total development cost, plans, permits, construction budget, sponsor experience, liquidity, completed value, and exit strategy.",
      "Construction financing should be treated separately from a standard renovation loan because the documentation, draw process, project readiness, and experience requirements can be materially different.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Acquire land or a property for new construction",
      "Finance vertical construction of investment housing",
      "Complete a teardown/rebuild investment strategy",
      "Develop small multifamily or eligible residential investment projects",
      "Build for resale or an eligible refinance/rental exit",
    ],
    evaluationAreas: [
      {
        title: "Project economics",
        body: "Land/acquisition basis, hard and soft costs, contingency, total cost, and expected completed value.",
      },
      {
        title: "Project readiness",
        body: "Plans, permits, entitlements, utilities, site conditions, contractor readiness, and realistic construction schedule.",
      },
      {
        title: "Sponsor experience",
        body: "Prior completed ground-up projects and the strength of the builder/GC team can materially affect leverage and eligibility.",
      },
      {
        title: "Liquidity",
        body: "Cash equity, reserves, contingency capacity, and ability to carry the project through delays or cost changes.",
      },
      {
        title: "Exit",
        body: "Sale, refinance, or rental stabilization strategy and the market assumptions supporting it.",
      },
    ],
    prepChecklist: [
      {
        category: "Project",
        body: "Plans/specifications, permits/entitlement status, detailed construction budget, schedule, and project description.",
      },
      {
        category: "Property",
        body: "Purchase/land documents, title information, site details, and valuation/appraisal items.",
      },
      {
        category: "Team and borrower",
        body: "GC/builder information, experience schedule, entity/ownership documents, liquidity verification, and credit information.",
      },
    ],
    process: [
      { title: "Confirm readiness", body: "Confirm project readiness, total cost, and completed-value assumptions." },
      { title: "Review the sponsor", body: "Review sponsor/GC experience, liquidity, credit, and requested leverage." },
      { title: "Match the program", body: "Match the project to an appropriate construction lender/program." },
      { title: "Underwrite", body: "Complete appraisal/feasibility, underwriting, legal, and closing requirements." },
      { title: "Fund by draw", body: "Fund according to the approved draw process as construction progresses." },
    ],
    strengthenTip:
      "Experienced sponsorship, permitted shovel-ready projects, conservative budgets, meaningful contingency, strong liquidity, and a well-supported exit are important strengths.",
  },
  {
    slug: "working-capital-financing",
    order: 6,
    title: "Working Capital & Revenue-Based Financing",
    dek: "A practical guide to business-purpose capital for operating expenses, growth, inventory, payroll, and short-term cash-flow needs.",
    intro: [
      "Working-capital financing can take several forms. Some products are structured as term loans or lines of credit; others are underwritten primarily around recent business deposits and revenue and may have more frequent repayment structures.",
      "The right option depends on how much capital is needed, how quickly it is needed, the business's operating history and cash flow, existing debt, credit profile, and how the funds will be used.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Payroll and operating expenses",
      "Inventory purchases",
      "Marketing and customer acquisition",
      "Expansion and hiring",
      "Seasonal cash-flow needs",
      "Time-sensitive contracts or business opportunities",
    ],
    evaluationAreas: [
      {
        title: "Revenue and deposits",
        body: "Recent monthly revenue, bank deposits, consistency, seasonality, and ending balances.",
      },
      {
        title: "Time in business",
        body: "Many cash-flow programs require an operating history, while thresholds vary across lenders and products.",
      },
      {
        title: "Existing obligations",
        body: "Open positions, daily/weekly payments, liens, and current debt service can affect available capacity.",
      },
      {
        title: "Credit and payment history",
        body: "Credit can influence structure and pricing even where cash flow is the primary underwriting driver.",
      },
      {
        title: "Use of funds",
        body: "The amount requested should make sense relative to revenue, existing obligations, and the business purpose.",
      },
    ],
    prepChecklist: [
      {
        category: "Core submission",
        body: "Completed application and recent consecutive business bank statements.",
      },
      {
        category: "Larger requests",
        body: "YTD P&L, balance sheet, tax returns, debt schedule, or additional financial information may be requested.",
      },
      {
        category: "Business information",
        body: "Entity/ownership information, identification, use of funds, and current financing details.",
      },
    ],
    process: [
      { title: "Define the need", body: "Define amount, use of funds, and desired timing." },
      { title: "Review the business", body: "Review revenue, deposits, operating history, credit, and existing obligations." },
      { title: "Compare structures", body: "Compare line-of-credit, term, revenue-based, and other working-capital paths." },
      { title: "Submit & underwrite", body: "Submit to the best-fit source and complete underwriting." },
      { title: "Review terms", body: "Review the approved structure, payment frequency, total cost, and terms before funding." },
    ],
    strengthenTip:
      "Stable or growing deposits, manageable existing debt, clean recent payment history, adequate ending balances, and a financing request proportional to business cash flow can strengthen the file.",
  },
  {
    slug: "business-term-loans-and-lines-of-credit",
    order: 7,
    title: "Business Term Loans & Lines of Credit",
    dek: "A practical guide to fixed-term business financing and revolving access to capital.",
    intro: [
      "A business term loan generally provides a defined amount of capital repaid over an agreed schedule. A true business line of credit is designed to provide revolving access, allowing the borrower to draw eligible funds, repay principal, and reuse available capacity subject to the facility terms.",
      "Both products can support working capital and growth, but the underwriting, repayment structure, documentation, and cost can differ significantly by lender.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Growth and expansion",
      "Inventory and purchasing",
      "Recurring working-capital needs",
      "Marketing and hiring",
      "Large contracts or project costs",
      "Refinancing eligible short-term obligations",
    ],
    evaluationAreas: [
      {
        title: "Business history",
        body: "Operating history and revenue stability help lenders assess the durability of repayment capacity.",
      },
      {
        title: "Credit",
        body: "Personal and business credit can affect eligibility, amount, pricing, and whether the request fits a bank-like or alternative program.",
      },
      {
        title: "Cash flow",
        body: "Revenue, deposits, profit, existing debt, and debt-service capacity are important to both term and revolving products.",
      },
      {
        title: "Requested structure",
        body: "The lender considers whether the use is better served by one fixed advance or recurring access to capital.",
      },
    ],
    prepChecklist: [
      {
        category: "Initial",
        body: "Application, recent bank statements, business/entity information, and use of funds.",
      },
      {
        category: "Financial",
        body: "P&L, balance sheet, tax returns, debt schedule, or other financials for larger or more traditional requests.",
      },
      {
        category: "Existing debt",
        body: "Current balances, payment obligations, and payoff information when refinancing is involved.",
      },
    ],
    process: [
      { title: "Identify the need", body: "Determine whether the need is one-time or recurring." },
      { title: "Review the request", body: "Review amount, revenue, credit, business history, and existing debt." },
      { title: "Compare structures", body: "Compare term-loan and revolving-line structures." },
      { title: "Underwrite", body: "Complete lender underwriting and any required financial review." },
      { title: "Review terms", body: "Review approved amount, draw rules, repayment, fees, and prepayment provisions before closing." },
    ],
    strengthenTip:
      "Consistent revenue, established credit, manageable leverage, clean bank activity, strong profitability/cash flow, and a clear use of proceeds can expand available options.",
  },
  {
    slug: "invoice-factoring-and-ar-financing",
    order: 8,
    title: "Invoice Factoring & Accounts Receivable Financing",
    dek: "A practical guide to converting eligible receivables into working capital instead of waiting for customers to pay.",
    intro: [
      "Invoice factoring and accounts-receivable financing are asset-based cash-flow tools. Rather than relying only on the business owner's personal credit, the financing source may place substantial emphasis on the quality of the invoices, the creditworthiness of the customers who owe them, invoice aging, concentration, and the likelihood of collection.",
      "In a factoring structure, eligible receivables may be purchased or advanced against and the factor typically collects payment from the account debtor. Other A/R facilities may operate as revolving lines secured by eligible receivables.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Bridge 30-90 day customer payment terms",
      "Fund payroll and vendor costs while invoices remain outstanding",
      "Support rapid growth in B2B sales",
      "Improve cash conversion without waiting for receivables",
      "Finance eligible medical receivables owed by third-party insurers",
    ],
    evaluationAreas: [
      {
        title: "Account debtors",
        body: "Customer quality, creditworthiness, payment history, and whether invoices are owed by businesses, government entities, insurers, or other eligible debtors.",
      },
      {
        title: "A/R quality",
        body: "Invoice aging, disputes, dilution, offsets, concentration, and whether the receivables are valid and collectible.",
      },
      {
        title: "Volume",
        body: "Monthly sales, current A/R balance, ongoing invoice generation, and the amount of eligible receivables available.",
      },
      {
        title: "Industry",
        body: "Some factoring programs specialize by industry; medical factoring, for example, can involve expected collectible values from third-party insurance receivables.",
      },
    ],
    prepChecklist: [
      {
        category: "Receivables",
        body: "Current A/R aging, customer list, sample invoices, invoice terms, and concentration information.",
      },
      {
        category: "Support",
        body: "Contracts, purchase orders, proof of delivery/performance, or other documentation supporting invoice validity when requested.",
      },
      {
        category: "Business",
        body: "Application, entity/ownership information, bank statements, and financial statements depending on facility size/type.",
      },
    ],
    process: [
      { title: "Identify the A/R pool", body: "Identify who owes the invoices and the current eligible A/R pool." },
      { title: "Review the receivables", body: "Review aging, concentration, invoice terms, disputes, and customer quality." },
      { title: "Choose the structure", body: "Determine whether factoring or an A/R revolving facility is the better structure." },
      { title: "Verify & underwrite", body: "Complete verification, underwriting, and account-debtor setup/notice requirements as applicable." },
      { title: "Advance & fund", body: "Advance/fund eligible receivables according to the approved facility." },
    ],
    strengthenTip:
      "Diversified creditworthy customers, clean invoice aging, low disputes/dilution, recurring B2B sales, and good documentation can strengthen an A/R facility.",
  },
  {
    slug: "business-acquisition-financing",
    order: 9,
    title: "Business Acquisition Financing",
    dek: "A practical guide to financing the purchase of an established business, partner interest, or business-and-real-estate transaction.",
    intro: [
      "Business acquisition financing is underwritten around both the buyer and the business being purchased. Lenders typically evaluate the target company's historical cash flow, purchase price, valuation, industry, buyer experience, equity injection, seller involvement, collateral, and whether the post-close business can support the proposed debt.",
      "The capital stack can include SBA financing, seller financing, buyer equity, and other supplemental sources depending on the transaction.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Acquire an established operating company",
      "Purchase a franchise or route-based business",
      "Buy out an exiting partner",
      "Acquire a business together with owner-occupied real estate",
      "Finance eligible transition and closing needs as part of a broader acquisition",
    ],
    evaluationAreas: [
      {
        title: "Target cash flow",
        body: "Historical tax returns, interim results, add-backs, existing debt, and the business's ability to service acquisition debt.",
      },
      {
        title: "Purchase price",
        body: "Valuation support, allocation of purchase price, goodwill, equipment, inventory, and real estate where applicable.",
      },
      {
        title: "Buyer profile",
        body: "Credit, liquidity, industry/management experience, resume, and ability to operate the acquired company.",
      },
      {
        title: "Equity and seller structure",
        body: "Buyer injection, seller note, standby/subordination, and post-close leverage can affect the transaction.",
      },
      {
        title: "Transition risk",
        body: "Seller involvement, customer concentration, key employees, licenses, and continuity of operations.",
      },
    ],
    prepChecklist: [
      {
        category: "Target business",
        body: "Business tax returns, YTD P&L and balance sheet, debt schedule, purchase agreement/LOI, and supporting operational information.",
      },
      {
        category: "Buyer",
        body: "Personal tax returns, personal financial statement, resume, liquidity verification, ownership information, and credit authorization.",
      },
      {
        category: "Transaction",
        body: "Sources and uses, equity injection, seller financing terms, business valuation, and real-estate information if included.",
      },
    ],
    process: [
      { title: "Review the target", body: "Review the target business and preliminary purchase structure." },
      { title: "Analyze cash flow", body: "Analyze historical cash flow and expected post-close debt service." },
      { title: "Review the buyer", body: "Review buyer experience, credit, liquidity, and equity contribution." },
      { title: "Structure the deal", body: "Structure SBA/other acquisition financing and submit a complete package." },
      { title: "Underwrite & close", body: "Complete lender underwriting, valuation, closing diligence, and funding if approved." },
    ],
    strengthenTip:
      "Strong historical cash flow, a supportable purchase price, experienced buyer, adequate equity/liquidity, seller cooperation, and a thoughtful transition plan can materially improve financeability.",
  },
  {
    slug: "startup-financing",
    order: 10,
    title: "Startup Financing",
    dek: "A practical guide to capital options for new and recently established businesses that may not yet meet traditional operating-history requirements.",
    intro: [
      "Startup financing is different from conventional cash-flow lending because a new business may have limited or no operating history. Depending on the program, underwriting can rely more heavily on the owner's personal credit profile, personal income, liquidity, experience, business plan, use of funds, and the asset being financed.",
      "A new business isn't automatically ruled out for lacking 12 months of revenue — FLS routes the request toward programs built for newer businesses and evaluates the owner's profile and transaction from there.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Initial business launch costs",
      "Early marketing and working capital",
      "Purchase startup equipment",
      "Fund select franchise or acquisition-related costs",
      "Build initial operating capacity before traditional business lending becomes available",
    ],
    evaluationAreas: [
      {
        title: "Owner credit profile",
        body: "Established tradelines, utilization, recent inquiries, derogatory items, bankruptcy history, and overall personal credit depth can be important in unsecured startup programs.",
      },
      {
        title: "Personal income and liquidity",
        body: "Some credit-based programs require proof of income or the ability to support obligations while the business is new.",
      },
      {
        title: "Business plan",
        body: "Use of funds, projections, owner experience, industry, and a credible path to revenue can matter, especially for larger or more structured requests.",
      },
      {
        title: "Asset or transaction",
        body: "Equipment, franchise rights, acquired business assets, or other financeable assets can open additional paths.",
      },
    ],
    prepChecklist: [
      {
        category: "Owner",
        body: "Personal credit authorization, income documentation, personal financial information, and identification.",
      },
      {
        category: "Business",
        body: "Entity documents, business plan/projections when applicable, use-of-funds budget, and ownership information.",
      },
      {
        category: "Transaction",
        body: "Equipment quote, franchise/acquisition documentation, or other invoices/contracts tied to the request.",
      },
    ],
    process: [
      { title: "Identify the stage", body: "Identify whether the business is pre-revenue, newly operating, or approaching one year in business." },
      { title: "Review the owner", body: "Review owner credit, income, liquidity, experience, and use of funds." },
      { title: "Evaluate paths", body: "Evaluate unsecured/credit-based, equipment, acquisition, or other startup-compatible paths." },
      { title: "Complete the application", body: "Complete the program-specific application and documentation." },
      { title: "Review the structure", body: "Review approved structures carefully — startup products can vary significantly in cost and form." },
    ],
    strengthenTip:
      "Strong established personal credit, low utilization, clean recent history, documented income/liquidity, relevant experience, and a specific use of funds can improve startup options.",
  },
  {
    slug: "business-debt-refinance-and-mca-restructuring",
    order: 11,
    title: "Business Debt Refinance & MCA Restructuring",
    dek: "A practical guide to evaluating whether existing business obligations can be refinanced, consolidated, or restructured into a more manageable capital structure.",
    intro: [
      "Business debt refinance is not simply about replacing one obligation with another. The objective is to evaluate payment burden, remaining balances, cost, term, collateral, business cash flow, and whether a new structure creates a meaningful improvement.",
      "For businesses carrying merchant cash advances or other high-frequency obligations, FLS first explores longer-term refinance, term-loan consolidation, SBA refinance where eligible, secured restructuring, or other appropriate alternatives before recommending additional short-duration capital.",
    ],
    useCasesTitle: "Common use cases",
    useCases: [
      "Consolidate multiple business obligations",
      "Replace eligible daily or weekly payment structures",
      "Refinance eligible MCA balances",
      "Refinance equipment debt where collateral supports a new structure",
      "Extend repayment term where a qualifying program improves cash flow",
    ],
    evaluationAreas: [
      {
        title: "Current debt",
        body: "Balances, payoff amounts, number of positions, payment frequency, remaining term, and whether any obligations are in default.",
      },
      {
        title: "Business cash flow",
        body: "Revenue, deposits, ending balances, profitability, and ability to support the proposed replacement payment.",
      },
      {
        title: "Credit and history",
        body: "Recent payment history, credit profile, liens, defaults, and bankruptcy can affect available refinance paths.",
      },
      {
        title: "Collateral",
        body: "Equipment, real estate, receivables, or other assets may create secured restructuring options.",
      },
      {
        title: "Net benefit",
        body: "The new structure should be evaluated for payment relief, term, total cost, prepayment provisions, and overall effect on the business.",
      },
    ],
    prepChecklist: [
      {
        category: "Debt package",
        body: "Current statements, contracts when needed, payoff letters, payment history, and a complete debt schedule.",
      },
      {
        category: "Financial",
        body: "Recent business bank statements, P&L/balance sheet for larger requests, tax returns when required, and current cash-flow information.",
      },
      {
        category: "Collateral",
        body: "Equipment details, real-estate information, A/R schedules, or other collateral documentation if the refinance is asset-based.",
      },
    ],
    process: [
      { title: "Map current debt", body: "Build a complete picture of current balances and payment burden." },
      { title: "Assess capacity", body: "Determine the business's sustainable payment capacity." },
      { title: "Evaluate paths", body: "Evaluate term/refi, SBA, secured, unsecured, and specialty restructuring paths." },
      { title: "Compare structures", body: "Compare the new structure against existing obligations rather than focusing only on approval amount." },
      { title: "Close with clarity", body: "Proceed with payoffs and closing only after the borrower understands the approved terms and expected benefit." },
    ],
    strengthenTip:
      "Current payments, stable deposits, improved credit, available collateral, accurate payoff information, and a refinance request that produces a clear cash-flow benefit can strengthen the case.",
  },
];

export function getResourceGuide(slug: string): ResourceGuide | undefined {
  return RESOURCE_GUIDES.find((guide) => guide.slug === slug);
}
