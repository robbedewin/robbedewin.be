---
title: "PaRMMoSaHN — pan-metabolic modelling at scale"
summary: "Reconstruct one metabolic model per species, then project strain models from it by protein homology — minutes per genome instead of hours."
description: "An open-source Python package that builds genome-scale metabolic models for ~1,500 bacterial genomes by pan-model reconstruction and homology projection, validated against Biolog phenotype data."
tags: ["Python", "Metabolic modelling", "Pangenomics", "MSc thesis"]
order: 1
featured: true
period: "2025 – 2026 · MSc Bioinformatics thesis, KU Leuven"
repo: "https://github.com/robbedewin/PaRMMoSaHN"
repoLabel: "github.com/robbedewin/PaRMMoSaHN"
---

Genome-scale metabolic model (GSMM) reconstruction forces a choice. De novo
reconstruction with **gapseq** recovers any documented pathway but costs hours
per genome. Reference-based projection with **CarveMe** is orders of magnitude
faster, but it cannot reconstruct a reaction its template omits. Neither option
is comfortable when the input is a thousand genomes.

PaRMMoSaHN resolves the trade-off by **reconstructing once and projecting many
times**. One pan-metabolic model is built per species by running gapseq over the
all-but-one proteome of a [PPanGGOLiN](https://github.com/labgem/PPanGGOLiN)
pangenome. Every strain model is then derived from that frozen pan-model by
**DIAMOND** protein-homology projection — minutes per genome rather than hours,
against a reference that already contains the species' full documented
metabolism.

## Scale

| | |
|---|---|
| *Clostridia* genomes | 1,010 |
| *Bacillus subtilis* genomes | 481 |
| In-house *Clostridia* lab strains (Biolog assayed) | 7 |
| Pipeline stages | pangenome → pan-model → strain models → curation → annotation → final models → QC |

Roughly 25,000 output files move through a staged pipeline. At that size the
work stops being scripting and becomes a systems problem: versioned conda
environments, staged and resumable outputs, regenerable raw data, and long-running
batch jobs that have to survive being interrupted.

## Results

Models were scored against substrate-utilisation data as **Matthews correlation
coefficient (MCC)**. Projection **matched or exceeded direct de novo
reconstruction of the same genomes in every cohort**. On eight held-out
*B. subtilis* strains PaRMMoSaHN reached the highest pooled MCC, ahead of both
gapseq and CarveMe; the same ordering held on the in-house lab strains and
across both *Clostridia* folds.

Supporting findings:

- Projecting onto genomes **absent from the pan-model training set did not lower
  accuracy** — the pan-model generalises rather than memorising its inputs.
- Within a sub-species, projected models varied far less in reaction count than
  independently reconstructed ones, approaching expert-curated consistency.
- Scaling was **sub-linear**: about **12× faster** than per-genome reconstruction
  on the largest cohort.

And the negative results, which matter as much:

- The optional curation step left phenotype accuracy unchanged. Its value is
  structural model hygiene, not prediction.
- Gene-essentiality agreement improved with medium richness but plateaued — a
  flux-balance ceiling, not a tuning problem.
- A residual gap to a manually curated reference remains. That gap is the premium
  of manual curation, not a defect in the pipeline.

## Stack

**Reconstruction** gapseq (pan-model), DIAMOND (strain projection), PPanGGOLiN
(pangenome), benchmarked head-to-head against gapseq and CarveMe ·
**QC** memote · **Analysis** flux balance analysis, gene essentiality,
auxotrophy prediction, secretome analysis · **Validation** Biolog phenotype data,
held-out strain sets, comparison against published essentiality data ·
**Engineering** Python, R, conda, Git, Linux, Quarto, pytest
