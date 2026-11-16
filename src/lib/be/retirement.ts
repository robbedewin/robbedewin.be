// A lifetime projection for one person in Belgium: building up until the day
// work stops, then living off the statutory pension and the portfolio.
//
// This model is written for the site; financial_report has no deterministic
// counterpart to port (its projections are Monte Carlo). The tax rules it
// calls are ports and are tested against the Python (pensiontax.ts).
//
// One year per row, in the euros of that year. All flows happen at the start
// of the year, then every pot grows for a year. Amounts entered "per month"
// or "per year" are in today's euros and rise with inflation, as do the tax
// thresholds.
import { capitalGainsTax, leviesPillar2, pensionSavingsCredit, PENSION_CONSTANTS } from './pensiontax.ts';

/** Rates are fractions. */
export interface RetirementInputs {
  age: number;
  /** The age at which work and saving stop. */
  retireAge: number;
  /** The age at which the statutory pension starts and the second pillar pays out. */
  pensionAge: number;
  /** The projection runs until the end of the year before this age. */
  endAge: number;
  inflation: number;

  /** Free portfolio: value today, and its purchase value for the capital-gains tax. */
  portfolio: number;
  portfolioBasis?: number;
  monthlySaving: number;
  portfolioReturn: number;

  /** Net statutory pension per month. */
  statePensionMonthly: number;

  pillar2: number;
  pillar2Yearly: number;
  pillar2Return: number;

  pensionSavings: number;
  pensionSavingsYearly: number;
  pensionSavingsReturn: number;

  spendingMonthly: number;

  capitalGainsRate: number;
  capitalGainsExemption: number;
  /** Stock-exchange tax on each purchase and each sale. */
  tob: number;
}

export interface RetirementRow {
  age: number;
  working: boolean;
  /** Price level at the start of the year (1 today) and at its end. */
  priceStart: number;
  priceEnd: number;
  // Flows, at the start of the year.
  saved: number;
  spending: number;
  statePension: number;
  withdrawal: number;
  shortfall: number;
  pillar2Payout: number;
  // Taxes and the tax reduction of this year.
  pillar2Levies: number;
  pensionSavingsLevy: number;
  capitalGainsTax: number;
  tob: number;
  pensionSavingsCredit: number;
  // Balances at the end of the year.
  portfolio: number;
  pillar2: number;
  pensionSavings: number;
  total: number;
}

export interface RetirementResult {
  rows: RetirementRow[];
  /** Everything owned on the day work stops, in the euros of that day. */
  wealthAtRetirement: number;
  /** The price level on that day. */
  priceAtRetirement: number;
  /** The first age at which the portfolio cannot pay the spending; null if it lasts. */
  depletionAge: number | null;
}

// Pension savings: the levy falls at 60, premiums stop at 65, and the capital
// is free once work has stopped (at 60 at the earliest, 65 at the latest).
const LEVY_AGE = 60;
const LAST_PREMIUM_AGE = 64;

