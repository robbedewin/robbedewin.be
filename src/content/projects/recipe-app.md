---
title: "Recepten — an offline-first recipe app for a few households"
summary: "A shared recipe library with per-household collections, a week menu that merges into one grocery list, and an installable app that works without signal in the kitchen."
description: "A private, installable recipe web app for a few households: Astro on Cloudflare Pages, a D1 database, Pages Functions for login, and a service worker for offline use."
tags: ["Astro", "Cloudflare", "SQLite (D1)", "Offline-first"]
kicker: "personal · private"
featured: true
order: 6
period: "2026 · Personal project · in use by a few households"
---

The recipes we actually cook lived in screenshots, notes apps and memory. I
wanted one place that works the way cooking does: on a phone propped against
the backsplash, with flour on your hands and no signal in the kitchen.

The live app is private, because it holds a few households' own recipes and
shopping habits. This page describes how it is built.

## What it does

- **A shared library, a personal collection.** Recipes live once in a shared
  library. Each household keeps its own collection, can add a library recipe
  to it, change its own copy, or add new recipes from the site.
- **From week menu to one list.** A household plans its week on any of its
  phones, and the week's ingredients merge into a single grocery list, sorted
  by store section and ready to paste into a checklist.
- **Built for the kitchen.** A servings scaler, the screen stays on while
  cooking, and steps tick off with a tap.
- **Every recipe as a book.** One page renders the whole collection as a
  printable book or PDF.

## How it is built

The site is **Astro** with plain CSS and vanilla JavaScript, deployed to
**Cloudflare Pages**. Recipes are not pages: they live in a **D1** (SQLite)
database and every recipe URL is one template that draws its recipe in the
browser, so adding a recipe never needs a deploy. The schema grew through
twelve small migrations, from the week plan to households, the shared
library, photos and store layouts.

**Offline first.** A service worker, generated at build time from a template,
precaches every page, stylesheet, script and icon; recipe photos are cached
the first time they are viewed. The household's collection is mirrored in
local storage, so every recipe in it opens without a connection. The app
installs on the iPhone home screen and behaves like a native one.

**Login without a framework.** Cloudflare Pages Functions guard every request
with a signed session cookie. Users belong to households, and a user in no
household cannot log in: the check fails closed. Security headers, including
a strict Content Security Policy that allows scripts and styles only from the
site's own origin, are set in code and covered by tests.

**Tested where it matters.** Unit tests (Vitest) cover the parts that would
silently give wrong answers: servings scaling, search, the login and the
grocery-list order. A Playwright smoke test runs the built site end to end.

<div class="note">

The app is private and has no public demo. I am happy to walk through it,
with sample data, in a conversation.

</div>

## What it taught me

Most of the work was not the recipes but the edges: what happens offline, who
may see which household's data, and how a list stays in sync across two
phones. Small product, real users, and every shortcut shows up at dinner time.
