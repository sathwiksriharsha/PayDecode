/**
 * Central site configuration.
 * Every brand name, URL and metadata reference should pull from here
 * so renaming is a single-file change.
 */

const rawSiteUrl =
  (typeof process !== 'undefined' && process.env?.PUBLIC_SITE_URL) ||
  import.meta.env.PUBLIC_SITE_URL ||
  "https://paydecode.pages.dev";

export const site = {
  name: "PayDecode",
  tagline: "Decode Your Salary. Know Your Real Take-Home.",
  description:
    "India's most transparent CTC-to-in-hand salary calculator. Understand your real take-home pay with accurate tax, PF, and deduction breakdowns for Tax Year 2026–27.",
  /** Production canonical — used for sitemap, OG, canonical tags */
  url: rawSiteUrl.replace(/\/+$/, ''),
  /** OG image path (relative to public/) */
  ogImage: "/og-default.png",
  locale: "en_IN",
  currency: "INR",
  twitter: "@paydecode",
  themeColor: "#0052ff",
} as const;

export type SiteConfig = typeof site;
