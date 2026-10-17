/**
 * Statutory rules configuration — versioned by Tax Year.
 * Every number has a source URL, effective date, and last-verified date.
 * UI components should NEVER hardcode these values; always import from here.
 *
 * Tax Year: 2026–27 (1 April 2026 – 31 March 2027)
 * Act: Income-tax Act, 2025 (effective 1 April 2026)
 */

// ─── Tax Year 2026-27 New Regime Slabs (Section 202) ─────────────────────────
export interface TaxSlab {
  /** Lower bound (inclusive) */
  from: number;
  /** Upper bound (inclusive), Infinity for the last slab */
  to: number;
  /** Marginal rate as a decimal (e.g. 0.05 = 5%) */
  rate: number;
}

export const NEW_REGIME_SLABS_2026: TaxSlab[] = [
  { from: 0, to: 400_000, rate: 0.0 },
  { from: 400_001, to: 800_000, rate: 0.05 },
  { from: 800_001, to: 1_200_000, rate: 0.10 },
  { from: 1_200_001, to: 1_600_000, rate: 0.15 },
  { from: 1_600_001, to: 2_000_000, rate: 0.20 },
  { from: 2_000_001, to: 2_400_000, rate: 0.25 },
  { from: 2_400_001, to: Infinity, rate: 0.30 },
];

/**
 * Old regime slabs (for reference — Section 200 of IT Act 2025,
 * mapping from legacy Section 115BAC opt-out / default old regime).
 * These are the standard slabs for individuals below 60.
 */
export const OLD_REGIME_SLABS_2026: TaxSlab[] = [
  { from: 0, to: 250_000, rate: 0.0 },
  { from: 250_001, to: 500_000, rate: 0.05 },
  { from: 500_001, to: 1_000_000, rate: 0.20 },
  { from: 1_000_001, to: Infinity, rate: 0.30 },
];

// ─── Standard Deduction ──────────────────────────────────────────────────────
export const STANDARD_DEDUCTION = {
  newRegime: 75_000,
  oldRegime: 50_000,
  source: "https://www.incometaxindia.gov.in/w/section-19-199",
  effectiveFrom: "2026-04-01",
  lastVerified: "2026-10-17",
} as const;

// ─── Rebate (Section 156 — legacy 87A) ───────────────────────────────────────
export const REBATE_CONFIG = {
  /** New regime: rebate up to ₹60,000 if total income ≤ ₹12,00,000 */
  newRegime: {
    incomeThreshold: 1_200_000,
    maxRebate: 60_000,
  },
  /** Old regime: rebate up to ₹12,500 if total income ≤ ₹5,00,000 */
  oldRegime: {
    incomeThreshold: 500_000,
    maxRebate: 12_500,
  },
  source:
    "https://www.incometaxindia.gov.in/Documents/Act/Income-tax-Act-2025.pdf",
  effectiveFrom: "2026-04-01",
  lastVerified: "2026-10-17",
} as const;

// ─── Surcharge ───────────────────────────────────────────────────────────────
export interface SurchargeSlab {
  from: number;
  to: number;
  rate: number;
}

export const SURCHARGE_SLABS_NEW_REGIME: SurchargeSlab[] = [
  { from: 0, to: 5_000_000, rate: 0 },
  { from: 5_000_001, to: 10_000_000, rate: 0.10 },
  { from: 10_000_001, to: 20_000_000, rate: 0.15 },
  { from: 20_000_001, to: Infinity, rate: 0.25 },
];

export const SURCHARGE_SLABS_OLD_REGIME: SurchargeSlab[] = [
  { from: 0, to: 5_000_000, rate: 0 },
  { from: 5_000_001, to: 10_000_000, rate: 0.10 },
  { from: 10_000_001, to: 20_000_000, rate: 0.15 },
  { from: 20_000_001, to: 50_000_000, rate: 0.25 },
  { from: 50_000_001, to: Infinity, rate: 0.37 },
];

// ─── Health & Education Cess ─────────────────────────────────────────────────
export const CESS_RATE = 0.04;

// ─── EPF / PF Configuration ─────────────────────────────────────────────────
export const PF_CONFIG = {
  /** Employee contribution rate */
  employeeRate: 0.12,
  /** Employer contribution rate (to EPF + EPS combined) */
  employerRate: 0.12,
  /** EPS allocation rate from employer contribution (on PF wages up to ceiling) */
  epsRate: 8.33 / 100,
  /** Employer EPF rate (remainder after EPS allocation) */
  employerEpfRate: 3.67 / 100,
  /** Current statutory wage ceiling (effective 17 Sep 2026) */
  currentCeiling: {
    amount: 25_000,
    effectiveFrom: "2026-09-17",
    monthlyContribution: 3_000, // 12% of 25,000
    source:
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310973&lang=2&reg=48",
    lastVerified: "2026-10-17",
  },
  /** Previous statutory wage ceiling (before 17 Sep 2026) */
  previousCeiling: {
    amount: 15_000,
    effectiveUntil: "2026-09-16",
    monthlyContribution: 1_800, // 12% of 15,000
  },
} as const;

