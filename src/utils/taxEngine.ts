/**
 * Income Tax Calculation Engine — Tax Year 2026-27
 * Pure functions, independently testable, no UI dependencies.
 *
 * References Income-tax Act, 2025:
 * - Section 202: New tax regime slab rates
 * - Section 19: Standard deduction
 * - Section 156: Rebate and marginal relief (legacy 87A)
 * - Section 124: Employer NPS deduction (legacy 80CCD(2))
 */

import {
  type TaxSlab,
  type SurchargeSlab,
  NEW_REGIME_SLABS_2026,
  OLD_REGIME_SLABS_2026,
  STANDARD_DEDUCTION,
  REBATE_CONFIG,
  SURCHARGE_SLABS_NEW_REGIME,
  SURCHARGE_SLABS_OLD_REGIME,
  CESS_RATE,
  EMPLOYER_NPS_CONFIG,
  OLD_REGIME_DEDUCTION_CAPS,
  HRA_CONFIG,
} from "../config/statutoryRules";
import { roundToRupee } from "./formatCurrency";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TaxRegime = "new" | "old";

export interface TaxInput {
  /** Annual taxable salary (gross salary - exempt allowances for old regime) */
  annualGrossSalary: number;
  /** Tax regime */
  regime: TaxRegime;
  /** Annual basic salary (for HRA/NPS calculations) */
  annualBasicSalary: number;
  /** Annual employer NPS contribution (if any) */
  employerNPS?: number;
  /** Annual employee PF contribution */
  employeePF?: number;
  /** Professional tax (annual) */
  professionalTax?: number;

  // Old regime deductions
  /** Section 80C investments (EPF, PPF, ELSS, etc.) — max ₹1,50,000 */
  deduction80C?: number;
  /** Section 80D — health insurance self/family */
  deduction80D_self?: number;
  /** Section 80D — health insurance parents */
  deduction80D_parents?: number;
  /** Is parent a senior citizen? (higher 80D cap) */
  parentIsSenior?: boolean;
  /** Section 80CCD(1B) — additional NPS */
  deduction80CCD1B?: number;
  /** Section 24(b) — home loan interest (self-occupied) */
  homeLoanInterest?: number;

  // HRA exemption inputs (old regime only)
  /** Annual HRA received */
  hraReceived?: number;
  /** Annual rent paid */
  rentPaid?: number;
  /** Is metro city? (Mumbai, Delhi, Kolkata, Chennai) */
  isMetro?: boolean;
}

export interface TaxBreakdown {
  regime: TaxRegime;
  /** Gross salary */
  grossSalary: number;
  /** Standard deduction applied */
  standardDeduction: number;
  /** Employer NPS deduction (Section 124) */
  employerNPSDeduction: number;
  /** Professional tax deduction */
  professionalTaxDeduction: number;
  /** HRA exemption (old regime only) */
  hraExemption: number;
  /** Total Chapter VI-A deductions (old regime only) */
  chapterVIADeductions: number;
  /** Chapter VI-A breakdown */
  chapterVIABreakdown: {
    section80C: number;
    section80D: number;
    section80CCD1B: number;
    employeePF_in80C: number;
  };
  /** Total taxable income after all deductions */
  taxableIncome: number;
  /** Tax before rebate (slab tax) */
  slabTax: number;
  /** Per-slab breakdown */
  slabBreakdown: { slab: string; taxableAmount: number; tax: number; rate: number }[];
  /** Rebate amount */
  rebate: number;
  /** Tax after rebate */
  taxAfterRebate: number;
  /** Surcharge */
  surcharge: number;
  /** Marginal relief on surcharge */
  surchargeMarginRelief: number;
  /** Tax after surcharge */
  taxAfterSurcharge: number;
  /** Health & Education Cess (4%) */
  cess: number;
  /** Total annual tax */
  totalTax: number;
  /** Monthly TDS estimate */
  monthlyTDS: number;
  /** Home loan interest deduction (old regime) */
  homeLoanDeduction: number;
}

// ─── Core Tax Functions ──────────────────────────────────────────────────────

