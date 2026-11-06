// Opens the built site (`npm run preview` on :4321) in headless Chromium and
// checks every page at phone and desktop width: no console errors, no failed
// requests, no sideways scroll, layout shift (CLS) within budget, a title and
// description, no broken images, no broken internal links. Saves a
// screenshot per page and width. Used by the verify skill
// (.claude/skills/verify).
//
//   node tools/verify.mjs [--phone | --desktop] [path ...]
//
// No paths: every page in dist/sitemap-0.xml. Exit code 1 when a check fails.
// Other scripts can import `openSite` and `checkPage` to drive a change
// (click, type) before checking.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium, devices } from 'playwright';

// Re-exported so a throwaway script outside the repo needs only this import.
export { chromium };

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'http://localhost:4321';
export const OUT = join(root, 'test-results', 'verify');
/** Core Web Vitals "good" threshold. */
export const CLS_BUDGET = 0.1;

export const VIEWPORTS = {
  phone: { ...devices['iPhone 13 Mini'] },
  desktop: { viewport: { width: 1280, height: 800 } },
};

/** Every page the sitemap lists, as local paths. */
export function allPages() {
  const sitemap = join(root, 'dist', 'sitemap-0.xml');
  if (!existsSync(sitemap)) throw new Error('No dist/sitemap-0.xml: run npm run build first');
  const xml = readFileSync(sitemap, 'utf8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

/**
 * A fresh browser context (empty cache, like a first visit from a search
 * result) that records console errors and failed requests. Failures on our
 * own origin are faults; failures on outside services (weather, map tiles)
 * are only warnings, because they're down sometimes and that's not our bug.
 */
export async function openSite(browser, width = 'phone') {
  const context = await browser.newContext({ ...VIEWPORTS[width], locale: 'nl-BE', timezoneId: 'Europe/Brussels' });
  // Sum layout shifts not caused by input, from the very first paint.
  await context.addInitScript(() => {
    window.__cls = 0;
    window.__shifts = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        for (const s of e.sources ?? []) {
          const n = s.node;
          const what = n?.nodeType === 1 ? `${n.tagName.toLowerCase()}${n.id ? '#' + n.id : ''}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''}` : n?.nodeName ?? '?';
          window.__shifts.push(`${e.value.toFixed(3)} ${what}`);
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const page = await context.newPage();
  const problems = { console: [], requests: [], external: [] };
  const own = (url) => url.startsWith(BASE);
  page.on('console', (m) => { if (m.type() === 'error') problems.console.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.console.push(`uncaught: ${e.message}`));
  page.on('requestfailed', (r) => {
    const err = r.failure()?.errorText;
    if (err === 'net::ERR_ABORTED') return; // navigating away, not a fault
    (own(r.url()) ? problems.requests : problems.external).push(`${r.method()} ${r.url()}: ${err}`);
  });
  page.on('response', (r) => {
    if (r.status() < 400) return;
    (own(r.url()) ? problems.requests : problems.external).push(`${r.request().method()} ${r.url()}: ${r.status()}`);
  });
  return { context, page, problems };
}

async function settle(page) {
  // The tailwind map keeps fetching tiles; don't wait forever for quiet.
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/**
 * Measures the page as it is now (after `goto`, or after your own clicks)
 * and saves a screenshot. Returns the failures, warnings and the internal
 * links it found, so the caller can check those once for the whole site.
 */
export async function checkPage(page, path, { width = 'phone', name } = {}) {
  const failures = [];
  const warnings = [];
  await settle(page);
  const m = await page.evaluate(() => {
    const el = document.documentElement;
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';
    return {
      cls: window.__cls ?? 0,
      shifts: window.__shifts ?? [],
      overflowPx: el.scrollWidth - el.clientWidth,
      wide: [...document.querySelectorAll('body *')]
        .filter((n) => {
          // The innermost elements that stick out, skipping anything pinned to
          // the screen (a fixed tab bar stretches with an overflowing page).
          const W = document.documentElement.clientWidth + 1;
          if (n.getBoundingClientRect().right <= W) return false;
          for (let p = n; p; p = p.parentElement) if (getComputedStyle(p).position === 'fixed') return false;
          return ![...n.children].some((c) => c.getBoundingClientRect().right > W);
        })
        .slice(0, 3)
        .map((n) => n.tagName.toLowerCase() + (typeof n.className === 'string' && n.className.trim() ? '.' + n.className.trim().split(/\s+/)[0] : '') + (n.textContent?.trim() ? ` "${n.textContent.trim().slice(0, 30)}"` : '')),
      title: document.title.trim(),
      description: desc.trim(),
      h1: document.querySelectorAll('h1').length,
      noAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src),
      brokenImg: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src).map((i) => i.src),
      links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
    };
  });
  if (m.cls > CLS_BUDGET) failures.push(`layout shift ${m.cls.toFixed(3)} > ${CLS_BUDGET}: ${m.shifts.slice(0, 4).join(', ')}`);
  if (m.overflowPx > 0) failures.push(`page scrolls sideways by ${m.overflowPx}px (${m.wide.join(', ')})`);
  if (!m.title) failures.push('no <title>');
  if (!m.description) failures.push('no meta description');
  if (m.h1 !== 1) warnings.push(`${m.h1} <h1> elements (expected 1)`);
  for (const src of m.noAlt) failures.push(`image without alt: ${src}`);
  for (const src of m.brokenImg) failures.push(`image doesn't load: ${src}`);
  mkdirSync(OUT, { recursive: true });
  const slug = (name ?? (path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replaceAll('/', '-'))) + `-${width}`;
  const screenshot = join(OUT, `${slug}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });
  const links = [...new Set(m.links.filter((h) => h.startsWith(BASE)).map((h) => h.split('#')[0]))];
  return { path, width, screenshot, cls: m.cls, overflowPx: m.overflowPx, failures, warnings, links };
}

/** Every internal link must answer below 400. One request per unique URL. */
async function checkLinks(request, linksByPage) {
  const seen = new Map();
  const broken = [];
  for (const [from, links] of linksByPage) {
    for (const url of links) {
      if (!seen.has(url)) {
        const r = await request.get(url, { maxRedirects: 5 }).catch((e) => ({ status: () => e.message }));
        seen.set(url, r.status());
      }
      const status = seen.get(url);
      if (typeof status !== 'number' || status >= 400) broken.push(`${from} links to ${url.slice(BASE.length)}: ${status}`);
    }
  }
  return { checked: seen.size, broken };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { phone: { type: 'boolean', default: false }, desktop: { type: 'boolean', default: false } },
  });
  const widths = values.phone && !values.desktop ? ['phone'] : values.desktop && !values.phone ? ['desktop'] : ['phone', 'desktop'];
  const paths = positionals.length ? positionals : allPages();
  const up = await fetch(BASE).then(() => true, () => false);
  if (!up) {
    console.error(`Nothing on ${BASE}: npm run build && npm run preview`);
    process.exit(2);
  }

  const browser = await chromium.launch();
  const results = [];
  const linksByPage = new Map();
  try {
    for (const path of paths) {
      for (const width of widths) {
        // A fresh context per page: empty cache, so the CLS is a first visit's.
        const { context, page, problems } = await openSite(browser, width);
        const response = await page.goto(BASE + path, { waitUntil: 'load' });
        const result = await checkPage(page, path, { width });
        if (!response || response.status() >= 400) result.failures.unshift(`page answers ${response?.status()}`);
        result.failures.push(...problems.console, ...problems.requests);
        result.warnings.push(...problems.external.map((e) => `outside service: ${e}`));
        linksByPage.set(path, result.links);
        delete result.links;
        results.push(result);
        await context.close();
        const flag = result.failures.length ? 'FAIL' : result.warnings.length ? 'warn' : 'ok  ';
        console.log(`${flag} ${path} [${width}]  cls ${result.cls.toFixed(3)}  ${result.screenshot.slice(root.length + 1)}`);
        for (const f of result.failures) console.log(`       ${f}`);
        for (const w of result.warnings) console.log(`       (warning) ${w}`);
      }
    }
    const ctx = await browser.newContext();
    const links = await checkLinks(ctx.request, linksByPage);
    console.log(`\nInternal links: ${links.checked} checked, ${links.broken.length} broken`);
    for (const b of links.broken) console.log(`       ${b}`);
    results.push({ path: '(links)', failures: links.broken, warnings: [] });
  } finally {
    await browser.close();
  }
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => r.failures.length);
  console.log(failed.length ? `\n${failed.length} of ${results.length} checks failed.` : `\nAll ${results.length} checks passed.`);
  process.exit(failed.length ? 1 : 0);
}
