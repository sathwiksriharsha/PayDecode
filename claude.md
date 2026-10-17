CLAUDE.md — PayDecode (working title)
1. Mission
Build PayDecode, a trustworthy, India-focused salary, CTC-to-in-hand, tax and offer-comparison suite. The user should understand not only the estimated monthly bank credit, but also why two offers with the same headline CTC can produce different take-home pay.
The product is an Astro 5 static site with a pure TypeScript calculation engine. Calculations, comparisons, and PDF generation should happen in the browser. Do not add a backend, database, authentication, or paid API unless the product owner explicitly approves it.
This brief is for a new, separate project. Do not modify the UploadRight repository or copy UploadRight-specific branding/content into this project unless the owner explicitly asks.
Working brand: PayDecode. Keep the name easy to change through a central site configuration.
2. Non-negotiable principles
1. Correctness beats SEO volume. Never ship a tax or payroll rule solely because it appears in this document. Verify current official law, record the source URL and effective date, and add tests.
2. Expose assumptions. PF wage basis, employee PF, employer PF, basic-salary ratio, variable payout, employer NPS, gratuity accrual, professional tax state, tax regime and deductions must be visible/editable where relevant.
3. No false precision. Label all figures as estimates, show a rounded result and a breakdown, and explain when payroll policy can change the answer.
4. Do not make unsupported company claims. Company and fresher-track pages must distinguish public, sourced facts from user-editable assumptions. Never imply that a company always uses a particular PF, basic-pay, bonus or variable-pay policy without reliable current evidence.
5. No guaranteed tax-saving claims. NPS and regime comparisons are conditional simulations, not personal tax advice. Never promise that an adjustment will reduce a person's tax to zero.
6. Privacy by design. Do not upload salaries, offer letters, names, or deduction inputs to a server. Do not persist them in local storage by default. Do not put input values in URLs, analytics events, or logs. Use client-side PDF generation.
7. Avoid thin programmatic pages. Static generation is a delivery method, not a ranking guarantee. Every published page must answer a distinct useful question, include a transparent calculation and source/methodology notes, and be reviewed for duplication.
8. Accessible, fast UI. Use semantic HTML, explicit labels, keyboard-accessible controls, clear focus states, responsive layouts, and no nested scroll areas for main workflows.
3. Current statutory research baseline (checked 17 October 2026)
Important: Tax Year 2026–27 falls under the Income-tax Act, 2025, effective from 1 April 2026. Do not blindly carry over the old Income-tax Act, 1961 section numbers into current-tax-year explanations. The legacy numbers below can be shown in parentheses only where helpful to users, and the currently applicable section must be checked against the official Act.
Official source links:
- Income-tax Act, 2025 and official transition material: https://www.incometaxindia.gov.in/en/income-tax-act-202511
- Income-tax Act, 2025, section 202 (new tax regime): https://www.incometaxindia.gov.in/w/section-202-78
- Income-tax Act, 2025, section 19 (deductions from salary, including standard deduction): https://www.incometaxindia.gov.in/w/section-19-199
- Income-tax Act, 2025, section 156 (resident-individual rebate and marginal relief; legacy reference Section 87A): https://www.incometaxindia.gov.in/Documents/Act/Income-tax-Act-2025.pdf
- Official Income-tax Department tax-rate computation page: https://www.incometaxindia.gov.in/w/tax-rates-and-computation
- Employer contribution to NPS legacy Section 80CCD maps to Section 124 in the 2025 Act; official section navigator: https://www.incometaxindia.gov.in/Documents/income-tax-bill-2025/new-bill-2025-navigator.pdf
- Official government announcement of the EPFO wage-ceiling change effective 17 September 2026: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310973&lang=2&reg=48
- Official 8th Central Pay Commission site: https://8cpc.gov.in/
3.1 New tax regime: Tax Year 2026–27
Use the following regular slab rates for ordinary taxable income under section 202, subject to the full rules, rebate, surcharge and cess:
Total taxable income bandMarginal rateUp to ₹4,00,0000%₹4,00,001–₹8,00,0005%₹8,00,001–₹12,00,00010%₹12,00,001–₹16,00,00015%₹16,00,001–₹20,00,00020%₹20,00,001–₹24,00,00025%Above ₹24,00,00030%
For a salaried individual, the standard deduction under section 19 is up to ₹75,000 under the new regime and up to ₹50,000 under the old regime, limited to salary where applicable.
3.2 Rebate and marginal relief
- The new-regime rebate applies to an eligible resident individual whose total income is at or below ₹12,00,000, up to the amount of income tax payable or ₹60,000, whichever is lower.
- Where eligible total income exceeds ₹12,00,000, implement the official marginal-relief rule: if normal tax before rebate exceeds the amount by which total income exceeds ₹12,00,000, the rebate reduces tax so that the relevant tax after rebate does not exceed that excess. Apply health and education cess after the applicable rebate and surcharge sequence required by law.
- Do not apply this rebate to special-rate income when the law disallows it. The MVP is a salary estimator, not a capital-gains or total-return tax engine; explain that scope clearly.
- The familiar “salary up to ₹12.75 lakh can have zero tax” statement is conditional on eligibility, the ₹75,000 standard deduction, and there being no other taxable income or complications that change the computation. Never apply it directly to headline CTC without computing the salary components first.
- Health and Education Cess is generally 4% of income tax plus applicable surcharge. For total incomes above ₹50 lakh, implement the applicable surcharge and marginal-relief rules rather than silently omitting them.
3.3 Employer NPS
- Under the new regime, qualifying employer contributions to NPS can be deductible up to the statutory limit (generally 14% of salary under the current new-regime rule), subject to the exact Act and conditions. For Tax Year 2026–27, reference the 2025 Act and Section 124, not just legacy Section 80CCD(2).
- Treat employer NPS as a CTC component if the offer includes it in CTC. Do not count it both as cash salary and as an employer contribution.
- The calculator may show an NPS scenario, but it must be conditional: employer policy, available NPS facility, eligible salary definition, statutory limits, and the candidate's actual tax position must be confirmed. Do not promise that a 10–14% contribution will always make tax zero.
3.4 EPF / PF policy — critical current change
- The Government announced an increase in the EPFO statutory wage ceiling from ₹15,000 to ₹25,000 per month, effective 17 September 2026. A 12% contribution on ₹25,000 is ₹3,000 per month, not ₹1,800. Sources: PIB releases linked above.
- The ₹25,000 figure is not permission to assume every employer deducts exactly ₹3,000. Coverage, eligible wages, employee status, employer policy, EPS allocation, and any contribution on higher wages can alter payroll. Represent it as the current statutory-ceiling scenario, with an editable employer-policy/full-basic scenario beside it.
- Do not label ₹1,800/month as the current statutory cap. It may appear only in a historical note or a before-change scenario explicitly dated before 17 September 2026.
- Because the statutory ceiling changed mid-Tax Year 2026–27, distinguish:
  1. Current monthly payroll estimate — use rules effective for the selected payroll date; and
  2. Full tax-year contribution estimate — account for effective dates and applicable payroll periods instead of pretending the September change applied to all earlier months.