/** Calculate slab tax with detailed breakdown */
export function calculateSlabTax(
  taxableIncome: number,
  slabs: TaxSlab[]
): { total: number; breakdown: { slab: string; taxableAmount: number; tax: number; rate: number }[] } {
  let remaining = Math.max(0, taxableIncome);
  let total = 0;
  const breakdown: { slab: string; taxableAmount: number; tax: number; rate: number }[] = [];

  for (const slab of slabs) {
    if (remaining <= 0) break;

    const slabWidth = slab.to === Infinity ? remaining : slab.to - slab.from + 1;
    const taxableInSlab = Math.min(remaining, slabWidth);
    const taxForSlab = roundToRupee(taxableInSlab * slab.rate);

    breakdown.push({
      slab:
        slab.to === Infinity
          ? `Above ₹${(slab.from - 1).toLocaleString("en-IN")}`
          : `₹${slab.from.toLocaleString("en-IN")} – ₹${slab.to.toLocaleString("en-IN")}`,
      taxableAmount: taxableInSlab,
      tax: taxForSlab,
      rate: slab.rate,
    });

    total += taxForSlab;
    remaining -= taxableInSlab;
  }

  return { total, breakdown };
}

/** Calculate rebate with marginal relief (Section 156) */
export function calculateRebate(
  taxableIncome: number,
  slabTax: number,
  regime: TaxRegime
): number {
  const config =
    regime === "new" ? REBATE_CONFIG.newRegime : REBATE_CONFIG.oldRegime;

  if (taxableIncome <= config.incomeThreshold) {
    // Full rebate: lesser of tax payable or max rebate
    return Math.min(slabTax, config.maxRebate);
  }

  // Marginal relief: if tax exceeds excess income over threshold
  if (regime === "new") {
    const excessIncome = taxableIncome - config.incomeThreshold;
    if (slabTax > excessIncome) {
      // Apply marginal relief: rebate reduces tax so tax ≤ excessIncome
      return slabTax - excessIncome;
    }
  }

  return 0;
}

/** Calculate surcharge with marginal relief */
export function calculateSurcharge(
  taxableIncome: number,
  taxAfterRebate: number,
  regime: TaxRegime
): { surcharge: number; marginalRelief: number } {
  const slabs =
    regime === "new" ? SURCHARGE_SLABS_NEW_REGIME : SURCHARGE_SLABS_OLD_REGIME;

  let surchargeRate = 0;
  for (const slab of slabs) {
    if (taxableIncome >= slab.from && taxableIncome <= slab.to) {
      surchargeRate = slab.rate;
      break;
    }
  }

  if (surchargeRate === 0) return { surcharge: 0, marginalRelief: 0 };

  const rawSurcharge = roundToRupee(taxAfterRebate * surchargeRate);

  // Marginal relief: surcharge should not exceed income over slab boundary
  let marginalRelief = 0;
  const prevSlab = slabs.find((s) => s.to < taxableIncome && s.rate < surchargeRate);
  if (prevSlab) {
    const boundaryIncome = prevSlab.to;
    const prevRate = prevSlab.rate;
    const taxAtBoundary = calculateSlabTax(boundaryIncome, 
      regime === "new" ? NEW_REGIME_SLABS_2026 : OLD_REGIME_SLABS_2026
    ).total;
    const surchargeAtBoundary = roundToRupee(taxAtBoundary * prevRate);
    const totalAtBoundary = taxAtBoundary + surchargeAtBoundary;
    const totalWithSurcharge = taxAfterRebate + rawSurcharge;
    const excessIncome = taxableIncome - boundaryIncome;

    if (totalWithSurcharge - totalAtBoundary > excessIncome) {
      marginalRelief = totalWithSurcharge - totalAtBoundary - excessIncome;
    }
  }

  return {
    surcharge: Math.max(0, rawSurcharge - marginalRelief),
    marginalRelief,
  };
}

/** Calculate HRA exemption (old regime only) */
export function calculateHRAExemption(
  annualBasicSalary: number,
  hraReceived: number,
  rentPaid: number,
  isMetro: boolean
): number {
  if (!hraReceived || !rentPaid || rentPaid <= 0) return 0;

  const exemptionOptions = [
    hraReceived,
    rentPaid - 0.1 * annualBasicSalary,
    (isMetro ? HRA_CONFIG.metroPercent : HRA_CONFIG.nonMetroPercent) *
      annualBasicSalary,
  ];

  return Math.max(0, Math.min(...exemptionOptions));
}

// ─── Main Tax Calculator ─────────────────────────────────────────────────────

