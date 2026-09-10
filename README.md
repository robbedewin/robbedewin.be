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

This repo is public. Rendered reports and exports come from private sources,
so check what you are committing:

```bash
npm run build
grep -rniE 'hanne|jakob|mich|moeke|sarah|medirect|degiro|api_key|/home/robbe' dist/ \
  --include='*.html' | grep -v -e '^dist/research/' -e '^dist/reports/'
grep -rnoE '€ ?[0-9]{3,}' dist/ --include='*.html' | grep -v -e research/ -e voorbeeld
```

Both should come back empty. The only euro amounts on the site belong to the
synthetic sample household in `public/reports/voorbeeld-plan.html`.
