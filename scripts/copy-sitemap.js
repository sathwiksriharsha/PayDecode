import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const sitemapIndex = path.join(distDir, 'sitemap-index.xml');
const sitemapZero = path.join(distDir, 'sitemap-0.xml');
const sitemapTarget = path.join(distDir, 'sitemap.xml');

// Provide sitemap.xml as a direct identical file alongside sitemap-index.xml and sitemap-0.xml
if (fs.existsSync(sitemapIndex)) {
  fs.copyFileSync(sitemapIndex, sitemapTarget);
  console.log('✓ Created dist/sitemap.xml (alias of sitemap-index.xml)');
} else if (fs.existsSync(sitemapZero)) {
  fs.copyFileSync(sitemapZero, sitemapTarget);
  console.log('✓ Created dist/sitemap.xml (alias of sitemap-0.xml)');
}