export function projectRetirement(inp: RetirementInputs): RetirementResult {
  const retireAge = Math.max(inp.retireAge, inp.age);
  const releaseAge = Math.min(Math.max(retireAge, LEVY_AGE), LAST_PREMIUM_AGE + 1);
  const basicCeiling = PENSION_CONSTANTS.pensioensparen.opties[0].max_premie_eur;

  let portfolio = Math.max(inp.portfolio, 0);
  let basis = Math.min(Math.max(inp.portfolioBasis ?? portfolio, 0), portfolio);
  let pillar2 = Math.max(inp.pillar2, 0);
  let pensionSavings = Math.max(inp.pensionSavings, 0);
  let pillar2Paid = false;
  let levyPaid = inp.age > LEVY_AGE;
  let released = false;
  let depletionAge: number | null = null;
  let wealthAtRetirement = portfolio + pillar2 + pensionSavings;
  let priceAtRetirement = 1;
  const rows: RetirementRow[] = [];

  const buy = (amount: number) => {
    const invested = amount * (1 - inp.tob);
    portfolio += invested;
    basis += invested;
    return amount - invested;
  };

  for (let age = inp.age; age < inp.endAge; age++) {
    const price = (1 + inp.inflation) ** (age - inp.age);
    const working = age < retireAge;
    if (age === retireAge) {
      wealthAtRetirement = portfolio + pillar2 + pensionSavings;
      priceAtRetirement = price;
    }
    const row: RetirementRow = {
      age, working, priceStart: price, priceEnd: price * (1 + inp.inflation),
      saved: 0, spending: 0, statePension: 0, withdrawal: 0, shortfall: 0, pillar2Payout: 0,
      pillar2Levies: 0, pensionSavingsLevy: 0, capitalGainsTax: 0, tob: 0, pensionSavingsCredit: 0,
      portfolio: 0, pillar2: 0, pensionSavings: 0, total: 0,
    };

    // Pension savings: the levy at 60, then the capital becomes free.
    if (!levyPaid && age >= LEVY_AGE) {
      row.pensionSavingsLevy = pensionSavings * PENSION_CONSTANTS.pensioensparen.heffing_op_60;
      pensionSavings -= row.pensionSavingsLevy;
      levyPaid = true;
    }
    if (!released && age >= releaseAge) {
      row.tob += buy(pensionSavings);
      pensionSavings = 0;
      released = true;
    }
    // The second pillar pays out when the statutory pension starts.
    if (!pillar2Paid && age >= inp.pensionAge) {
      const levies = leviesPillar2(Math.max(age, 60), retireAge >= inp.pensionAge, inp.pensionAge);
      row.pillar2Levies = pillar2 * levies;
      row.pillar2Payout = pillar2 - row.pillar2Levies;
      row.tob += buy(row.pillar2Payout);
      pillar2 = 0;
      pillar2Paid = true;
    }

    if (working) {
      row.saved = inp.monthlySaving * 12 * price;
      row.tob += buy(row.saved);
      if (!pillar2Paid) pillar2 += inp.pillar2Yearly * price;
      if (!released && age <= LAST_PREMIUM_AGE) {
        // The ceilings rise with inflation, so the rule is applied in today's euros.
        const premium = inp.pensionSavingsYearly;
        row.pensionSavingsCredit = pensionSavingsCredit(premium, premium > basicCeiling) * price;
        pensionSavings += Math.min(premium, PENSION_CONSTANTS.pensioensparen.opties[1].max_premie_eur) * price;
        // The tax reduction is invested too.
        row.tob += buy(row.pensionSavingsCredit);
      }
    } else {
      row.spending = inp.spendingMonthly * 12 * price;
      row.statePension = age >= inp.pensionAge ? inp.statePensionMonthly * 12 * price : 0;
      const need = row.spending - row.statePension;
      if (need < 0) {
        row.tob += buy(-need);
      } else if (need > 0) {
        // Sell enough to keep `need` after stock-exchange tax and capital-gains
        // tax. Each euro sold carries the portfolio's share of gain.
        const gainShare = portfolio > 0 ? Math.max(portfolio - basis, 0) / portfolio : 0;
        const exemption = inp.capitalGainsExemption * price;
        let sale = need / (1 - inp.tob);
        if (sale * gainShare > exemption) {
          sale = (need - inp.capitalGainsRate * exemption) / (1 - inp.tob - inp.capitalGainsRate * gainShare);
        }
        sale = Math.min(sale, portfolio);
        const tax = capitalGainsTax(sale * gainShare, inp.capitalGainsRate, exemption);
        const net = sale * (1 - inp.tob) - tax;
        row.withdrawal = sale;
        row.capitalGainsTax = tax;
        row.tob += sale * inp.tob;
        row.shortfall = Math.max(need - net, 0);
        if (portfolio > 0) basis *= 1 - sale / portfolio;
        portfolio -= sale;
        if (row.shortfall > 0.005 && depletionAge === null) depletionAge = age;
      }
    }

    portfolio *= 1 + inp.portfolioReturn;
    pillar2 *= 1 + inp.pillar2Return;
    pensionSavings *= 1 + inp.pensionSavingsReturn;
    row.portfolio = portfolio;
    row.pillar2 = pillar2;
    row.pensionSavings = pensionSavings;
    row.total = portfolio + pillar2 + pensionSavings;
    rows.push(row);
  }
  if (retireAge >= inp.endAge) {
    wealthAtRetirement = portfolio + pillar2 + pensionSavings;
    priceAtRetirement = (1 + inp.inflation) ** (inp.endAge - inp.age);
  }
  return { rows, wealthAtRetirement, priceAtRetirement, depletionAge };
}

/** The highest monthly spending (today's euros) the plan carries to the end
 *  age without running out, to the nearest euro. */
export function sustainableSpending(inp: RetirementInputs): number {
  const lasts = (monthly: number) =>
    projectRetirement({ ...inp, spendingMonthly: monthly }).depletionAge === null;
  if (inp.retireAge >= inp.endAge) return 0;
  let lo = 0;
  let hi = 1000;
  while (lasts(hi) && hi < 1e7) hi *= 2;
  for (let i = 0; i < 40 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2;
    if (lasts(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo);
}
