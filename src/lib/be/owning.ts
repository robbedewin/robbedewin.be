// What owning a home costs per year that you never get back, in today's
// euros: the PWL / Ben Felix framing of rent or buy. A port of
// financial_report/shared/rentbuy/eigen_woning.py (kost_van_kopen), tested
// against it in tests/rentbuy.test.mjs.
//
// Per year: property tax, maintenance (and, on this page, insurance), the
// real cost of the mortgage (interest minus the inflation that erodes the
// debt), what the own contribution would earn invested, and the purchase
// costs spread over the years held; minus the home's growth above inflation,
// on the whole home. Renting costs the rent. The cheaper of the two wins.

/** The home's growth above inflation when none is given (verhuurpand.py). */
export const REAL_GROWTH_DEFAULT = 0.01;
/** Within 5 % of each other counts as parity. */
export const PARITY_BAND = 0.05;

/** Rates are fractions; `realReturn` and `realGrowth` are above inflation. */
export interface OwningInputs {
  value: number;
  rentMonthly: number;
  propertyTaxPct: number;
  maintenancePct: number;
  /** Not in the Python model; 0 there. */
  insurancePct?: number;
  downPaymentPct: number;
  mortgageRate: number;
  inflation: number;
  realReturn: number;
  purchaseCosts: number;
  years: number;
  realGrowth?: number;
}

export interface OwningCost {
  propertyTax: number;
  maintenance: number;
  insurance: number;
  debtCost: number;
  equityCost: number;
  purchasePerYear: number;
  growth: number;
  /** The sum, with growth taken off. */
  total: number;
  rent: number;
  verdict: 'kopen' | 'huren' | 'pariteit';
}

export function owningCost(inp: OwningInputs): OwningCost {
  const equity = inp.value * inp.downPaymentPct;
  const debt = inp.value - equity;
  const c = {
    propertyTax: inp.value * inp.propertyTaxPct,
    maintenance: inp.value * inp.maintenancePct,
    insurance: inp.value * (inp.insurancePct ?? 0),
    debtCost: debt * (inp.mortgageRate - inp.inflation),
    equityCost: equity * inp.realReturn,
    purchasePerYear: inp.years ? inp.purchaseCosts / inp.years : inp.purchaseCosts,
    growth: inp.value * (inp.realGrowth ?? REAL_GROWTH_DEFAULT),
  };
  const total = c.propertyTax + c.maintenance + c.insurance + c.debtCost + c.equityCost + c.purchasePerYear - c.growth;
  const rent = inp.rentMonthly * 12;
  const top = Math.max(Math.abs(rent), Math.abs(total));
  const verdict = top && Math.abs(rent - total) <= PARITY_BAND * top ? 'pariteit' : rent > total ? 'kopen' : 'huren';
  return { ...c, total, rent, verdict };
}
