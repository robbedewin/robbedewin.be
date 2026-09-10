---
title: "BikeVault — a local-first garage inventory"
summary: "Plain Markdown and YAML as the data model, stdlib Python as the toolchain, and ride data from an API turning into per-component wear."
description: "A local-first bike garage and maintenance tracker built on Markdown files with YAML frontmatter, exporting to CSV and SQLite, with automatic per-component mileage from intervals.icu."
tags: ["Python", "Data modelling", "SQLite", "Obsidian"]
order: 5
period: "Personal project"
---

Bike maintenance is a small data problem that is genuinely annoying to do in
your head. Chains wear out on mileage, not on time. Tyres, cassettes and rotors
each have their own threshold. Consumables run out. And the mileage that drives
all of it lives in a training log, not in a spreadsheet.

BikeVault is the smallest thing that closes that loop. It is deliberately
local-first: **plain Markdown with YAML frontmatter** as the data model, no
database engine, no proprietary format, no server. The notes are readable and
editable with any text editor, and they diff cleanly in Git.

## The data model

Every note carries a `type:` and a fixed set of properties. The distinction that
made the schema work is between things that are fungible and things that are
not:

- **Consumables** deplete — sealant, wax, degreaser. They have `stock` and
  `reorder_at`, and that is all you need.
- **Components** are individual physical objects. Two identical chains are
  `Chain A` and `Chain B`, each its own note, each with `fitted_date`,
  `retired_date`, `service_at` and a computed `km`. Which physical one it is
  matters, because that is what wears out.
- **Gear** goes on the bike; **Tools** stay in the workshop. Ownership is a
  `status:` property (`owned` / `ordered` / `wishlist`), not a folder, so one
  view can show what you have and what you want side by side.

Unknown values stay blank rather than guessed. That keeps the export clean.

## The toolchain

Three scripts, **stdlib only** except matplotlib:

- `export.py` — flattens every note to one CSV per type plus a SQLite database,
  with a `--lint` mode that catches broken links between notes
- `sync_mileage.py` — pulls rides from the [intervals.icu](https://intervals.icu)
  API, attributes each ride to a bike via an editable rules file, and sums
  distance over each component's fitted window to compute its `km`. Because it
  recomputes from the ride cache rather than incrementing a counter, you can
  back-date a `fitted_date` and the mileage is simply correct afterwards.
- `charts.py` — spend by area, spend over time, cost per kilometre per bike

`refresh.py` runs the lot in one command.

## Why the derived values are derived

The one design rule I would keep in any version of this: a field the tooling
computes is never a field a human edits. `km` is computed from the ride history
every run. If it were hand-maintained it would be wrong within a month, and
worse, it would be *confidently* wrong — there would be no way to tell a stale
number from a fresh one. Everything the scripts write can be deleted and
regenerated from the notes plus the ride cache.

A companion `AI_INVENTORY_PROMPT.md` carries the full schema in a form you can
paste into a language model, so adding a new item is a sentence of description
rather than remembering fifteen property names. That turned out to be the thing
that kept the vault actually up to date.

<div class="note">

The vault itself stays private — it holds purchase prices, serial numbers and
other people's sizes. This page describes the system, not the contents.

</div>