- Calculate employee PF and employer PF separately. Employee PF affects take-home cash; employer PF is a CTC cost. Do not subtract employer PF from employee bank credit a second time after already excluding it from gross cash salary.
- Provide policy choices such as statutory_ceiling, full_basic, and custom. Store the wage ceiling and effective date in a versioned configuration rather than scattering ₹25,000 across components.
3.5 Gratuity
- A commonly used CTC accrual estimate is basicSalary * 15 / 26 / 12 (about 4.8077% of monthly basic for a monthly accrual). Make it optional/editable and describe it as a CTC provision, not money normally credited every month.
- Verify applicable current labour-law rules, coverage and eligibility for each explanatory article. Do not present annual accrual as a guaranteed annual payout. Fixed-term employees and other categories may be governed by different eligibility rules.
3.6 Old regime
Provide old-regime comparison only with transparent user inputs. At minimum consider standard deduction, professional tax, qualifying HRA exemption, 80C-equivalent eligible investments, eligible health-insurance deductions, qualifying NPS contributions, and qualifying home-loan interest. Apply caps and eligibility rules individually; do not simply subtract every maximum simultaneously by default.
For Tax Year 2026–27, reference the Income-tax Act, 2025 and official mapping where applicable. Legacy labels such as “80C”, “80D”, “80CCD(1B)” and “Section 24(b)” may be shown as familiar search/user terminology, but must not be described as current section numbers without a note. The old regime has different deduction eligibility rules from the new regime.
3.7 Bonus and variable pay
- Variable pay, performance bonuses and joining bonuses are not automatically taxed at a flat 30%. Their final tax effect depends on the person's annual taxable income, regime, rebate eligibility, surcharge/cess and payroll withholding.
- Show target variable pay, expected payout percentage, payout timing and after-tax estimate separately. For a bonus estimate, calculate the annual tax difference with and without the bonus under the selected assumptions; label monthly TDS allocation as an approximation.
- Separate guaranteed fixed cash from conditional variable pay and one-time joining bonuses. Do not call target CTC guaranteed cash.
3.8 8th Central Pay Commission
The Commission is active, but a scenario calculator must not present an unannounced fitment factor, DA merger, revised pay matrix or payout date as official. If using values such as 1.92x–2.86x from the brief, put them behind explicitly labelled hypothetical scenario controls and link the official Commission site. Update claims only when there is a dated official notification or report.
4. Product scope and routes
Phase 1 — reliable MVP
Build these core tool routes first:
1. / — main CTC-to-in-hand calculator and product explanation.
2. /ctc-to-inhand-calculator — primary full calculator / offer-letter decoder.
3. /inhand-to-ctc-calculator — reverse solve for a target monthly bank credit.
4. /salary-hike-calculator — pre-tax hike versus post-tax take-home change.
5. /offer-comparison-calculator — compare two offers using independent assumptions.
6. /new-vs-old-tax-regime-calculator — explain and compare the regimes.
7. /hra-exemption-calculator — old-regime HRA eligibility estimate.
8. /gratuity-calculator — indicative gratuity calculation with eligibility disclaimer.
9. /8th-pay-commission-calculator — hypothetical-only fitment scenarios until official inputs exist.
Create methodology/source pages before publishing large SEO silos:
- /methodology
- /tax-rules
- /sources
- /privacy
- /terms
- /about
- /contact
Phase 2 — programmatic salary pages
Use Astro getStaticPaths() only after the engine is tested. Candidate route patterns:
- /salary/[slug]-lpa-in-hand-salary/
- /company/[slug]/
- /govt-salary/[slug]/
Do not create 140+ thin pages as the first milestone. Start with a representative set of common salary values, then publish additional pages only when their tables, assumptions, internal links and FAQs add distinct value. Never make page-one ranking, indexation, traffic, AdSense approval or revenue guarantees.
Company track pages (for example TCS Ninja/Digital/Prime, Infosys DSE/SP, Accenture ASE) must use explicitly dated sources or be presented as illustrative examples, not confirmed company payroll policy. Include last-reviewed dates and avoid copying competitors' phrasing.
5. Calculation-engine architecture
Keep the business logic framework-independent and pure. UI components should call the engine, not reimplement financial rules.
Suggested layout:
src/
  config/
    site.ts
    taxYears.ts
    statutoryRules.ts
    companyAssumptions.ts
  utils/
    salaryEngine.ts
    taxEngine.ts
    pfEngine.ts
    gratuityEngine.ts
    reverseCalculator.ts
    rounding.ts
    formatCurrency.ts
  components/
    SalaryCalculator.tsx-or-astro
    OfferComparison.tsx-or-astro
    TaxBreakdown.tsx-or-astro
    SalaryBreakdownTable.astro
    AssumptionsPanel.astro
    SourcesAndDisclaimer.astro
  content/
    salary-pages/
    company-pages/
    govt-salary-pages/
  pages/
  tests/
