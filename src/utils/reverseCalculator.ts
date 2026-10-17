/**
 * Reverse Calculator Engine
 * Given a desired monthly in-hand amount, find the CTC that produces it.
 * Uses binary search on the monotonic forward calculation.
 */

import { calculateSalary, type SalaryInput, type SalaryBreakdown } from "./salaryEngine";
import { roundToRupee } from "./formatCurrency";

export interface ReverseResult {
  /** Whether a solution was found */
  found: boolean;
  /** The CTC that produces the target in-hand */
  estimatedCTC: number;
  /** Full salary breakdown at the estimated CTC */
  breakdown: SalaryBreakdown | null;
  /** Actual monthly in-hand at the estimated CTC */
  actualMonthlyInHand: number;
  /** Target monthly in-hand requested */
  targetMonthlyInHand: number;
  /** Difference from target */
  difference: number;
  /** Number of iterations used */
  iterations: number;
  /** Error message if not found */
  error?: string;
}

/**
 * Binary search to find CTC for a target monthly in-hand.
 * The forward function (CTC → in-hand) is monotonically increasing,
 * so binary search converges reliably.
 */
export function reverseCalculate(
  targetMonthlyInHand: number,
  baseInput: Omit<SalaryInput, "annualCTC">,
  options?: {
    /** Tolerance in rupees (default ₹100) */
    tolerance?: number;
    /** Max iterations (default 100) */
    maxIterations?: number;
    /** Lower bound CTC (default: targetMonthly * 12) */
    lowerBound?: number;
    /** Upper bound CTC (default: targetMonthly * 12 * 4) */
    upperBound?: number;
  }
): ReverseResult {
  const tolerance = options?.tolerance ?? 100;
  const maxIter = options?.maxIterations ?? 100;
  const targetAnnual = targetMonthlyInHand * 12;

  // Sanity check
  if (targetMonthlyInHand <= 0) {
    return {
      found: false,
      estimatedCTC: 0,
      breakdown: null,
      actualMonthlyInHand: 0,
      targetMonthlyInHand,
      difference: 0,
      iterations: 0,
      error: "Target monthly in-hand must be positive.",
    };
  }

  let low = options?.lowerBound ?? targetAnnual;
  let high = options?.upperBound ?? targetAnnual * 4;

  // Expand upper bound if needed
  let testHigh = calculateSalary({ ...baseInput, annualCTC: high });
  let expandAttempts = 0;
  while (testHigh.monthlyInHand < targetMonthlyInHand && expandAttempts < 10) {
    high *= 2;
    testHigh = calculateSalary({ ...baseInput, annualCTC: high });
    expandAttempts++;
  }

  if (testHigh.monthlyInHand < targetMonthlyInHand) {
    return {
      found: false,
      estimatedCTC: 0,
      breakdown: null,
      actualMonthlyInHand: testHigh.monthlyInHand,
      targetMonthlyInHand,
      difference: targetMonthlyInHand - testHigh.monthlyInHand,
      iterations: expandAttempts,
      error: "Target in-hand not reachable under current assumptions. The required CTC would be extremely high.",
    };
  }

  // Binary search
  let iterations = 0;
  let bestBreakdown: SalaryBreakdown | null = null;
  let bestDiff = Infinity;

  while (iterations < maxIter && high - low > 1) {
    const mid = roundToRupee((low + high) / 2);
    const result = calculateSalary({ ...baseInput, annualCTC: mid });
    const diff = result.monthlyInHand - targetMonthlyInHand;

    if (Math.abs(diff) < Math.abs(bestDiff)) {
      bestDiff = diff;
      bestBreakdown = result;
    }

    if (Math.abs(diff) <= tolerance / 12) {
      // Close enough
      return {
        found: true,
        estimatedCTC: mid,
        breakdown: result,
        actualMonthlyInHand: result.monthlyInHand,
        targetMonthlyInHand,
        difference: diff,
        iterations: iterations + 1,
      };
    }

    if (diff < 0) {
      low = mid;
    } else {
      high = mid;
    }

    iterations++;
  }

  // Return best result found
  const finalCTC = roundToRupee((low + high) / 2);
  const finalResult = bestBreakdown ?? calculateSalary({ ...baseInput, annualCTC: finalCTC });

  return {
    found: Math.abs(bestDiff) <= tolerance,
    estimatedCTC: finalResult.annualCTC,
    breakdown: finalResult,
    actualMonthlyInHand: finalResult.monthlyInHand,
    targetMonthlyInHand,
    difference: bestDiff,
    iterations,
  };
}
