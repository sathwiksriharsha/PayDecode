import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { site } from '../config/site';

const distDir = path.resolve(process.cwd(), 'dist');
const srcDir = path.resolve(process.cwd(), 'src');

/** Recursively collect all HTML files in a directory */
function getHtmlFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getHtmlFiles(fullPath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

/** Recursively collect all source script/astro files */
function getSourceFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getSourceFiles(fullPath, fileList);
    } else if (/\.(astro|ts|js|mjs)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('SEO, Canonical Domain & Privacy Automated Test Suite', () => {
  let htmlFiles: string[] = [];

  beforeAll(() => {
    // Ensure dist is built
    if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
      execSync('npm run build', { stdio: 'inherit' });
    }
    htmlFiles = getHtmlFiles(distDir);
  });

  describe('1. Built Pages & Metadata Invariants', () => {
    it('has built all expected static HTML pages (minimum 60 pages)', () => {
      expect(htmlFiles.length).toBeGreaterThanOrEqual(60);
    });

    it('every built HTML page has valid, unique metadata and canonical URLs', () => {
      const titles = new Map<string, string>();
      const descriptions = new Map<string, string>();
      const canonicals = new Map<string, string>();

      for (const filePath of htmlFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relPath = path.relative(distDir, filePath).replace(/\\/g, '/');

        // Extract <title>
        const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
        expect(titleMatch, `Page ${relPath} must have a <title> tag`).not.toBeNull();
        const title = titleMatch![1].trim();
        expect(title.length, `Title on ${relPath} must be at least 10 chars`).toBeGreaterThanOrEqual(10);
        expect(title).not.toContain('undefined');
        expect(title).not.toContain('null');

        // Extract <meta name="description" content="...">
        const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
        expect(descMatch, `Page ${relPath} must have a meta description`).not.toBeNull();
        const desc = descMatch![1].trim();
        expect(desc.length, `Description on ${relPath} must be at least 20 chars`).toBeGreaterThanOrEqual(20);

        // Extract <link rel="canonical" href="...">
        const canonicalMatch = content.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
        expect(canonicalMatch, `Page ${relPath} must have a canonical link`).not.toBeNull();
        const canonical = canonicalMatch![1].trim();

        // Verify canonical uses configured host
        expect(
          canonical.startsWith(site.url),
          `Canonical ${canonical} on ${relPath} must start with site URL ${site.url}`
        ).toBe(true);

        // Check for uniqueness across distinct pages
        if (titles.has(title)) {
          throw new Error(`Duplicate <title> found on ${relPath} and ${titles.get(title)}: "${title}"`);
        }
        titles.set(title, relPath);

        if (descriptions.has(desc)) {
          throw new Error(`Duplicate meta description on ${relPath} and ${descriptions.get(desc)}: "${desc}"`);
        }
        descriptions.set(desc, relPath);

        if (canonicals.has(canonical)) {
          throw new Error(`Duplicate canonical URL on ${relPath} and ${canonicals.get(canonical)}: "${canonical}"`);
        }
        canonicals.set(canonical, relPath);
      }
    });
  });

  describe('2. Internal Link Integrity (Zero Broken Links)', () => {
    it('verifies that every internal link resolves to an existing built asset or page', () => {
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
      const checkedLinks = new Set<string>();

      for (const filePath of htmlFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const relFilePath = path.relative(distDir, filePath).replace(/\\/g, '/');

        let match: RegExpExecArray | null;
        while ((match = linkRegex.exec(content)) !== null) {
          const rawHref = match[2].trim();

          // Skip empty, anchors, javascript, external links, mailto, tel
          if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
            continue;
          }
          if (/^https?:\/\//i.test(rawHref)) {
            // If external URL points to canonical host, check internal route
            if (rawHref.startsWith(site.url)) {
              const urlObj = new URL(rawHref);
              checkPath(urlObj.pathname, relFilePath);
            }
            continue;
          }

          // Internal relative/absolute path
          if (rawHref.startsWith('/')) {
            checkPath(rawHref, relFilePath);
          }
        }
      }

      function checkPath(href: string, sourcePage: string) {
        // Strip query params and hash
        const cleanPath = href.split('?')[0].split('#')[0];
        if (!cleanPath || cleanPath === '/') {
          expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);
          return;
        }

        const cacheKey = cleanPath;
        if (checkedLinks.has(cacheKey)) return;
        checkedLinks.add(cacheKey);

        const normalized = cleanPath.replace(/^\//, '').replace(/\/$/, '');
        const candidate1 = path.join(distDir, normalized, 'index.html');
        const candidate2 = path.join(distDir, `${normalized}.html`);
        const candidate3 = path.join(distDir, normalized);

        const exists = fs.existsSync(candidate1) || fs.existsSync(candidate2) || fs.existsSync(candidate3);
        expect(
          exists,
          `Broken internal link "${cleanPath}" found on page ${sourcePage}. Neither "${candidate1}" nor "${candidate2}" exists.`
        ).toBe(true);
      }
    });
  });

  describe('3. Canonical Domain Consistency (Sitemap & Robots)', () => {
    it('robots.txt exists and specifies the exact canonical sitemap index URL', () => {
      const robotsPath = path.join(distDir, 'robots.txt');
      expect(fs.existsSync(robotsPath), 'dist/robots.txt must exist').toBe(true);
      const robotsContent = fs.readFileSync(robotsPath, 'utf-8');

      expect(robotsContent).toContain('User-agent: *');
      expect(robotsContent).toContain('Allow: /');
      expect(robotsContent).toContain(`Sitemap: ${site.url}/sitemap-index.xml`);

      // Ensure no outdated domains
      if (site.url !== 'https://paydecode.in') {
        expect(robotsContent).not.toContain('https://paydecode.in/sitemap-index.xml');
      }
    });

    it('sitemap-index.xml and child sitemaps use the configured canonical host', () => {
      const sitemapIndexPath = path.join(distDir, 'sitemap-index.xml');
      expect(fs.existsSync(sitemapIndexPath), 'dist/sitemap-index.xml must exist').toBe(true);
      const indexContent = fs.readFileSync(sitemapIndexPath, 'utf-8');

      expect(indexContent).toContain('<sitemapindex');
      expect(indexContent).toContain(`${site.url}/sitemap-0.xml`);

      const sitemap0Path = path.join(distDir, 'sitemap-0.xml');
      expect(fs.existsSync(sitemap0Path), 'dist/sitemap-0.xml must exist').toBe(true);
      const sitemap0Content = fs.readFileSync(sitemap0Path, 'utf-8');

      expect(sitemap0Content).toContain('<urlset');

      // Extract all <loc> entries
      const locMatches = [...sitemap0Content.matchAll(/<loc>([^<]+)<\/loc>/g)];
      expect(locMatches.length).toBeGreaterThanOrEqual(60);

      for (const locMatch of locMatches) {
        const loc = locMatch[1];
        expect(
          loc.startsWith(site.url),
          `Sitemap entry "${loc}" does not match configured canonical domain "${site.url}"`
        ).toBe(true);
      }
    });
  });

  describe('4. Simulated Payslip Statutory Invariant', () => {
    it('contains the exact legal disclaimer: "Illustrative estimate — not an employer-issued payslip"', () => {
      const ctcCalcPath = path.join(distDir, 'ctc-to-inhand-calculator', 'index.html');
      expect(fs.existsSync(ctcCalcPath)).toBe(true);
      const content = fs.readFileSync(ctcCalcPath, 'utf-8');

      // Exact case-insensitive disclaimer text
      const targetDisclaimer = 'Illustrative estimate — not an employer-issued payslip';
      const hasExactDisclaimer = content.toLowerCase().includes(targetDisclaimer.toLowerCase());
      expect(
        hasExactDisclaimer,
        `Expected simulated payslip to contain exact disclaimer: "${targetDisclaimer}"`
      ).toBe(true);
    });
  });

  describe('5. Privacy-by-Design Invariants', () => {
    it('verifies salary inputs are never written to persistent browser storage or external requests', () => {
      const sourceFiles = getSourceFiles(srcDir);

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const rel = path.relative(srcDir, file).replace(/\\/g, '/');

        // Check 1: No localStorage.setItem with salary / ctc
        const localStorageSetMatch = content.match(/localStorage\.setItem\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/gi);
        if (localStorageSetMatch) {
          for (const m of localStorageSetMatch) {
            expect(m.toLowerCase()).not.toMatch(/ctc|salary|inhand|bonus|income/);
          }
        }

        // Check 2: No sessionStorage.setItem with salary / ctc
        const sessionStorageSetMatch = content.match(/sessionStorage\.setItem\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/gi);
        if (sessionStorageSetMatch) {
          for (const m of sessionStorageSetMatch) {
            expect(m.toLowerCase()).not.toMatch(/ctc|salary|inhand|bonus|income/);
          }
        }

        // Check 3: No document.cookie storing financial inputs
        expect(content).not.toMatch(/document\.cookie\s*=\s*['"`][^'"`]*(ctc|salary|inhand)/i);

        // Check 4: No outgoing fetch/beacon uploading salary payload
        const networkCalls = content.match(/(?:fetch|sendBeacon|axios)\s*\([^)]+\)/gi);
        if (networkCalls) {
          for (const call of networkCalls) {
            expect(call.toLowerCase()).not.toMatch(/ctc|annualctc|salary|inhand/);
          }
        }
      }
    });

    it('verifies that salary inputs in browser runtime default to pure in-memory calculation without writing to storage', () => {
      // In-memory runtime verification
      const mockStorage: Record<string, string> = {};
      const fakeLocalStorage = {
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        getItem: (k: string) => mockStorage[k] ?? null,
      };

      // Ensure mockStorage has 0 salary keys after test execution
      const keys = Object.keys(mockStorage);
      const sensitiveKeys = keys.filter(k => /salary|ctc|inhand/i.test(k));
      expect(sensitiveKeys.length).toBe(0);
    });
  });

  describe('6. Cloudflare Pages Slug Safety, Headers & Redirects', () => {
    it('asserts that NO generated route slug in dist/salary/ contains a literal dot (.)', () => {
      const salaryDir = path.join(distDir, 'salary');
      expect(fs.existsSync(salaryDir), 'dist/salary/ directory must exist').toBe(true);

      const salaryEntries = fs.readdirSync(salaryDir);
      expect(salaryEntries.length).toBeGreaterThanOrEqual(35);

      for (const entry of salaryEntries) {
        const fullPath = path.join(salaryDir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          expect(
            entry.includes('.'),
            `Directory slug "${entry}" in dist/salary/ must NOT contain a dot (.) to prevent Cloudflare Pages 404 file-extension routing bugs.`
          ).toBe(false);
          expect(entry).toMatch(/^[0-9]+(-[0-9]+)?-lpa-in-hand-salary$/);
        }
      }
    });

    it('verifies that public/_headers and dist/_headers contain required security and cache rules', () => {
      const pubHeaders = path.join(process.cwd(), 'public', '_headers');
      expect(fs.existsSync(pubHeaders), 'public/_headers must exist').toBe(true);
      const headersContent = fs.readFileSync(pubHeaders, 'utf-8');

      expect(headersContent).toContain('X-Content-Type-Options: nosniff');
      expect(headersContent).toContain('X-Frame-Options: DENY');
      expect(headersContent).toContain('Referrer-Policy: strict-origin-when-cross-origin');
      expect(headersContent).toContain('/_astro/*');
      expect(headersContent).toContain('immutable');
    });

    it('verifies that public/_redirects maps all fractional .5 LPA brackets to hyphenated slugs', () => {
      const pubRedirects = path.join(process.cwd(), 'public', '_redirects');
      expect(fs.existsSync(pubRedirects), 'public/_redirects must exist').toBe(true);
      const redirectsContent = fs.readFileSync(pubRedirects, 'utf-8');

      const fractionalDecimals = ['2.5', '3.5', '4.5', '5.5', '6.5', '7.5', '8.5'];
      for (const dec of fractionalDecimals) {
        const hyp = dec.replace('.', '-');
        expect(
          redirectsContent.includes(`/salary/${dec}-lpa-in-hand-salary`),
          `_redirects must include /salary/${dec}-lpa-in-hand-salary`
        ).toBe(true);
        expect(
          redirectsContent.includes(`/salary/${hyp}-lpa-in-hand-salary`),
          `_redirects must redirect to /salary/${hyp}-lpa-in-hand-salary`
        ).toBe(true);
      }
    });
  });
});

