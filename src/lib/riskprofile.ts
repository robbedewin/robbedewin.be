// Risk profile: tolerance from a questionnaire, capacity from the numbers,
// and the range of equities the two allow together.
import thresholds from '../data/risk-capacity.json' with { type: 'json' };

// ── Tolerance ──────────────────────────────────────────────────────────
// The 13-item scale of Grable & Lytton (1999), "Financial risk tolerance
// revisited: the development of a risk assessment instrument", Financial
// Services Review 8, 163–181. Points per answer, in the order the options are
// listed, as printed in Kuzniak et al. (2015), Financial Services Review 24,
// 177–192, Appendix A. Totals run from 13 to 47.
export const GL_POINTS: readonly (readonly number[])[] = [
  [4, 3, 2, 1],
  [1, 2, 3, 4],
  [1, 2, 3, 4],
  [1, 2, 3],
  [1, 2, 3],
  [1, 2, 3, 4],
  [1, 2, 3, 4],
  [1, 2, 3, 4],
  [1, 3],
  [1, 3],
  [1, 2, 3, 4],
  [1, 2, 3],
  [1, 2, 3, 4],
];
export const GL_MIN = 13;
export const GL_MAX = 47;

/** The total, or null while a question is unanswered. `answers[i]` is the
 *  index of the chosen option of question i. */
export function toleranceScore(answers: readonly (number | null)[]): number | null {
  let total = 0;
  for (let i = 0; i < GL_POINTS.length; i++) {
    const a = answers[i];
    if (a === null || a === undefined || GL_POINTS[i][a] === undefined) return null;
    total += GL_POINTS[i][a];
  }
  return total;
}

/** 0 low … 4 high. The bands of the scoring grid published with the quiz
 *  (Rutgers Cooperative Extension): 18 or below, 19–22, 23–28, 29–32, 33 and up. */
export type ToleranceLevel = 0 | 1 | 2 | 3 | 4;
export function toleranceLevel(score: number): ToleranceLevel {
  if (score <= 18) return 0;
  if (score <= 22) return 1;
  if (score <= 28) return 2;
  if (score <= 32) return 3;
  return 4;
}

// ── Capacity ───────────────────────────────────────────────────────────
// A port of the rule in financial_report (shared/plan/sections/
// risk_capacity.py, thresholds in shared/risicocapaciteit.py), tested
// against it in tests/riskprofile.test.mjs.
export type Capacity = 'beperkt' | 'gemiddeld' | 'ruim';
export type CapacityFactor = 'horizon' | 'marge' | 'stabiliteit';
export type Stability = 'hoog' | 'matig' | 'laag';
export const DREMPELS = thresholds;

/** `margin` is what is left of net income after fixed costs, as a fraction of
 *  that income; null when unknown, and then it counts neither way. */
export function capacityVerdict(
  horizonYears: number,
  stability: Stability,
  margin: number | null,
  d = DREMPELS,
): { verdict: Capacity; factors: CapacityFactor[] } {
  const beperkt: CapacityFactor[] = [];
  if (horizonYears < d.min_horizon_jaren) beperkt.push('horizon');
  if (margin !== null && margin < 0) beperkt.push('marge');
  if (stability === 'laag' && horizonYears < d.laag_stabiel_horizon_jaren) beperkt.push('stabiliteit');
  if (beperkt.length) return { verdict: 'beperkt', factors: beperkt };

  const krap: CapacityFactor[] = [];
  if (horizonYears < d.ruim_horizon_jaren) krap.push('horizon');
  if (margin !== null && margin < d.ruim_marge_pct) krap.push('marge');
  if (stability === 'laag') krap.push('stabiliteit');
  if (krap.length) return { verdict: 'gemiddeld', factors: krap };
  return { verdict: 'ruim', factors: [] };
}

// ── The two together ───────────────────────────────────────────────────
// A convention of this page, not a published rule: each tolerance level
// stands for a band of 20 points of equities, and capacity puts a ceiling on
// it. The lower of the two decides.
export const CAPACITIES: readonly Capacity[] = ['beperkt', 'gemiddeld', 'ruim'];
const CEILING: Record<Capacity, number> = { beperkt: 40, gemiddeld: 80, ruim: 100 };

/** Share of equities in %, as [from, to]. */
export function equityRange(level: ToleranceLevel, capacity: Capacity): [number, number] {
  const cap = CEILING[capacity];
  return [Math.min(level * 20, cap - 20), Math.min(level * 20 + 20, cap)];
}

// ── The page's own limits on top ───────────────────────────────────────
// Two more conventions of this page. Money needed within 3 years should not
// depend on the stock market, whatever else the answers say. And someone who
// would sell in a 30 % fall gets one band less: selling in a fall turns a
// temporary loss into a final one, so the mix should be one they can sit out.
export const SHORT_HORIZON_YEARS = 3;
export type RangeLimit = 'kort' | 'gedrag';

/** The range of equities after the page's limits, and which of them lowered it. */
export function adviceRange(
  level: ToleranceLevel,
  capacity: Capacity,
  opts: { horizonYears: number; sellsInFall: boolean },
): { range: [number, number]; limits: RangeLimit[] } {
  const base = equityRange(level, capacity);
  const limits: RangeLimit[] = [];
  const short = opts.horizonYears < SHORT_HORIZON_YEARS;
  if (short && base[1] > 20) limits.push('kort');
  if (opts.sellsInFall && base[1] > 20) limits.push('gedrag');
  const range: [number, number] = short
    ? [0, Math.min(base[1], 20)]
    : opts.sellsInFall && base[1] > 20 ? [Math.max(base[0] - 20, 0), base[1] - 20] : base;
  return { range, limits };
}
