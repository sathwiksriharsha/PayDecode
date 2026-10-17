/**
 * Currency formatting utilities for Indian Rupee display.
 * Uses the Indian numbering system (lakhs, crores).
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const INR_FORMATTER_PRECISE = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format as ₹12,50,000 (no decimals) */
export function formatINR(amount: number): string {
  return INR_FORMATTER.format(Math.round(amount));
}

/** Format as ₹12,50,000.00 (2 decimals) */
export function formatINRPrecise(amount: number): string {
  return INR_FORMATTER_PRECISE.format(amount);
}

/** Format as 12,50,000 (no ₹ symbol) */
export function formatNumber(amount: number): string {
  return NUMBER_FORMATTER.format(Math.round(amount));
}

/** Convert annual amount to monthly */
export function annualToMonthly(annual: number): number {
  return annual / 12;
}

/** Convert monthly amount to annual */
export function monthlyToAnnual(monthly: number): number {
  return monthly * 12;
}

/**
 * Format amount in lakhs/crores for display.
 * e.g., 1250000 → "12.5L", 15000000 → "1.5Cr"
 */
export function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000;
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)}Cr`;
  }
  if (abs >= 1_00_000) {
    const lakh = abs / 1_00_000;
    return `${sign}₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2)}L`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `${sign}₹${abs}`;
}

/**
 * Parse a user-entered salary string.
 * Handles: "12,50,000", "12.5L", "12.5 LPA", "1.5Cr", "1250000"
 */
export function parseSalaryInput(input: string): number | null {
  if (!input || typeof input !== "string") return null;

  const cleaned = input.trim().replace(/₹|,|\s/g, "").toLowerCase();
  if (!cleaned) return null;

  // Handle "12.5l", "12.5lpa", "12.5 lakhs"
  const lakhMatch = cleaned.match(/^(\d+\.?\d*)\s*(l|lpa|lakh|lakhs)$/);
  if (lakhMatch) {
    return parseFloat(lakhMatch[1]) * 1_00_000;
  }

  // Handle "1.5cr", "1.5crore", "1.5crores"
  const croreMatch = cleaned.match(/^(\d+\.?\d*)\s*(cr|crore|crores)$/);
  if (croreMatch) {
    return parseFloat(croreMatch[1]) * 1_00_00_000;
  }

  // Handle "50k", "50000"
  const kMatch = cleaned.match(/^(\d+\.?\d*)\s*k$/);
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1_000;
  }

  // Plain number
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/** Round to nearest rupee */
export function roundToRupee(amount: number): number {
  return Math.round(amount);
}

/** Round down to nearest rupee */
export function floorToRupee(amount: number): number {
  return Math.floor(amount);
}

/**
 * Convert number to Indian words representation.
 * e.g. 1200000 -> "Twelve Lakh", 88750 -> "Eighty-Eight Thousand Seven Hundred Fifty"
 */
export function numberToIndianWords(num: number): string {
  const n = Math.round(Math.abs(num));
  if (n === 0) return "Zero";

  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertTwoDigits(val: number): string {
    if (val === 0) return "";
    if (val < 20) return units[val];
    const t = tens[Math.floor(val / 10)];
    const u = units[val % 10];
    return u ? `${t}-${u}` : t;
  }

  function convertThreeDigits(val: number): string {
    const h = Math.floor(val / 100);
    const rem = val % 100;
    let res = "";
    if (h > 0) res += `${units[h]} Hundred`;
    if (rem > 0) {
      if (res) res += " ";
      res += convertTwoDigits(rem);
    }
    return res;
  }

  let crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  let thousand = Math.floor(rem / 1000);
  let hundred = rem % 1000;

  const parts: string[] = [];
  if (crore > 0) parts.push(`${numberToIndianWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${convertTwoDigits(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${convertTwoDigits(thousand)} Thousand`);
  if (hundred > 0) parts.push(convertThreeDigits(hundred));

  return parts.join(" ").trim();
}
