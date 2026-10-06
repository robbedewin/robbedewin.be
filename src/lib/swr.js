// Safe-withdrawal-rate Monte Carlo, ported from financial_report
// (shared/projections/bootstrap.py + swr_table._bootstrap_failure_rate):
// - annual real returns of a stock/bond blend, rebalanced every year;
// - Politis-Romano stationary block bootstrap, mean block length 5 years;
// - a constant real withdrawal taken at the end of each year, after that
//   year's return; a path fails the first year it cannot pay in full.
// Fees are an addition here: an annual drag on the blended return.
// Plain JS (no build step) so `node --test` can import it directly.

/** Small, fast seeded PRNG (mulberry32) returning floats in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Annual real returns of the blend, minus fees. */
export function blend(data, equity, fee = 0) {
  return data.stocks.map((s, i) => equity * s + (1 - equity) * data.bonds[i] - fee);
}

/**
 * Run the simulation.
 * @param {number[]} returns  annual real returns to resample
 * @param {{start: number, withdrawal: number, years: number,
 *          paths?: number, block?: number, seed?: number,
 *          bands?: number[]}} opts
 * @returns {{failure: number, failureYears: Int32Array,
 *            bands: Record<string, Float64Array>}}
 *   `bands[p][t]` is the p-th percentile of real wealth after year t.
 */
export function simulate(returns, opts) {
  const { start, withdrawal, years } = opts;
  const paths = opts.paths ?? 5000;
  const block = opts.block ?? 5;
  const want = opts.bands ?? [];
  const rand = rng(opts.seed ?? 42);
  const n = returns.length;
  const pNew = 1 / Math.max(block, 1);

  // wealth[t * paths + i]: real wealth of path i after year t (only when bands wanted)
  const keep = want.length > 0;
  const wealth = keep ? new Float64Array((years + 1) * paths) : null;
  const failureYears = new Int32Array(paths); // 0 = never failed
  let failures = 0;

  for (let i = 0; i < paths; i++) {
    let pos = Math.floor(rand() * n);
    let w = start;
    if (keep) wealth[i] = w;
    for (let t = 0; t < years; t++) {
      const grown = w * (1 + returns[pos]);
      if (withdrawal > grown && failureYears[i] === 0) {
        failureYears[i] = t + 1;
        failures++;
      }
      w = Math.max(grown - Math.min(withdrawal, grown), 0);
      if (keep) wealth[(t + 1) * paths + i] = w;
      pos = rand() < pNew ? Math.floor(rand() * n) : (pos + 1) % n;
    }
  }

  const bands = {};
  if (keep) {
    for (const p of want) bands[p] = new Float64Array(years + 1);
    const col = new Float64Array(paths);
    for (let t = 0; t <= years; t++) {
      for (let i = 0; i < paths; i++) col[i] = wealth[t * paths + i];
      col.sort();
      for (const p of want) bands[p][t] = quantile(col, p / 100);
    }
  }
  return { failure: failures / paths, failureYears, bands };
}

/** Linear-interpolated quantile of a sorted array (numpy's default). */
function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/**
 * Largest withdrawal (as a fraction of the start) whose failure rate stays
 * at or below `target`, by bisection on a fixed seed.
 */
export function sustainableRate(returns, { years, target = 0.05, paths = 4000, seed = 42 }) {
  let lo = 0;
  let hi = 0.15;
  for (let k = 0; k < 18; k++) {
    const mid = (lo + hi) / 2;
    const { failure } = simulate(returns, { start: 1, withdrawal: mid, years, paths, seed });
    if (failure <= target) lo = mid;
    else hi = mid;
  }
  return lo;
}
