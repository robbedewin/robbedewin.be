---
title: "Allele-specific expression in induction-failure T-ALL"
summary: "WGS and RNA-seq pipelines rebuilt on the telomere-to-telomere reference, with a beta-binomial test for allelic imbalance."
description: "MSc Biomedical Sciences thesis: Snakemake WGS/RNA-seq pipelines on T2T-CHM13 profiling induction-failure T-cell acute lymphoblastic leukemia, including a custom beta-binomial allele-specific expression framework."
tags: ["Snakemake", "WGS / RNA-seq", "Variant calling", "MSc thesis"]
order: 2
featured: true
period: "2023 – 2024 · MSc Biomedical Sciences thesis, KU Leuven"
repo: "https://github.com/robbedewin/thesis_code"
repoLabel: "github.com/robbedewin/thesis_code"
---

Patients with **T-cell acute lymphoblastic leukemia (T-ALL)** who fail to reach
remission on first-line therapy — the *induction failure* subgroup — are the
hardest cases and the least characterised. This thesis profiled patient samples
from that subgroup with paired whole-genome and RNA sequencing.

Both pipelines were rebuilt against the newly completed **telomere-to-telomere
(T2T-CHM13)** reference rather than GRCh38, to reduce the alignment artifacts
that fragmented assemblies introduce in exactly the repetitive regions where
structural variants tend to sit.

## Pipelines

- **Workflow** — Snakemake, so the DNA and RNA arms stay reproducible and
  restartable across samples
- **Alignment** — T2T-CHM13 reference genome
- **Somatic variants** — Mutect2
- **Structural variants** — GRIDSS
- **Copy number** — ASCAT
- **Allele-specific expression** — a custom beta-binomial framework integrating
  DNA-derived allele counts with RNA read counts, modelling overdispersion so
  that loci with genuine allelic imbalance separate from counting noise

The ASE component is the part that had to be built rather than configured.
Testing whether one allele is preferentially expressed means comparing an RNA
read ratio against a DNA-derived expectation, and the variance of that ratio is
much wider than a binomial assumes. A beta-binomial model absorbs the
overdispersion; without it, the test calls imbalance everywhere.

## Findings

Recurrent point mutations and copy-number losses appeared at the established
T-ALL drivers *NOTCH1* and *CDKN2A/B* — the expected result, and a useful check
that the T2T-based pipelines were behaving.

*FAT1* showed robust allele-specific expression, suggesting a possible
cis-regulatory disruption. Stated as what it is: a candidate for further
validation, not an established result.
