// Many futures for the retirement projection, instead of one at the
// expected return.
//
// Each future is a sequence of yearly returns for the free portfolio. The
// sequences are drawn from the yearly real returns of US stocks and bonds
// since 1928 (Damodaran, the data of /tools/withdrawal), blended in the
// page's mix and resampled in blocks with the stationary bootstrap of
// src/lib/swr.js (mean block of 5 years, so good and bad runs of years stay
// together). Only the history's swings are kept: each year's deviation from
// the blend's own average is added to a drift, set so that the compound
// (geometric) average over the history equals the return the page expects;
// that return is a compound average too (DMS report 5 % real as such). The
// middle future then follows the page's assumption, and the spread around it
// is the one history showed. Inflation stays fixed; the second pillar and
// pension savings keep their own rates.
import data from '../../data/damodaran-real.json' with { type: 'json' };
import { rng } from '../swr.js';
import { projectRetirement, type RetirementInputs } from './retirement.ts';

export const HISTORY = { source: data.source, from: data.years[0], to: data.years[data.years.length - 1] };

export interface McOptions {
  /** Share of equities in the free portfolio, 0 to 1. */
  equityShare: number;
  paths?: number;
  /** Mean block length of the bootstrap, in years. */
  block?: number;
  seed?: number;
}

/** Each year's real return of the blend minus the blend's average. */
function deviations(equityShare: number): number[] {
  const blend = data.stocks.map((s, i) => equityShare * s + (1 - equityShare) * data.bonds[i]);
  const mean = blend.reduce((a, b) => a + b, 0) / blend.length;
  return blend.map((x) => x - mean);
}

/** The yearly drift `mu` with mean(ln(1 + mu + d)) = ln(1 + g) over the
 *  deviations `d`: the arithmetic return whose swings compound to `g`. */
export function driftFor(g: number, dev: ArrayLike<number>): number {
  const n = dev.length;
  if (!n) return g;
  const target = Math.log(1 + g);
  let variance = 0;
  for (let i = 0; i < n; i++) variance += dev[i] * dev[i];
  let mu = g + variance / n / 2;
  for (let k = 0; k < 30; k++) {
    let f = 0;
    let df = 0;
    for (let i = 0; i < n; i++) {
      const x = Math.max(1 + mu + dev[i], 1e-6);
      f += Math.log(x);
      df += 1 / x;
    }
    const step = (f / n - target) / (df / n);
    mu -= step;
    if (Math.abs(step) < 1e-12) break;
  }
  return mu;
}

/** `paths` sequences of `years` deviations, row after row (path i starts at i * years). */
export function deviationPaths(equityShare: number, years: number, paths = 1000, block = 5, seed = 42): Float64Array {
  const dev = deviations(equityShare);
  const n = dev.length;
  const rand = rng(seed);
  const pNew = 1 / Math.max(block, 1);
  const out = new Float64Array(paths * years);
  for (let i = 0; i < paths; i++) {
    let pos = Math.floor(rand() * n);
    for (let t = 0; t < years; t++) {
      out[i * years + t] = dev[pos];
      pos = rand() < pNew ? Math.floor(rand() * n) : (pos + 1) % n;
    }
  }
  return out;
}

/** The nominal returns of path `i`: the drift plus that path's deviations,
 *  with inflation added back. */
function pathReturns(dev: Float64Array, i: number, years: number, inp: RetirementInputs, drift: number): Float64Array {
  const out = new Float64Array(years);
  for (let t = 0; t < years; t++) {
    out[t] = (1 + Math.max(drift + dev[i * years + t], -0.99)) * (1 + inp.inflation) - 1;
  }
  return out;
}

/** The drift for the page's expected return, over the blend's history. */
function driftOf(inp: RetirementInputs, equityShare: number): number {
  return driftFor((1 + inp.portfolioReturn) / (1 + inp.inflation) - 1, deviations(equityShare));
}

export interface McResult {
  /** Share of futures in which the money lasts to the end age. */
  success: number;
  /** Per year of the projection: total wealth (all pots, euros of that year)
   *  at the 10th, 50th and 90th percentile of the futures. */
  p10: Float64Array;
  p50: Float64Array;
  p90: Float64Array;
}

/** Run the projection once per future. */
export function simulateRetirement(inp: RetirementInputs, opts: McOptions, dev?: Float64Array): McResult {
  const years = Math.max(inp.endAge - inp.age, 0);
  const paths = opts.paths ?? 1000;
  const d = dev ?? deviationPaths(opts.equityShare, years, paths, opts.block, opts.seed);
  const drift = driftOf(inp, opts.equityShare);
  const totals = new Float64Array(paths * years);
  let lasts = 0;
  for (let i = 0; i < paths; i++) {
    const res = projectRetirement({ ...inp, portfolioReturns: pathReturns(d, i, years, inp, drift) });
    if (res.depletionAge === null) lasts++;
    res.rows.forEach((r, t) => { totals[t * paths + i] = r.total; });
  }
  const pick = (q: number) => {
    const out = new Float64Array(years);
    for (let t = 0; t < years; t++) {
      const col = totals.slice(t * paths, (t + 1) * paths).sort();
      out[t] = quantile(col, q);
    }
    return out;
  };
  return { success: paths ? lasts / paths : 0, p10: pick(0.1), p50: pick(0.5), p90: pick(0.9) };
}

/** The highest monthly spending (today's euros, to the euro) that lasts to
 *  the end age in at least `target` of the futures. Every candidate is tried
 *  on the same futures, so the answer moves smoothly with the inputs. */
export function sustainableSpendingMc(
  inp: RetirementInputs,
  opts: McOptions,
  target = 0.9,
  dev?: Float64Array,
): number {
  const years = Math.max(inp.endAge - inp.age, 0);
  if (inp.retireAge >= inp.endAge || years === 0) return 0;
  const paths = opts.paths ?? 1000;
  const d = dev ?? deviationPaths(opts.equityShare, years, paths, opts.block, opts.seed);
  const drift = driftOf(inp, opts.equityShare);
  const returns = Array.from({ length: paths }, (_, i) => pathReturns(d, i, years, inp, drift));
  const allowed = Math.floor(paths * (1 - target) + 1e-9);
  const holds = (monthly: number) => {
    let failed = 0;
    for (let i = 0; i < paths; i++) {
      const res = projectRetirement({ ...inp, spendingMonthly: monthly, portfolioReturns: returns[i] });
      if (res.depletionAge !== null && ++failed > allowed) return false;
    }
    return true;
  };
  let lo = 0;
  let hi = 1000;
  while (holds(hi) && hi < 1e7) hi *= 2;
  while (hi - lo > 1) {
    const mid = (lo + hi) / 2;
    if (holds(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo);
}

/** Linear-interpolated quantile of a sorted array (as in swr.js). */
function quantile(sorted: Float64Array, q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
