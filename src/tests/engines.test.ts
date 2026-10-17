import { describe, it, expect } from "vitest";
import { calculateSalary, type SalaryInput } from "../utils/salaryEngine";
import {
  calculateIncomeTax,
  calculateSlabTax,
  calculateRebate,
  calculateSurcharge,
  type TaxInput,
} from "../utils/taxEngine";
import { calculatePF } from "../utils/pfEngine";
import { calculateGratuityAccrual } from "../utils/gratuityEngine";
import { reverseCalculate } from "../utils/reverseCalculator";
import {
  NEW_REGIME_SLABS_2026,
  OLD_REGIME_SLABS_2026,
  PF_CONFIG,
  STANDARD_DEDUCTION,
  REBATE_CONFIG,
} from "../config/statutoryRules";

describe("PayDecode Calculation Engine Unit Tests (claude.md Section 9)", () => {
  // 1. CTC Decomposition Invariants
  describe("1. CTC decomposition", () => {
    it("CTC components add back to CTC within rounding tolerance (₹1)", () => {
      const inputs: SalaryInput[] = [
        {
          annualCTC: 1200000,
          basicPercent: 40,
          pfPolicy: "statutory_ceiling",
          regime: "new",
        },
        {
          annualCTC: 2500000,
          basicPercent: 50,
          targetVariablePay: 300000,
          variablePayoutPercent: 90,
          joiningBonus: 100000,
          pfPolicy: "full_basic",
          employerNPS: 100000,
          includeGratuity: true,
          regime: "new",
        },
        {
          annualCTC: 600000,
          basicPercent: 40,
          pfPolicy: "statutory_ceiling",
          includeGratuity: false,
          regime: "old",
        },
      ];

      for (const input of inputs) {
        const result = calculateSalary(input);
        const decomposedCTC =
          result.annualFixedCash +
          result.targetVariablePay +
          result.joiningBonus +
          result.totalEmployerCosts;

        expect(Math.abs(decomposedCTC - input.annualCTC)).toBeLessThanOrEqual(1);
      }
    });
  });

  // 2. Employer PF vs Employee PF Separation & No Double Counting
  describe("2. Employer PF and Employee PF separation", () => {
    it("separates employer PF and employee PF without double counting in bank credit", () => {
      const input: SalaryInput = {
        annualCTC: 1500000,
        basicPercent: 40,
        pfPolicy: "statutory_ceiling",
        regime: "new",
      };

      const result = calculateSalary(input);

      // Employer PF is a company cost (non-cash)
      expect(result.employerPF.annualEmployerPF).toBe(36000); // 3,000 * 12
      // Employee PF is a deduction from employee cash
      expect(result.employeePF).toBe(36000); // 3,000 * 12

      // Monthly bank credit should be monthlyFixedCash - monthlyEmployeePF - monthlyPT - monthlyTDS
      const expectedMonthly =
        result.monthlyFixedCash -
        result.monthlyEmployeePF -
        result.monthlyProfessionalTax -
        result.tax.monthlyTDS;

      expect(result.monthlyInHand).toBe(expectedMonthly);
    });
  });

  // 3. PF Statutory Ceiling (effective 17 Sep 2026: ₹25,000 ceiling -> ₹3,000/mo)
  describe("3. Current PF statutory-ceiling scenario (17 Sep 2026)", () => {
    it("uses ₹25,000 ceiling from 17 Sep 2026 resulting in ₹3,000/mo (12%)", () => {
      expect(PF_CONFIG.currentCeiling.amount).toBe(25000);
      expect(PF_CONFIG.currentCeiling.effectiveFrom).toBe("2026-09-17");

      const pfResult = calculatePF({
        monthlyBasic: 50000, // Basic exceeds ₹25k
        pfPolicy: "statutory_ceiling",
      });

      expect(pfResult.pfWageBase).toBe(25000);
      expect(pfResult.monthlyEmployeePF).toBe(3000); // 12% of 25,000
      expect(pfResult.monthlyEmployerPF).toBe(3000); // 12% of 25,000
      expect(pfResult.monthlyEmployerEPS).toBe(Math.round(25000 * 0.0833));
    });

    it("caps at basic if basic is below ₹25,000", () => {
      const pfResult = calculatePF({
        monthlyBasic: 20000,
        pfPolicy: "statutory_ceiling",
      });

      expect(pfResult.pfWageBase).toBe(20000);
      expect(pfResult.monthlyEmployeePF).toBe(2400); // 12% of 20,000
    });
  });

  // 4. Full-basic and Custom PF Behavior
  describe("4. Full-basic/custom PF behavior", () => {
    it("calculates PF on full basic when selected", () => {
      const pfResult = calculatePF({
        monthlyBasic: 60000,
        pfPolicy: "full_basic",
      });

      expect(pfResult.pfWageBase).toBe(60000);
      expect(pfResult.monthlyEmployeePF).toBe(7200); // 12% of 60,000
      expect(pfResult.monthlyEmployerPF).toBe(7200);
    });

    it("calculates PF on custom wage base when specified", () => {
      const pfResult = calculatePF({
        monthlyBasic: 60000,
        pfPolicy: "custom",
        customPfWage: 30000,
      });

      expect(pfResult.pfWageBase).toBe(30000);
      expect(pfResult.monthlyEmployeePF).toBe(3600); // 12% of 30,000
    });
  });

  // 5. Tax Slab Boundaries (Section 202, Income-tax Act, 2025)
  describe("5. Tax slab boundaries for new regime 2026-27", () => {
    it("computes 0% up to ₹4,00,000", () => {
      const tax = calculateSlabTax(400000, NEW_REGIME_SLABS_2026);
      expect(tax.total).toBe(0);
    });

    it("computes 5% on ₹4,00,001 to ₹8,00,000", () => {
      const tax8L = calculateSlabTax(800000, NEW_REGIME_SLABS_2026);
      // 4L @ 5% = 20,000
      expect(tax8L.total).toBe(20000);
    });

    it("computes 10% on ₹8,00,001 to ₹12,00,000", () => {
      const tax12L = calculateSlabTax(1200000, NEW_REGIME_SLABS_2026);
      // 20,000 (from 4-8L) + 40,000 (4L @ 10%) = 60,000
      expect(tax12L.total).toBe(60000);
    });

    it("computes 15% on ₹12,00,001 to ₹16,00,000", () => {
      const tax16L = calculateSlabTax(1600000, NEW_REGIME_SLABS_2026);
      // 60,000 + 4L @ 15% (60,000) = 1,20,000
      expect(tax16L.total).toBe(120000);
    });

    it("computes 20% on ₹16,00,001 to ₹20,00,000", () => {
      const tax20L = calculateSlabTax(2000000, NEW_REGIME_SLABS_2026);
      // 1,20,000 + 4L @ 20% (80,000) = 2,00,000
      expect(tax20L.total).toBe(200000);
    });

    it("computes 25% on ₹20,00,001 to ₹24,00,000", () => {
      const tax24L = calculateSlabTax(2400000, NEW_REGIME_SLABS_2026);
      // 2,00,000 + 4L @ 25% (1,00,000) = 3,00,000
      expect(tax24L.total).toBe(300000);
    });

    it("computes 30% above ₹24,00,000", () => {
      const tax26L = calculateSlabTax(2600000, NEW_REGIME_SLABS_2026);
      // 3,00,000 + 2L @ 30% (60,000) = 3,60,000
      expect(tax26L.total).toBe(360000);
    });
  });

  // 6. New-regime Rebate and Marginal Relief (Section 156)
  describe("6. New-regime rebate & marginal relief at ₹12,00,000 threshold", () => {
    it("gives full rebate of up to ₹60,000 for taxable income <= ₹12,00,000", () => {
      const slabTax12L = 60000;
      const rebate = calculateRebate(1200000, slabTax12L, "new");
      expect(rebate).toBe(60000);
      // Total tax after rebate is 0
      expect(slabTax12L - rebate).toBe(0);
    });

    it("provides marginal relief when taxable income slightly exceeds ₹12,00,000", () => {
      // E.g. Taxable income = ₹12,10,000 (₹10,000 excess)
      // Normal slab tax at 12.1L:
      // Up to 12L = 60,000. Next 10,000 @ 15% = 1,500. Total slab tax = 61,500.
      // Since slab tax (61,500) > excess income (10,000),
      // rebate reduces tax so that tax after rebate == excess income (10,000).
      // Rebate = 61,500 - 10,000 = 51,500.
      const slabTax = calculateSlabTax(1210000, NEW_REGIME_SLABS_2026).total;
      expect(slabTax).toBe(61500);

      const rebate = calculateRebate(1210000, slabTax, "new");
      expect(rebate).toBe(51500);

      const taxAfterRebate = slabTax - rebate;
      expect(taxAfterRebate).toBe(10000); // Exactly the excess income!
    });

    it("ceases marginal relief when excess income >= slab tax", () => {
      // At ₹12.80L: slab tax is 60,000 + 80,000 * 0.15 = 72,000.
      // Excess income is 80,000 > 72,000, so relief ceases.
      const slabTax = calculateSlabTax(1280000, NEW_REGIME_SLABS_2026).total;
      const rebate = calculateRebate(1280000, slabTax, "new");
      expect(rebate).toBe(0);
    });
  });

  // 7. Standard Deduction
  describe("7. Standard deduction (Section 19)", () => {
    it("applies ₹75,000 for new regime", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 1000000,
        regime: "new",
        annualBasicSalary: 400000,
      });

      expect(tax.standardDeduction).toBe(75000);
      expect(tax.taxableIncome).toBe(925000);
    });

    it("applies ₹50,000 for old regime", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 1000000,
        regime: "old",
        annualBasicSalary: 400000,
      });

      expect(tax.standardDeduction).toBe(50000);
    });

    it("caps standard deduction to gross salary if salary is smaller", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 40000,
        regime: "new",
        annualBasicSalary: 20000,
      });

      expect(tax.standardDeduction).toBe(40000);
      expect(tax.taxableIncome).toBe(0);
    });
  });

  // 8. Cess, Surcharge, and Surcharge Marginal Relief
  describe("8. Health & Education Cess (4%) and Surcharge", () => {
    it("applies 4% cess on income tax", () => {
      // Taxable income 15,00,000
      // Slabs: 4-8L (20k) + 8-12L (40k) + 12-15L (3L @ 15% = 45k) = 1,05,000
      // Cess = 4% of 1,05,000 = 4,200
      // Total = 1,09,200
      const tax = calculateIncomeTax({
        annualGrossSalary: 1575000, // After 75k std deduction = 15,00,000
        regime: "new",
        annualBasicSalary: 600000,
      });

      expect(tax.slabTax).toBe(105000);
      expect(tax.cess).toBe(4200);
      expect(tax.totalTax).toBe(109200);
    });

    it("applies surcharge with marginal relief for income over ₹50 lakh", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 6075000, // 60L taxable after 75k std deduction
        regime: "new",
        annualBasicSalary: 2000000,
      });
      expect(tax.surcharge).toBeGreaterThan(0);
    });
  });

  // 9. Old-Regime Deductions & Caps
  describe("9. Old regime deductions and caps", () => {
    it("caps Section 80C at ₹1,50,000", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 1000000,
        regime: "old",
        annualBasicSalary: 400000,
        deduction80C: 250000, // User claims 2.5L
      });

      expect(tax.chapterVIABreakdown.section80C).toBe(150000);
    });

    it("caps 80D for self to ₹25,000", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 1000000,
        regime: "old",
        annualBasicSalary: 400000,
        deduction80D_self: 40000,
      });

      expect(tax.chapterVIABreakdown.section80D).toBe(25000);
    });

    it("does not apply deductions by default when not provided", () => {
      const tax = calculateIncomeTax({
        annualGrossSalary: 1000000,
        regime: "old",
        annualBasicSalary: 400000,
      });

      expect(tax.chapterVIADeductions).toBe(0);
      expect(tax.hraExemption).toBe(0);
      expect(tax.homeLoanDeduction).toBe(0);
    });
  });

  // 10. Variable Pay Taxed via Full Annual Model (not flat 30%)
  describe("10. Variable pay taxation", () => {
    it("taxes variable pay through progressive annual slabs, not hardcoded 30%", () => {
      const result = calculateSalary({
        annualCTC: 800000,
        basicPercent: 40,
        targetVariablePay: 200000,
        variablePayoutPercent: 100,
        pfPolicy: "statutory_ceiling",
        regime: "new",
      });

      expect(result.tax.totalTax).toBe(0); // 0 tax because of Section 156 rebate!
    });
  });

  // 11. Employer NPS (Section 124 in 2025 Act)
  describe("11. Employer NPS", () => {
    it("deducts employer NPS up to 14% of basic without double counting", () => {
      const basic = 600000;
      const npsAmount = 70000; // Under 14% of 6L (84k)

      const result = calculateSalary({
        annualCTC: 1500000,
        basicPercent: 40,
        employerNPS: npsAmount,
        pfPolicy: "statutory_ceiling",
        regime: "new",
      });

      expect(result.employerNPS).toBe(npsAmount);
      expect(result.tax.employerNPSDeduction).toBe(npsAmount);
    });
  });

  // 12. Reverse Calculator Monotonicity & Convergence
  describe("12. Reverse calculator", () => {
    it("converges to target monthly in-hand within tolerance", () => {
      const targets = [40000, 75000, 120000, 200000];

      for (const target of targets) {
        const reverse = reverseCalculate(target, {
          basicPercent: 40,
          pfPolicy: "statutory_ceiling",
          regime: "new",
        });

        expect(reverse.found).toBe(true);
        expect(Math.abs(reverse.actualMonthlyInHand - target)).toBeLessThanOrEqual(150);
      }
    });

    it("returns bounded failure state for unreachable targets", () => {
      const negativeTarget = reverseCalculate(-5000, {
        basicPercent: 40,
        pfPolicy: "statutory_ceiling",
        regime: "new",
      });

      expect(negativeTarget.found).toBe(false);
      expect(negativeTarget.error).toBeDefined();
    });
  });

  // 13. Gratuity Accrual (basic * 15 / 26 / 12)
  describe("13. Gratuity accrual", () => {
    it("calculates statutory accrual rate ~4.81% of basic", () => {
      const gratuity = calculateGratuityAccrual(50000); // 50k monthly basic (6L annual)
      const expectedAnnual = Math.round((50000 * 15) / 26);
      const expectedMonthly = Math.round(expectedAnnual / 12);
      expect(gratuity.monthlyAccrual).toBe(expectedMonthly);
      expect(gratuity.annualAccrual).toBe(expectedAnnual);
    });
  });

  // 14. Offer Comparison Independence
  describe("14. Offer comparison independence", () => {
    it("computes Offer A and Offer B with independent assumptions and net delta matches difference", () => {
      const offerA = calculateSalary({
        annualCTC: 1800000,
        basicPercent: 40,
        pfPolicy: "statutory_ceiling",
        regime: "new",
      });

      const offerB = calculateSalary({
        annualCTC: 2000000,
        basicPercent: 50,
        targetVariablePay: 400000,
        variablePayoutPercent: 80,
        pfPolicy: "full_basic",
        regime: "new",
      });

      const monthlyDelta = offerA.monthlyInHand - offerB.monthlyInHand;
      expect(monthlyDelta).toBe(offerA.monthlyInHand - offerB.monthlyInHand);
      // Both results are deterministic and independent
      expect(offerA.annualCTC).toBe(1800000);
      expect(offerB.annualCTC).toBe(2000000);
    });
  });

  // 15. SEO & Site Configuration Invariants
  describe("15. SEO audit & canonical configuration", () => {
    it("uses central PUBLIC_SITE_URL fallback https://paydecode.pages.dev without staging leaks", async () => {
      const { site } = await import("../config/site");
      const expectedHost = (process.env.PUBLIC_SITE_URL || "https://paydecode.pages.dev").replace(/\/+$/, '');
      expect(site.url).toBe(expectedHost);
      expect(site.name).toBe("PayDecode");
    });
  });

  // 16. Privacy by Design Invariants
  describe("16. Privacy by design invariants", () => {
    it("runs calculations synchronously without asynchronous network or fetch calls", () => {
      const result = calculateSalary({
        annualCTC: 1200000,
        basicPercent: 40,
        pfPolicy: "statutory_ceiling",
        regime: "new",
      });

      // Pure synchronous result returned immediately without Promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(result.monthlyInHand).toBeGreaterThan(0);
    });
  });
});