export function calculateIncomeTax(input: TaxInput): TaxBreakdown {
  const regime = input.regime;
  const grossSalary = input.annualGrossSalary;

  // 1. Standard deduction
  const stdDeduction =
    regime === "new"
      ? Math.min(STANDARD_DEDUCTION.newRegime, grossSalary)
      : Math.min(STANDARD_DEDUCTION.oldRegime, grossSalary);

  // 2. Professional tax
  const profTax = input.professionalTax ?? 0;

  // 3. Employer NPS deduction (both regimes, different caps)
  let employerNPSDeduction = 0;
  if (input.employerNPS && input.employerNPS > 0) {
    const maxRate =
      regime === "new"
        ? EMPLOYER_NPS_CONFIG.newRegimeMaxRate
        : EMPLOYER_NPS_CONFIG.oldRegimeMaxRate;
    const maxDeduction = input.annualBasicSalary * maxRate;
    employerNPSDeduction = Math.min(input.employerNPS, maxDeduction);
  }

  // 4. HRA exemption (old regime only)
  let hraExemption = 0;
  if (regime === "old" && input.hraReceived && input.rentPaid) {
    hraExemption = calculateHRAExemption(
      input.annualBasicSalary,
      input.hraReceived,
      input.rentPaid,
      input.isMetro ?? false
    );
  }

  // 5. Chapter VI-A deductions (old regime only)
  let chapterVIATotal = 0;
  const chapterVIA = {
    section80C: 0,
    section80D: 0,
    section80CCD1B: 0,
    employeePF_in80C: 0,
  };

  if (regime === "old") {
    // 80C: includes employee PF + other 80C investments, capped at 1.5L
    const employeePFfor80C = input.employeePF ?? 0;
    const other80C = input.deduction80C ?? 0;
    chapterVIA.employeePF_in80C = employeePFfor80C;
    chapterVIA.section80C = Math.min(
      employeePFfor80C + other80C,
      OLD_REGIME_DEDUCTION_CAPS.section80C
    );

    // 80D: health insurance
    const selfCap = OLD_REGIME_DEDUCTION_CAPS.section80D_self;
    const parentCap = input.parentIsSenior
      ? OLD_REGIME_DEDUCTION_CAPS.section80D_seniorParents
      : OLD_REGIME_DEDUCTION_CAPS.section80D_parents;
    chapterVIA.section80D =
      Math.min(input.deduction80D_self ?? 0, selfCap) +
      Math.min(input.deduction80D_parents ?? 0, parentCap);

    // 80CCD(1B): additional NPS
    chapterVIA.section80CCD1B = Math.min(
      input.deduction80CCD1B ?? 0,
      OLD_REGIME_DEDUCTION_CAPS.section80CCD1B
    );

    chapterVIATotal =
      chapterVIA.section80C +
      chapterVIA.section80D +
      chapterVIA.section80CCD1B;
  }

  // 6. Home loan interest (old regime only, Section 24(b))
  let homeLoanDeduction = 0;
  if (regime === "old" && input.homeLoanInterest) {
    homeLoanDeduction = Math.min(
      input.homeLoanInterest,
      OLD_REGIME_DEDUCTION_CAPS.section24b_selfOccupied
    );
  }

  // 7. Taxable income
  const taxableIncome = Math.max(
    0,
    grossSalary -
      stdDeduction -
      profTax -
      employerNPSDeduction -
      hraExemption -
      chapterVIATotal -
      homeLoanDeduction
  );

  // 8. Slab tax
  const slabs =
    regime === "new" ? NEW_REGIME_SLABS_2026 : OLD_REGIME_SLABS_2026;
  const { total: slabTax, breakdown: slabBreakdown } = calculateSlabTax(
    taxableIncome,
    slabs
  );

  // 9. Rebate
  const rebate = calculateRebate(taxableIncome, slabTax, regime);
  const taxAfterRebate = Math.max(0, slabTax - rebate);

  // 10. Surcharge
  const { surcharge, marginalRelief: surchargeMarginRelief } =
    calculateSurcharge(taxableIncome, taxAfterRebate, regime);
  const taxAfterSurcharge = taxAfterRebate + surcharge;

  // 11. Health & Education Cess
  const cess = roundToRupee(taxAfterSurcharge * CESS_RATE);

  // 12. Total tax
  const totalTax = taxAfterSurcharge + cess;

  // 13. Monthly TDS estimate
  const monthlyTDS = roundToRupee(totalTax / 12);

  return {
    regime,
    grossSalary,
    standardDeduction: stdDeduction,
    employerNPSDeduction,
    professionalTaxDeduction: profTax,
    hraExemption,
    chapterVIADeductions: chapterVIATotal,
    chapterVIABreakdown: chapterVIA,
    taxableIncome,
    slabTax,
    slabBreakdown,
    rebate,
    taxAfterRebate,
    surcharge,
    surchargeMarginRelief,
    taxAfterSurcharge,
    cess,
    totalTax,
    monthlyTDS,
    homeLoanDeduction,
  };
}
