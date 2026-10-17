/**
 * Salary / CTC Decomposition Engine
 * Master orchestrator that combines tax, PF, gratuity, and NPS engines.
 *
 * Core identity:
 * CTC = fixedCashCompensation + targetVariablePay + joiningBonus
 *     + employerPF + gratuityAccrual + employerNPS + otherEmployerCosts
 *
 * Bank credit = cash salary components - employeePF - professionalTax - TDS
 */

import { calculateIncomeTax, type TaxBreakdown, type TaxRegime } from "./taxEngine";
import { calculatePF, type PfBreakdown, type PfInput } from "./pfEngine";
import { calculateGratuityAccrual, type GratuityBreakdown } from "./gratuityEngine";
import { PROFESSIONAL_TAX, type PfPolicy } from "../config/statutoryRules";
import { roundToRupee } from "./formatCurrency";

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface SalaryInput {
  /** Annual CTC (headline number) */
  annualCTC: number;

  // ─── CTC structure ───
  /** Basic salary as percentage of CTC (default 40%) */
  basicPercent: number;
  /** Or direct annual basic salary amount */
  annualBasicDirect?: number;
  /** HRA as percentage of basic (default 50% metro, 40% non-metro) */
  hraPercent?: number;

  // ─── Variable / Bonus ───
  /** Target variable pay (annual) */
  targetVariablePay?: number;
  /** Expected variable payout percentage (0-100, default 100) */
  variablePayoutPercent?: number;
  /** Joining bonus (one-time, included in first year) */
  joiningBonus?: number;

  // ─── Employer contributions ───
  /** PF policy */
  pfPolicy: PfPolicy;
  /** Custom PF wage (when pfPolicy = "custom") */
  customPfWage?: number;
  /** Include gratuity in CTC? (default true) */
  includeGratuity?: boolean;
  /** Employer NPS contribution (annual, if included in CTC) */
  employerNPS?: number;
  /** Other employer costs (insurance, etc.) */
  otherEmployerCosts?: number;

  // ─── Tax regime ───
  regime: TaxRegime;

  // ─── Location ───
  /** Professional tax state key */
  professionalTaxState?: string;
  /** Is metro city? (for HRA calculation) */
  isMetro?: boolean;

  // ─── Old regime deductions ───
  /** Annual rent paid (for HRA exemption) */
  rentPaid?: number;
  deduction80C?: number;
  deduction80D_self?: number;
  deduction80D_parents?: number;
  parentIsSenior?: boolean;
  deduction80CCD1B?: number;
  homeLoanInterest?: number;
}

// ─── Output Types ────────────────────────────────────────────────────────────

export interface SalaryBreakdown {
  // ─── CTC Decomposition ───
  annualCTC: number;
  annualBasic: number;
  monthlyBasic: number;
  annualHRA: number;
  annualSpecialAllowance: number;
  annualFixedCash: number;
  monthlyFixedCash: number;

  // ─── Variable ───
  targetVariablePay: number;
  expectedVariablePay: number;
  joiningBonus: number;

  // ─── Employer Costs (non-cash) ───
  employerPF: PfBreakdown;
  gratuity: GratuityBreakdown;
  employerNPS: number;
  otherEmployerCosts: number;
  totalEmployerCosts: number;

  // ─── Employee Deductions ───
  employeePF: number;
  monthlyEmployeePF: number;
  professionalTax: number;
  monthlyProfessionalTax: number;

  // ─── Tax ───
  tax: TaxBreakdown;

  // ─── Final Output ───
  /** Annual in-hand (fixed cash - employee deductions - tax) */
  annualInHand: number;
  /** Monthly in-hand bank credit */
  monthlyInHand: number;
  /** Monthly gross salary (before deductions) */
  monthlyGross: number;
  /** Annual gross salary */
  annualGross: number;
  /** Total annual realized compensation (in-hand + expected variable + joining) */
  totalAnnualRealized: number;

  // ─── Metadata ───
  assumptions: string[];
}

// ─── Main Calculator ─────────────────────────────────────────────────────────