Use the actual framework conventions already present in the repository; do not force React into an Astro/Vue/vanilla implementation if it is unnecessary. A small interactive island is acceptable where it makes state management easier.
5.1 CTC decomposition
Model the offer explicitly, rather than assuming one universal CTC-to-gross ratio. At minimum separate:
- Annual headline CTC
- Fixed cash salary / guaranteed cash components
- Target variable pay / expected realized payout
- Joining bonus and other one-time items
- Employer PF contribution
- Employer NPS contribution
- Gratuity accrual
- Insurance and other employer-paid benefits/costs
- Employee PF deduction
- State-specific professional tax
- Annual income tax / estimated TDS
A useful conceptual identity is:
CTC = fixedCashCompensation + targetVariablePay + joiningBonusIncludedInYear + employerPF + gratuityAccrual + employerNPS + otherEmployerCosts
This is a modeling identity, not a claim that every offer letter defines components the same way. Allow the user to select or override components and prevent double counting.
The employee's estimated bank credit is based on the actual cash-pay components for the period, minus employee-side payroll deductions, professional tax and estimated TDS. Do not subtract employer-side costs again after removing them from cash compensation.
Default basic-pay ratio may be 40% as a clearly labelled starting assumption, but support 40%/50%/custom and do not imply that all companies use the same ratio. Better still, allow direct basic-pay input when known.
5.2 PF model
Implement both employer and employee contributions, selected wage basis, the effective statutory ceiling, and an editable custom/full-basic contribution policy. Be explicit whether the model uses basic + DA as PF wages or another permitted/configured wage base. Handle contribution rounding only as specified by the current rules. Keep EPS allocation distinct when it changes employer EPF cash-cost calculations.
5.3 Income-tax model
Create pure, independently tested functions for:
- taxable salary construction;
- the new-regime slab tax calculation;
- eligible rebate and marginal relief;
- applicable surcharge and surcharge marginal relief;
- health and education cess;
- old-regime taxable income, exemptions and deductions;
- annual tax and a clearly labelled monthly TDS estimate.
Keep rules versioned by Tax Year. Avoid embedding statutory numbers in UI components. Store official source URL, effective-from date and last-verified date alongside each rule config.
The MVP salary engine is for ordinary employment income. Explicitly exclude complex/special-rate income, capital gains, foreign income, multiple employers, arrears/relief, perquisite edge cases, employer stock compensation and other unsupported cases unless separately implemented and tested. Provide a visible note explaining that real payroll/tax outcomes may differ.
5.4 Reverse calculator
Use a monotonic search (binary search is suitable for a stable deterministic model) to find the CTC that meets a desired monthly net amount. Re-run the same full calculation path used by the forward calculator for every candidate CTC. Include bounds, max iterations, a tolerance, and a clear “not reachable under current assumptions” outcome. Never estimate the answer using a simplified percentage after-tax shortcut.
5.5 Offer comparison
Offer A and Offer B must have independent assumptions for basic ratio, PF policy, bonus payout, NPS, benefits and tax regime. Display:
- headline CTC;
- fixed/guaranteed cash;
- estimated monthly bank credit;
- conditional variable/bonus cash separately;
- annual tax estimate and deductions;
- delta in monthly net cash and delta in total realized annual compensation.
Never rank an offer by headline CTC alone.
5.6 Simulated payslip PDF
Generate PDFs entirely in the browser. Label it “Illustrative estimate — not an employer-issued payslip”. Show inputs and assumptions, estimated earnings, deductions, tax, source/rules date, and disclaimer. Never use company logos or present the PDF as an official payroll document.
6. UI / content guidance
- Visual direction: light, editorial fintech UI; clean white/off-white surface, dark readable text, restrained accent color, soft borders, compact tables and visible section hierarchy.
- Lead with the practical result (estimated monthly in-hand), but show an expandable, line-by-line breakdown immediately below.
- The core experience must distinguish CTC, fixed gross, taxable income, employee deductions, employer CTC components, variable pay, and net bank credit.
- Provide the PF comparison using accurate, dated labels rather than permanently branding the old ₹1,800 number as statutory.
- Add explanatory hints beside jargon: CTC, basic, PF, gratuity, NPS, TDS, marginal relief, standard deduction.
- Show “Why this may differ from your payslip” next to the result: employer salary structure, payroll settings, state professional tax, variable payout, other income, tax regime, rounding and statutory changes.
- FAQ and page copy should answer user questions naturally. Do not make unsupported claims like “this calculator is 100% legally accurate.” Prefer “estimate based on the displayed assumptions and linked rules.”
- Cite authoritative sources near legal/statutory claims. Store citations in content data rather than scattering raw URLs through templates.
7. SEO and growth guardrails
- Configure the production base URL using one central PUBLIC_SITE_URL, with a sensible development fallback. Use the same value for canonical URLs, Open Graph URLs, JSON-LD and sitemap generation.
- Generate robots.txt, sitemap and canonical metadata from Astro configuration. Do not mix staging and production canonical domains.
- Each page needs a unique, accurate title, description and H1, meaningful main content, relevant internal links, and only schema types that truthfully apply to visible content.
- Use breadcrumbs where helpful. Do not emit FAQ structured data for FAQs that are not visible on the page or rely on schema as a ranking guarantee.
- Avoid keyword stuffing, fake “official” labels, false company-affiliation claims, fabricated citations, generated city/company pages with only swapped names, and publishing unreviewed numerical tax claims.
- The competitor rankings, search volumes, RPMs, click prices and revenue projections in the supplied brief are unverified market hypotheses. Do not hardcode them into the site or claim them as facts. Validate actual demand using primary search tools and Search Console once available.
- Ads and affiliate links must be clearly identified. Never place deceptive ads adjacent to a primary “calculate” or “download” action. Do not promise AdSense approval or revenue.
- Do not assume hosting is unlimited or universally zero-cost; use static hosting/free-tier limits as a deployment assumption, not a guarantee.
8. Sources and editorial maintenance
- Every statutory rate/cap/deduction has a source URL, jurisdiction, effective date, lastVerifiedAt, and short note on scope.
- Prefer Income Tax Department, India Code, Gazette notifications, Ministry of Labour/EPFO, PIB or the relevant official commission. Secondary sources can explain but should not override official materials.
- Keep a visible “Rules last reviewed” date. Where there is uncertainty or a pending notification, mark the feature as a scenario and do not call it official.
- Review current rules before each release that changes tax/PF calculations.
- Store company package figures with source URL, publication date if available, date checked, and a confidence/verification note. If no good source exists, use a user-controlled illustrative assumption.
9. Testing requirements
Create tests for the pure engine before adding lots of programmatic pages. Tests must cover at least:
1. CTC decomposition adds back to CTC (within documented rounding tolerance).
2. Employer PF and employee PF are separated and never double-counted.
3. Current PF statutory-ceiling scenario uses the effective ₹25,000 wage ceiling from 17 September 2026 (12% ceiling calculation = ₹3,000/month when the relevant wages/coverage rules call for that scenario); a pre-change scenario may show ₹1,800 only when explicitly dated.
4. Full-basic/custom PF behavior and basic-pay ratio overrides.
5. Tax slab boundaries immediately below, at and above ₹4L, ₹8L, ₹12L, ₹16L, ₹20L and ₹24L.
6. New-regime rebate behavior at taxable income ₹12L, just below it, and just above it; marginal relief around the boundary.
7. Standard deduction applied only once and with the correct regime-specific limit.
8. Cess, surcharge and surcharge marginal relief for applicable high-income cases.
9. Old-regime HRA/80C/80D/NPS/home-loan inputs respect their individual eligibility caps and do not apply by default when not supplied.
10. Variable pay is taxed through the full annual model, not a hardcoded 30% deduction.
11. Employer NPS affects CTC cash decomposition and taxable income without double counting.
12. Reverse calculator converges for representative targets and returns a bounded failure state for unreachable targets.
13. Offer comparison computes both offers independently and the net difference equals the difference of underlying results.
14. PDF is clearly marked illustrative and contains all assumptions/date notes.
15. SEO audit checks canonicals and sitemap against the configured base URL; tests internal links and duplicate page metadata.
16. No calculator inputs are written to network requests, logs, URL query parameters or persistent storage by default.
17. 8th CPC hypothetical inputs are labelled hypothetical and never presented as official constants.
Use example-based tests plus boundary tests. If feasible, add property-based tests for monotonicity of the reverse calculation and invariants in CTC decomposition. Test outputs against independently computed examples from official government material; do not create golden values from the app's own implementation.
10. Implementation sequence for the coding agent
1. Inspect first: inspect the repository, package manager, Astro version, existing routes, CSS strategy and tests. Report what exists and propose an edit plan. Do not overwrite files blindly.
2. Lay foundations: create site config, legal/rules version config, currency formatting, methodology/source content and privacy/terms pages.
3. Build calculation engine: pure TypeScript modules + unit tests first. Implement CTC decomposition, PF rules/effective dates, new-regime tax, old-regime estimate and transparent assumptions.
4. Build one excellent main calculator: desktop/mobile UI, result breakdown, editable assumptions, variable pay and employer NPS scenario, clear disclaimer.
5. Add other tools: reverse calculator, hike calculator, comparison, regime comparison, HRA and gratuity using the same engine.
6. Add PDF generation after the result model is stable and tested.
7. Add programmatic SEO pages only after calculation rules and source citations pass review.
8. Run verification: npm run build, all automated tests, internal-link/SEO checks and manual browser checks for empty input, invalid input, boundaries, mobile responsiveness, keyboard controls and PDF output.
9. Summarize honestly: provide files changed, commands/tests run and their real results, unresolved statutory questions, deployment settings and next actions. Never claim a browser check, test, deployment or domain verification that was not actually performed.
11. Definition of done for an MVP
- Main calculator produces a consistent line-by-line CTC-to-bank-credit estimate.
- Tax/PF logic lives in tested pure modules and has visible version dates/source links.
- New Tax Year 2026–27 slab, rebate, marginal relief, standard deduction, cess and applicable surcharge cases are covered by tests.
- PF uses the effective current statutory ceiling and shows policy alternatives without misleading labels.
- Variable pay and employer NPS are modeled without flat 30% bonus tax assumptions or CTC double counting.
- Reverse calculator and offer comparison reuse the same engine.
- Privacy, methodology, tax rules, source and terms pages exist.
- Production canonicals, sitemap and robots are internally consistent.
- Build and tests pass; key user journeys have been checked in a browser.
- No unverified keyword volume, company payroll rule, tax guarantee, fitment factor or revenue forecast is presented as established fact.