export type PfPolicy = "statutory_ceiling" | "full_basic" | "custom";

// ─── Gratuity ────────────────────────────────────────────────────────────────
export const GRATUITY_CONFIG = {
  /** Standard CTC accrual formula: basic * 15 / 26 / 12 ≈ 4.8077% of monthly basic */
  accrualNumerator: 15,
  accrualDenominator: 26,
  source: "Payment of Gratuity Act, 1972 (as amended)",
  lastVerified: "2026-10-17",
  note: "CTC provision estimate. Actual eligibility requires 5+ years continuous service for most employees.",
} as const;

// ─── Professional Tax (state-specific) ───────────────────────────────────────
export interface ProfessionalTaxConfig {
  state: string;
  annualMax: number;
  /** Monthly deduction amounts by salary slab (simplified) */
  monthlyAmount: number;
}

/** Common professional tax values. Most states cap at ₹2,500/year. */
export const PROFESSIONAL_TAX: Record<string, ProfessionalTaxConfig> = {
  maharashtra: { state: "Maharashtra", annualMax: 2_500, monthlyAmount: 200 },
  karnataka: { state: "Karnataka", annualMax: 2_400, monthlyAmount: 200 },
  west_bengal: { state: "West Bengal", annualMax: 2_500, monthlyAmount: 200 },
  telangana: { state: "Telangana", annualMax: 2_500, monthlyAmount: 200 },
  andhra_pradesh: { state: "Andhra Pradesh", annualMax: 2_500, monthlyAmount: 200 },
  tamil_nadu: { state: "Tamil Nadu", annualMax: 2_500, monthlyAmount: 200 },
  gujarat: { state: "Gujarat", annualMax: 2_500, monthlyAmount: 200 },
  madhya_pradesh: { state: "Madhya Pradesh", annualMax: 2_500, monthlyAmount: 200 },
  kerala: { state: "Kerala", annualMax: 2_500, monthlyAmount: 200 },
  delhi: { state: "Delhi", annualMax: 0, monthlyAmount: 0 },
  none: { state: "No Professional Tax", annualMax: 0, monthlyAmount: 0 },
};

// ─── Employer NPS (Section 124, legacy 80CCD(2)) ────────────────────────────
export const EMPLOYER_NPS_CONFIG = {
  /** New regime: up to 14% of salary (basic + DA) is deductible */
  newRegimeMaxRate: 0.14,
  /** Old regime: up to 10% of salary (basic + DA) is deductible */
  oldRegimeMaxRate: 0.10,
  source:
    "https://www.incometaxindia.gov.in/Documents/income-tax-bill-2025/new-bill-2025-navigator.pdf",
  effectiveFrom: "2026-04-01",
  lastVerified: "2026-10-17",
} as const;

// ─── Old Regime Deduction Caps ───────────────────────────────────────────────
export const OLD_REGIME_DEDUCTION_CAPS = {
  /** Section 80C equivalent — max ₹1,50,000 */
  section80C: 150_000,
  /** Section 80D — health insurance for self/family */
  section80D_self: 25_000,
  section80D_parents: 25_000,
  section80D_seniorParents: 50_000,
  /** Section 80CCD(1B) — additional NPS */
  section80CCD1B: 50_000,
  /** Section 24(b) — home loan interest */
  section24b_selfOccupied: 200_000,
} as const;

// ─── HRA Exemption ───────────────────────────────────────────────────────────
export const HRA_CONFIG = {
  /** Metro cities get 50% of basic, non-metro get 40% */
  metroPercent: 0.50,
  nonMetroPercent: 0.40,
  metroCities: ["mumbai", "delhi", "kolkata", "chennai"],
} as const;

// ─── Rules Metadata ──────────────────────────────────────────────────────────
export const RULES_METADATA = {
  taxYear: "2026–27",
  act: "Income-tax Act, 2025",
  effectiveFrom: "2026-04-01",
  rulesLastReviewed: "2026-10-17",
  sources: [
    {
      label: "Income-tax Act, 2025",
      url: "https://www.incometaxindia.gov.in/en/income-tax-act-202511",
    },
    {
      label: "Section 202 — New Tax Regime",
      url: "https://www.incometaxindia.gov.in/w/section-202-78",
    },
    {
      label: "Section 19 — Standard Deduction",
      url: "https://www.incometaxindia.gov.in/w/section-19-199",
    },
    {
      label: "Tax Rates & Computation",
      url: "https://www.incometaxindia.gov.in/w/tax-rates-and-computation",
    },
    {
      label: "EPFO Wage Ceiling Change (Sep 2026)",
      url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310973&lang=2&reg=48",
    },
  ],
} as const;
