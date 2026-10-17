/**
 * Gratuity Calculation Engine
 * CTC accrual estimate using the standard formula: basic * 15 / 26 / 12
 */

import { GRATUITY_CONFIG } from "../config/statutoryRules";
import { roundToRupee } from "./formatCurrency";

export interface GratuityBreakdown {
  /** Monthly gratuity accrual (CTC component) */
  monthlyAccrual: number;
  /** Annual gratuity accrual */
  annualAccrual: number;
  /** Monthly basic salary used */
  monthlyBasic: number;
  /** Accrual percentage of basic */
  accrualPercent: number;
}

/**
 * Calculate the gratuity CTC accrual estimate.
 * Formula: monthlyBasic * 15 / 26 (≈ 4.8077% of monthly basic per month)
 * This is a CTC provision, not money normally credited every month.
 */
export function calculateGratuityAccrual(
  monthlyBasic: number
): GratuityBreakdown {
  // Annual accrual for 1 year of service = 15/26 of monthly basic (≈ 4.8077% of annual basic)
  const annualAccrual = roundToRupee(
    (monthlyBasic * GRATUITY_CONFIG.accrualNumerator) /
      GRATUITY_CONFIG.accrualDenominator
  );
  const monthlyAccrual = roundToRupee(annualAccrual / 12);

  return {
    monthlyAccrual,
    annualAccrual,
    monthlyBasic,
    accrualPercent:
      (GRATUITY_CONFIG.accrualNumerator / (GRATUITY_CONFIG.accrualDenominator * 12)) *
      100,
  };
}
