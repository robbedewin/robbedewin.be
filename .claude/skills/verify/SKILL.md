---
name: verify
description: Build robbedewin.be, serve it locally and check every page in a real browser at phone and desktop width - console errors, failed requests, sideways scroll, layout shift, titles and descriptions, broken images and links - with screenshots. Use after any change to src/, public/ or astro.config.mjs, before saying it works, and before anything is pushed to main (a push deploys).
---

# Verify a change on robbedewin.be

`npm test` and `npm run check` prove the code is consistent; this proves the
pages do what was meant. Run it yourself after a change. When a check fails,
fix it and run it again. Don't hand the clicking back to Robbe.

## 1. Build and serve

```bash
npm run build
lsof -ti:4321 -sTCP:LISTEN | xargs -r kill        # an old preview
(npm run preview > test-results/preview.log 2>&1 &)
timeout 60 bash -c 'until curl -sf -o /dev/null http://localhost:4321/; do sleep 1; done'
```

The preview serves `dist/`, so **rebuild after every change**. Stop it at the
end with the same `lsof ... | xargs -r kill`. Never check against the live
site to prove a change: it shows what was deployed, not what you changed.

## 2. Check the pages

```bash
npm run verify -- /projects/recipe-app/ /     # the pages the change touches
npm run verify                                 # every page in the sitemap (before a push)
npm run verify -- --phone /tools/tailwind/     # one width only
```

`tools/verify.mjs` opens each page in headless Chromium, once as an iPhone 13
mini and once at 1280×800, each time in a fresh browser (empty cache, like a
first visit from a search result):

| Check | Passes when |
|---|---|
| Page | answers below 400 |
| Console | no `console.error`, no uncaught exception |
| Requests | nothing on our own origin fails or answers 4xx/5xx |
| Outside services | Open-Meteo, map tiles etc. failing is only a **warning** |
| Phone width | `scrollWidth - clientWidth` is 0: no sideways scroll |
| Layout shift | CLS ≤ 0.1 (Core Web Vitals "good") |
| Head | a `<title>` and a meta description |
| Images | every `<img>` has `alt` and loads |
| Links | every internal link (pages, PDFs, reports) answers below 400 |
| One `<h1>` | only a **warning** |

Exit code 0 = every check passed. Screenshots and `report.json` go to
`test-results/verify/` (gitignored), named `<page>-phone.png` and
`<page>-desktop.png`. **Open the screenshots of the pages you changed and
look at them**: a page can pass every number and still show the wrong thing.

The sitemap lists the Astro pages only. The big standalone reports in
`public/reports/` and `public/research/` aren't opened (the link check does
reach them); pass their path explicitly when you change one.

## 3. Drive the change itself

When the change is an interaction (the tools: tailwind finder, withdrawal
calculator, history chart), looking at the page isn't enough. Write a short
script in the scratchpad that imports from this repo's `tools/verify.mjs` by
its absolute path (it re-exports `chromium`, so that's the only import), does
what a visitor would do, and checks the result:

```js
import { chromium, openSite, checkPage, BASE } from '<repo>/tools/verify.mjs';
const browser = await chromium.launch();
const { page, problems } = await openSite(browser, 'phone');
await page.goto(BASE + '/tools/withdrawal/');
const before = await page.locator('#success').textContent();
await page.getByLabel("Withdrawal per year, in today's money").fill('40000');
await page.waitForFunction((b) => document.querySelector('#success').textContent !== b, before);
console.log(before, '->', await page.locator('#success').textContent());
const result = await checkPage(page, '/tools/withdrawal/', { name: 'withdrawal-40k' });
console.log(result.failures, problems);
await browser.close();
```

Run it with `node <file>.mjs`. Find elements by their visible text, label or
role. What proves an interaction worked: the screenshot after the action
shows the new state, and `problems.console` and `problems.requests` are empty.

## 4. When a check fails

- **Layout shift:** the failure lists what moved (`0.164 #text`, `nav.site-nav`).
  `#text` on every line usually means a font swap: test by blocking fonts with
  `page.route(/\.woff2?$/, r => r.abort())`; if CLS drops to 0, it's the fonts.
  The three fonts on every page are preloaded in `src/layouts/Base.astro`; a
  new weight used above the fold needs adding there too. Otherwise reserve
  space for whatever loads late (set `width`/`height` on images, a min-height
  on a chart box).
- **Sideways scroll:** the failure names the first elements wider than the
  viewport. Usually a long word, a table or a `pre` without `overflow-x: auto`.
- **Broken link:** a page or file was renamed; fix the link or the slug.
- **Console or request error:** read the message, fix, rebuild, run again.

## 5. Lighthouse and performance trace (Chrome DevTools MCP)

When the `chrome-devtools` MCP tools are loaded and can open a page (they
need Google Chrome installed inside WSL), use them on top of step 2 for:

- a change to layout, colours or the head: `lighthouse_audit` (device
  `mobile`) on the changed pages. Budgets: accessibility, best practices and
  SEO each **≥ 95**. Fix failing audits it lists; colour contrast is the
  usual one on this dark theme.
- a CLS failure whose cause isn't clear, or a page that feels slow:
  `performance_start_trace` with `reload: true` on the page, then
  `performance_analyze_insight` for `CLSCulprits` or `LCPBreakdown`.
  Budgets: LCP ≤ 2.5 s, CLS ≤ 0.1.

Known and accepted: on `/tools/tailwind/` Lighthouse fails
`image-size-responsive` for the OpenStreetMap tiles (best practices 96).
That's the map's tiles, not ours.

A single trace in WSL can come out much slower than the page is (one run
said LCP 4.4 s where Playwright measured 0.1-0.5 s): repeat it before
acting on an LCP number.

If the MCP can't launch a browser, say so and rely on step 2. Don't skip
step 2 because the MCP worked.

## Report back

Say which pages and interactions you checked, pass/fail per check with the
CLS numbers, any warnings, and attach or name the screenshots of what
changed. Mention Lighthouse scores when you ran it.
