/**
 * EPF/PF Calculation Engine
 * Handles employee and employer PF contributions with:
 * - Statutory ceiling (₹25,000 from 17 Sep 2026, ₹15,000 before)
 * - Full basic policy
 * - Custom wage base
 * - EPS allocation from employer contribution
 */

import { PF_CONFIG, type PfPolicy } from "../config/statutoryRules";
import { roundToRupee } from "./formatCurrency";

export interface PfInput {
  /** Monthly basic salary */
  monthlyBasic: number;
  /** PF policy: statutory_ceiling, full_basic, or custom */
  pfPolicy: PfPolicy;
  /** Custom PF wage base (only used when pfPolicy is "custom") */
  customPfWage?: number;
  /** Whether employee PF is opted-in (default: true) */
  employeePFOptIn?: boolean;
}

export interface PfBreakdown {
  /** PF wage base used for calculation */
  pfWageBase: number;
  /** Monthly employee PF contribution */
  monthlyEmployeePF: number;
  /** Monthly employer PF contribution (total: EPF + EPS) */
  monthlyEmployerPF: number;
  /** Monthly employer EPS allocation */
  monthlyEmployerEPS: number;
  /** Monthly employer EPF allocation (after EPS) */
  monthlyEmployerEPF: number;
  /** Annual employee PF */
  annualEmployeePF: number;
  /** Annual employer PF */
  annualEmployerPF: number;
  /** PF policy used */
  policyUsed: PfPolicy;
  /** Statutory ceiling used */
  statutoryCeiling: number;
  /** Effective date of ceiling */
  ceilingEffectiveDate: string;
}

/**
 * Calculate PF contributions for a given month.
 */
export function calculatePF(input: PfInput): PfBreakdown {
  const { monthlyBasic, pfPolicy, customPfWage } = input;
  const employeeOptIn = input.employeePFOptIn !== false;

  // Determine PF wage base
  let pfWageBase: number;
  let statutoryCeiling = PF_CONFIG.currentCeiling.amount;

  switch (pfPolicy) {
    case "statutory_ceiling":
      pfWageBase = Math.min(monthlyBasic, statutoryCeiling);
      break;
    case "full_basic":
      pfWageBase = monthlyBasic;
      break;
    case "custom":
      pfWageBase = customPfWage ?? Math.min(monthlyBasic, statutoryCeiling);
      break;
    default:
      pfWageBase = Math.min(monthlyBasic, statutoryCeiling);
  }

  // Employee PF: 12% of PF wages
  const monthlyEmployeePF = employeeOptIn
    ? roundToRupee(pfWageBase * PF_CONFIG.employeeRate)
    : 0;

  // Employer contributions:
  // EPS: 8.33% of PF wages (capped at statutory ceiling for EPS regardless)
  const epsWageBase = Math.min(pfWageBase, statutoryCeiling);
  const monthlyEmployerEPS = roundToRupee(epsWageBase * PF_CONFIG.epsRate);

  // Employer EPF: 3.67% of PF wages + any remainder from full basic
  // Actually: employer total is 12% of PF wages, minus EPS allocation
  const totalEmployerContrib = roundToRupee(pfWageBase * PF_CONFIG.employerRate);
  const monthlyEmployerEPF = totalEmployerContrib - monthlyEmployerEPS;

  return {
    pfWageBase,
    monthlyEmployeePF,
    monthlyEmployerPF: totalEmployerContrib,
    monthlyEmployerEPS,
    monthlyEmployerEPF,
    annualEmployeePF: monthlyEmployeePF * 12,
    annualEmployerPF: totalEmployerContrib * 12,
    policyUsed: pfPolicy,
    statutoryCeiling,
    ceilingEffectiveDate: PF_CONFIG.currentCeiling.effectiveFrom,
  };
}

/**
 * Get PF contribution for the pre-September 2026 period.
 * Uses the ₹15,000 ceiling that was in effect before 17 Sep 2026.
 */
export function calculatePFPreSep2026(monthlyBasic: number): PfBreakdown {
  const statutoryCeiling = PF_CONFIG.previousCeiling.amount;
  const pfWageBase = Math.min(monthlyBasic, statutoryCeiling);

  const monthlyEmployeePF = roundToRupee(pfWageBase * PF_CONFIG.employeeRate);
  const monthlyEmployerEPS = roundToRupee(
    Math.min(pfWageBase, statutoryCeiling) * PF_CONFIG.epsRate
  );
  const totalEmployerContrib = roundToRupee(pfWageBase * PF_CONFIG.employerRate);

  return {
    pfWageBase,
    monthlyEmployeePF,
    monthlyEmployerPF: totalEmployerContrib,
    monthlyEmployerEPS,
    monthlyEmployerEPF: totalEmployerContrib - monthlyEmployerEPS,
    annualEmployeePF: monthlyEmployeePF * 12,
    annualEmployerPF: totalEmployerContrib * 12,
    policyUsed: "statutory_ceiling",
    statutoryCeiling,
    ceilingEffectiveDate: PF_CONFIG.previousCeiling.effectiveUntil,
  };
}