export function calculateSalary(input: SalaryInput): SalaryBreakdown {
  const assumptions: string[] = [];

  // 1. Basic salary
  const annualBasic = input.annualBasicDirect
    ? input.annualBasicDirect
    : roundToRupee((input.annualCTC * input.basicPercent) / 100);
  const monthlyBasic = roundToRupee(annualBasic / 12);

  if (!input.annualBasicDirect) {
    assumptions.push(`Basic salary: ${input.basicPercent}% of CTC`);
  }

  // 2. PF calculation
  const pfInput: PfInput = {
    monthlyBasic,
    pfPolicy: input.pfPolicy,
    customPfWage: input.customPfWage,
  };
  const pf = calculatePF(pfInput);
  assumptions.push(
    `PF policy: ${input.pfPolicy === "statutory_ceiling" ? "Statutory ceiling (₹25,000/month from Sep 2026)" : input.pfPolicy === "full_basic" ? "Full basic salary" : "Custom"}`
  );

  // 3. Gratuity
  const includeGratuity = input.includeGratuity !== false;
  const gratuity = calculateGratuityAccrual(monthlyBasic);
  if (includeGratuity) {
    assumptions.push("Gratuity accrual included in CTC");
  }

  // 4. Employer NPS
  const employerNPS = input.employerNPS ?? 0;

  // 5. Other employer costs
  const otherEmployerCosts = input.otherEmployerCosts ?? 0;

  // 6. Total employer-side costs
  const totalEmployerCosts =
    pf.annualEmployerPF +
    (includeGratuity ? gratuity.annualAccrual : 0) +
    employerNPS +
    otherEmployerCosts;

  // 7. Variable pay
  const targetVariable = input.targetVariablePay ?? 0;
  const variablePayoutPct = input.variablePayoutPercent ?? 100;
  const expectedVariable = roundToRupee(
    (targetVariable * variablePayoutPct) / 100
  );
  const joiningBonus = input.joiningBonus ?? 0;

  // 8. HRA
  const hraPercent = input.hraPercent ?? (input.isMetro ? 50 : 40);
  const annualHRA = roundToRupee((annualBasic * hraPercent) / 100);

  // 9. Fixed cash = CTC - employer costs - variable - joining bonus
  // Special allowance = fixed cash - basic - HRA
  const annualFixedCash =
    input.annualCTC - totalEmployerCosts - targetVariable - joiningBonus;
  const annualSpecialAllowance = Math.max(
    0,
    annualFixedCash - annualBasic - annualHRA
  );
  const monthlyFixedCash = roundToRupee(annualFixedCash / 12);

  // 10. Gross salary for tax (fixed cash + expected variable + joining bonus)
  const annualGrossTaxable = annualFixedCash + expectedVariable + joiningBonus;

  // 11. Professional tax
  const ptState = input.professionalTaxState ?? "maharashtra";
  const ptConfig = PROFESSIONAL_TAX[ptState] ?? PROFESSIONAL_TAX.maharashtra;
  const annualProfTax = ptConfig.annualMax;

  // 12. Tax calculation
  const taxBreakdown = calculateIncomeTax({
    annualGrossSalary: annualGrossTaxable,
    regime: input.regime,
    annualBasicSalary: annualBasic,
    employerNPS: employerNPS > 0 ? employerNPS : undefined,
    employeePF: pf.annualEmployeePF,
    professionalTax: annualProfTax,
    hraReceived: input.regime === "old" ? annualHRA : undefined,
    rentPaid: input.regime === "old" ? input.rentPaid : undefined,
    isMetro: input.isMetro,
    deduction80C: input.deduction80C,
    deduction80D_self: input.deduction80D_self,
    deduction80D_parents: input.deduction80D_parents,
    parentIsSenior: input.parentIsSenior,
    deduction80CCD1B: input.deduction80CCD1B,
    homeLoanInterest: input.homeLoanInterest,
  });

  assumptions.push(`Tax regime: ${input.regime === "new" ? "New (default)" : "Old"}`);
  assumptions.push(`Professional tax: ${ptConfig.state} (₹${annualProfTax}/year)`);

  // 13. Final in-hand
  const annualInHand =
    annualFixedCash -
    pf.annualEmployeePF -
    annualProfTax -
    taxBreakdown.totalTax;
  const monthlyInHand = roundToRupee(annualInHand / 12);

  // 14. Total realized annual compensation
  const totalAnnualRealized = annualInHand + expectedVariable + joiningBonus;

  return {
    annualCTC: input.annualCTC,
    annualBasic,
    monthlyBasic,
    annualHRA,
    annualSpecialAllowance,
    annualFixedCash,
    monthlyFixedCash,

    targetVariablePay: targetVariable,
    expectedVariablePay: expectedVariable,
    joiningBonus,

    employerPF: pf,
    gratuity,
    employerNPS,
    otherEmployerCosts,
    totalEmployerCosts,

    employeePF: pf.annualEmployeePF,
    monthlyEmployeePF: pf.monthlyEmployeePF,
    professionalTax: annualProfTax,
    monthlyProfessionalTax: roundToRupee(annualProfTax / 12),

    tax: taxBreakdown,

    annualInHand,
    monthlyInHand,
    monthlyGross: roundToRupee(annualGrossTaxable / 12),
    annualGross: annualGrossTaxable,
    totalAnnualRealized,

    assumptions,
  };
}
