import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function readSiteUrl(brandConfigText) {
  const envUrl = String(process.env.VITE_SITE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const match = brandConfigText.match(/siteUrl\s*:\s*['"`]([^'"`]+)['"`]/);
  return (match?.[1] || 'https://avenue-properties.pages.dev').trim().replace(/\/+$/, '');
}

function readTierVisibility() {
  const tier = String(process.env.VITE_TIER || '').trim().toLowerCase();
  if (tier === 'plot') {
    return { showProjectsPage: true, showBuyPage: false, showRentPage: false };
  }
  return { showProjectsPage: true, showBuyPage: true, showRentPage: true };
}

function extractArrayBlock(text, exportName) {
  const marker = `export const ${exportName}`;
  const start = text.indexOf(marker);
  if (start === -1) return '';
  const tail = text.slice(start + marker.length);
  const nextExport = tail.indexOf('\nexport ');
  return nextExport === -1 ? tail : tail.slice(0, nextExport);
}

function extractIds(block) {
  const ids = [];
  const seen = new Set();
  const regex = /\bid\s*:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = regex.exec(block)) !== null) {
    const id = m[1].trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function main() {
  const brandConfigPath = path.join(ROOT_DIR, 'src/config/brand.config.ts');
  const brandConfigText = stripComments(fs.readFileSync(brandConfigPath, 'utf8'));
  const siteUrl = readSiteUrl(brandConfigText);
  const visibility = readTierVisibility();

  const realEstateText = stripComments(
    fs.readFileSync(path.join(ROOT_DIR, 'src/data/realEstateData.ts'), 'utf8')
  );
  const buyText = stripComments(
    fs.readFileSync(path.join(ROOT_DIR, 'src/data/buyPropertiesData.ts'), 'utf8')
  );
  const rentText = stripComments(
    fs.readFileSync(path.join(ROOT_DIR, 'src/data/rentalsData.ts'), 'utf8')
  );

  const projectIds = [
    ...extractIds(extractArrayBlock(realEstateText, 'PORTFOLIO_PROJECTS')),
    ...extractIds(extractArrayBlock(realEstateText, 'PROPERTY_LISTINGS')),
  ];
  const buyIds = extractIds(extractArrayBlock(buyText, 'BUY_PROPERTIES'));
  const rentIds = extractIds(extractArrayBlock(rentText, 'RENTAL_LISTINGS'));

  const today = new Date().toISOString().slice(0, 10);

  const entries = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/about', priority: '0.7', changefreq: 'monthly' },
    { path: '/services', priority: '0.7', changefreq: 'monthly' },
    { path: '/contact', priority: '0.8', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  ];

  if (visibility.showProjectsPage) {
    entries.push({ path: '/projects', priority: '0.9', changefreq: 'weekly' });
    for (const id of new Set(projectIds)) {
      entries.push({ path: `/projects/${encodeURIComponent(id)}`, priority: '0.8', changefreq: 'weekly' });
    }
  }

  if (visibility.showBuyPage) {
    entries.push({ path: '/buy', priority: '0.9', changefreq: 'daily' });
    for (const id of new Set(buyIds)) {
      entries.push({ path: `/buy/${encodeURIComponent(id)}`, priority: '0.8', changefreq: 'weekly' });
    }
  }

  if (visibility.showRentPage) {
    entries.push({ path: '/rent', priority: '0.9', changefreq: 'daily' });
    for (const id of new Set(rentIds)) {
      entries.push({ path: `/rent/${encodeURIComponent(id)}`, priority: '0.8', changefreq: 'weekly' });
    }
  }

  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(
      (entry) =>
        `  <url>\n    <loc>${escapeXml(`${siteUrl}${entry.path}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    ),
    '</urlset>',
    '',
  ];

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /manage',
    'Disallow: /records',
    'Disallow: /profile',
    'Disallow: /login',
    'Disallow: /signup',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');

  fs.mkdirSync(path.join(ROOT_DIR, 'public'), { recursive: true });
  fs.writeFileSync(path.join(ROOT_DIR, 'public/sitemap.xml'), xmlLines.join('\n'), 'utf8');
  fs.writeFileSync(path.join(ROOT_DIR, 'public/robots.txt'), robotsTxt, 'utf8');

  console.log(
    `Generated public/sitemap.xml (${entries.length} URLs) and public/robots.txt for ${siteUrl}`
  );
}

main();
