---
title: "An evidence-graded cycling coach on intervals.icu"
summary: "A deterministic planner that writes structured workouts to a live training calendar, adapts them every morning, and backs every rule with a graded, cited study."
description: "A private adaptive cycling coach in Python: rules graded A/B/C against PubMed sources, a planner and daily reconcile job on GitHub Actions, writing to the intervals.icu calendar, with a private Astro dashboard on Cloudflare."
tags: ["Python", "Evidence grading", "GitHub Actions", "API integration"]
kicker: "personal · private"
featured: true
order: 1
period: "2026 · Personal project · runs daily"
---

Training plans are usually either a static PDF or a black box. I wanted a
coach that plans the season from my availability and goals, adapts when life
gets in the way, and can tell me *why* each session is there, down to the
study behind the rule.

The coach and its dashboard are private, because they run on my own training
data. This page describes how they are built.

## Rules first, AI second

The planner is deterministic **Python** (standard library plus two small
calendar packages). It decides volume, structure and progression from two
plain-text files: an athlete profile (availability per weekday, weekly hours,
events ranked A/B/C) and a rule book.

The rule book holds 35 rules, from intensity distribution to taper length.
**Every rule cites its evidence**, verified on PubMed by PMID and DOI, and is
graded by strength: 4 rules rest on grade A evidence, 12 on B and 19 on C. A
language model helps with the fuzzy parts, such as talking through a change
or reviewing new papers, but code enforces the limits afterwards. A rule only
changes through a documented research step.

## The calendar is the live plan

Workouts are written to the **intervals.icu** calendar through its API, as
structured sessions a bike computer can follow. Everything the coach writes
carries its own identifier and tag, and the sync only ever creates, updates
or deletes those, so workouts I add myself are never touched. Re-pushing a
date range is safe because updates are matched on that identifier.

Every morning a **GitHub Actions** job compares what was planned with what was
ridden, makes small adaptations, and explains each one in a note on the
calendar. A live end-to-end test runs against the real API in a sandbox
fortnight years ahead and deletes what it creates, which proves the service
parses every workout type.

## Review before it goes live

A review command plans a season without writing anything and renders it as
one HTML page: a season chart with phases, events and projected fitness for
several variants side by side, and every session with its shape in power
zones. A small **Astro** dashboard on Cloudflare, behind single sign-on, shows
the current plan from a nightly snapshot.

<div class="note">

The coach is private and has no public demo. I am happy to walk through a
sample season in a conversation.

</div>

## Built on what exists

I started from open-source work rather than from scratch:
[ai-cycling-coach](https://github.com/Casuyan/ai-cycling-coach) for the API
wrapper and the research-review workflow,
[domestique](https://github.com/platypus45/domestique) for the starting
literature list (every source re-checked),
[intervals-icu-mcp](https://github.com/hhopke/intervals-icu-mcp) for
interactive use, and
[aerobic-engine](https://github.com/AnkitGodle/aerobic-engine) for the idea
that code enforces the limits after any model suggestion.

## What it taught me

Grading evidence for my own hobby made me much stricter about what a rule is
allowed to claim. And a system that writes to a calendar someone relies on
needs the same care as any production data pipeline: idempotent writes, a
dry run by default, and a test against the real thing.
