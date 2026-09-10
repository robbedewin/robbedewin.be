# robbedewin.be

Personal website — about, projects, CV. Static, no client-side JavaScript.

Built with [Astro](https://astro.build). Deployed to Cloudflare Pages.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview
```

## Layout

```
src/content/projects/   one Markdown file per project (schema in src/content.config.ts)
src/pages/              routes
src/layouts/Base.astro  <head>, nav, footer
src/styles/global.css   design tokens and all styling
public/                 static assets served as-is
```

## Adding a project

Drop a Markdown file in `src/content/projects/`. Required frontmatter:
`title`, `summary`, `description`, `order`. Optional: `tags`, `featured`
(shows on the homepage), `period`, `repo`, `repoLabel`, `lang`.

The build fails on invalid frontmatter, so schema mistakes surface locally.

## Before pushing anything into `public/`

This repo is public and its content is derived by hand from private sources
(household finances, third-party personal data, a live intervals.icu key). A
push to a public repo cannot be taken back, so the guard blocks the **commit**,
not the deploy.

### Install the leak guard (one step, after cloning)

```bash
npm run hooks:install       # or, without npm:
git config core.hooksPath scripts
```

`npm install` also runs it automatically via the `prepare` script.

The hook is `scripts/pre-commit`, versioned with the repo. Because
`core.hooksPath` points at `scripts/`, **git treats every file in that
directory as a hook** — do not put a helper script there under a git-hook name;
helpers belong in a subdirectory.

### What it blocks

It reads *staged* content (`git show :file`), never the working tree, and only
files that are actually staged. It refuses the commit on:

- third-party first names as whole words — `hanne`, `jakob`, `moeke`,  <!-- leak-guard:allow -->
  `testklant`, `sarah`, `mich`, `thomas`  <!-- leak-guard:allow -->
- broker / account identifiers — `medirect`, `degiro`, `21320331`  <!-- leak-guard:allow -->
- `INTERVALS_API_KEY`, and any `api_key` / `secret` / `token` / `password`  <!-- leak-guard:allow -->
  assigned a value of 16+ characters that contains a digit
- absolute local paths — `/home/robbe`, `/mnt/c/Users`  <!-- leak-guard:allow -->
- filenames that should never be added at all — `*.env`, `secrets*`,
  `rides.csv`, `*.sqlite`, `*.pem`, `*.key`, and anything under a `clients/`
  path other than `clients/voorbeeld/`
- euro amounts (`€ 2.400`, `1.234,56 €`, `EUR 5000`) **outside** the allowlist  <!-- leak-guard:allow -->

The allowlist — already committed, and legitimately full of euro amounts and
public broker product names (Bolero Invest & Repeat, Saxo AutoInvest, Trade
Republic Sparplan):

- `public/reports/voorbeeld-plan.html` — the synthetic "Jan & An Voorbeeld"
  household
- `public/research/*.html` — four public-data research reports

Allowlisting lifts the euro rule **only**. Names, brokers, credentials and
local paths stay fatal inside those files, so a report regenerated from a real
household is still caught.

### Word boundaries are load-bearing

Those reports are 8–12 MB single-line HTML with embedded minified JS and base64
blobs. A naive case-insensitive substring scan false-positives: `hanne` matches  <!-- leak-guard:allow -->
inside "cha**nne**l", `secret` inside FontAwesome's `fa-user-secret`, and
`apikey` inside `dataApiKeydownHandler`. So every name pattern uses `\b`
boundaries, and the credential rule needs an assignment whose value is long
*and* contains a digit. All of them were checked against the five committed
reports and produce zero hits. Re-check empirically before relaxing anything.

### Getting past a false positive

A line that is genuinely fine can carry a `leak-guard:allow` marker anywhere on
it (`<!-- leak-guard:allow -->` in Markdown or HTML, `# leak-guard:allow` in a
script) and that line is skipped. This README and `scripts/pre-commit` both use
it, since they necessarily spell the patterns out. The marker is deliberately
greppable — `grep -rn leak-guard:allow .` lists every exemption in the repo.

`git commit --no-verify` skips the hook entirely. That is the last resort and a
deliberate decision, made after reading every hit — not a reflex.

### Cost and known gaps

There is **no size threshold**: every staged file is scanned in full, because
"skip the big files" would be exactly the hole this guard exists to close. A
normal commit takes ~0.02 s, re-committing one 9 MB report ~0.2 s, and all five
at once ~0.8 s — nearly all of it git decompressing the blobs.

Deliberately *not* covered:

- **Binary files.** The CV PDF is scanned with `grep -a`, which only sees
  uncompressed strings. Treat that as shallow coverage, not a guarantee.
- **High-entropy strings on their own.** A bare random-looking token with no
  `key`/`secret`/`token` label nearby is not flagged; in minified JS and base64
  that fires constantly and the guard would be ignored within a week.
- **`voorbeeld`, `bolero`, `saxo`, `trade republic`.** Public product names and
  the synthetic household — blocking them would break the legitimate reports.

And one accepted false positive: a legitimate citation of an author whose  <!-- leak-guard:allow -->
first name is on the list above will be blocked. That is the safe direction;
use the marker.

When it fires it prints the file, the line and byte offset, the matched text
and a one-line reason.

### Manual sweep of the build output

The hook covers the repo. To check the rendered site as well:

```bash
npm run build
grep -rniE '\b(hanne|jakob|mich|moeke|sarah|medirect|degiro)\b|api_key|/home/robbe' dist/ --include='*.html' | grep -v -e '^dist/research/' -e '^dist/reports/'  # leak-guard:allow
grep -rnoE '€ ?[0-9]{3,}' dist/ --include='*.html' | grep -v -e research/ -e voorbeeld
```

Both should come back empty.
