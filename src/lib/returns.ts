// The portfolio return the calculators share: a stock/bond mix of long-run
// returns, minus yearly costs. The long-run figures come from the plan engine
// (src/data/returns.json); everything here is in % per year, as typed.
import returns from '../data/returns.json' with { type: 'json' };

export const RETURNS = returns;
/** Equity shares on offer, in %. */
export const MIXES = ['100', '80', '60', '40', '20', '0'] as const;
export const DEFAULT_MIX = '80';
/** Yearly costs: the running cost of a world index ETF (about 0,2 %). */
export const DEFAULT_FEE_PCT = 0.2;

/** A long-run real return (a fraction) plus inflation (in %), as a % rounded to 0,1. */
export function nominalPct(real: number, inflationPct: number): number {
  return Math.round((real * 100 + inflationPct) * 10) / 10;
}

/** The default nominal returns of equities and bonds for an inflation, in %. */
export function defaultReturns(inflationPct: number): { equity: number; bonds: number } {
  return { equity: nominalPct(returns.equity_real, inflationPct), bonds: nominalPct(returns.bond_real, inflationPct) };
}

/** Weighted return of the mix, minus costs, in % per year. */
export function portfolioReturnPct(mix: string, equityPct: number, bondPct: number, feePct: number): number {
  const w = ((MIXES as readonly string[]).includes(mix) ? Number(mix) : Number(DEFAULT_MIX)) / 100;
  return w * equityPct + (1 - w) * bondPct - feePct;
}
