// Rent or buy, year by year, in nominal euros. A port of
// financial_report/shared/rentbuy/cashflow_model.py (project_cashflows),
// tested against it in tests/rentbuy.test.mjs.
//
// The renter starts with the money the buyer sinks into the purchase (own
// contribution plus purchase costs) and keeps it invested. Each year, whoever
// pays less for housing invests the difference at the same return. The buyer
// also owns what a sale would leave: the home's value, minus the outstanding
// loan and the selling costs.
import {
  monthlyPayment,
  notaryFeePurchase,
  registrationRule,
  type Region,
} from './realestate.ts';

/** Rates are fractions (0.034 for 3.4 %). */
export interface RentBuyInputs {
  price: number;
  monthlyRent: number;
  mortgageRate: number;
  downPaymentPct: number;
  /** Nominal yearly return on invested money, after costs and taxes. */
  investmentReturn: number;
  /** Yearly, as a share of the purchase price; these three stay flat. */
  propertyTaxPct: number;
  maintenancePct: number;
  insurancePct: number;
  mortgageTermYears: number;
  horizonYears: number;
  houseGrowthPct: number;
  rentGrowthPct: number;
  sellingCostPct: number;
  region: Region;
  soleOwnHome: boolean;
  kernstad?: boolean;
  /** Replaces the region's registration rate (an announced change, a special
   *  regime); the fixed reduction and the Brussels abattement still apply. */
  registrationRate?: number;
  /** Replaces the notary cost from the fee scale, for someone with a quote. */
  notaryFee?: number;
}

export interface YearRow {
  year: number;
  mortgagePayment: number;
  interest: number;
  principal: number;
  balance: number;
  ownerOutflow: number;
  rent: number;
  buyerNetWorth: number;
  renterNetWorth: number;
}

export type Verdict = 'huren' | 'kopen' | 'pariteit';

export interface RentBuyResult {
  schedule: YearRow[];
  registrationDuties: number;
  notaryFee: number;
  /** Registration duties plus notary fee. */
  upfrontCosts: number;
  downPayment: number;
  loan: number;
  monthlyPayment: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  /** Buyer minus renter at the horizon. */
  advantageToBuyer: number;
  /** First year the buyer's net worth reaches the renter's, if any. */
  breakevenYear: number | null;
  /** Within 5 % of the renter's net worth counts as parity. */
  verdict: Verdict;
}

export function projectCashflows(inp: RentBuyInputs): RentBuyResult {
  const price = inp.price;
  const loan = price * (1 - inp.downPaymentPct);
  const down = price - loan;
  const rule = registrationRule(price, {
    region: inp.region,
    soleOwnHome: inp.soleOwnHome,
    kernstad: inp.kernstad,
  });
  const registrationDuties = Math.max(
    rule.taxed * (inp.registrationRate ?? rule.rate) - rule.reduction,
    0,
  );
  const notaryFee = inp.notaryFee ?? notaryFeePurchase(price);
  const upfront = registrationDuties + notaryFee;

  const monthlyRate = inp.mortgageRate / 12;
  const payment = monthlyPayment(loan, inp.mortgageRate, inp.mortgageTermYears * 12);
  const fixedCosts = price * (inp.propertyTaxPct + inp.maintenancePct + inp.insurancePct);

  let balance = loan;
  let renterAssets = down + upfront;
  let buyerAssets = 0; // side investments only; the home is added at sale
  let breakevenYear: number | null = null;
  const schedule: YearRow[] = [];

  for (let year = 1; year <= inp.horizonYears; year++) {
    let interestY = 0;
    let principalY = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 1e-9) break;
      const interest = balance * monthlyRate;
      const principal = Math.min(payment - interest, balance);
      balance -= principal;
      interestY += interest;
      principalY += principal;
    }
    const paymentY = interestY + principalY;
    const ownerOutflow = paymentY + fixedCosts;
    const rent = inp.monthlyRent * 12 * (1 + inp.rentGrowthPct) ** (year - 1);

    renterAssets *= 1 + inp.investmentReturn;
    buyerAssets *= 1 + inp.investmentReturn;
    const diff = ownerOutflow - rent;
    if (diff > 0) renterAssets += diff;
    else buyerAssets -= diff;

    const houseValue = price * (1 + inp.houseGrowthPct) ** year;
    const buyerNetWorth = buyerAssets + houseValue - balance - houseValue * inp.sellingCostPct;
    if (breakevenYear === null && buyerNetWorth >= renterAssets) breakevenYear = year;

    schedule.push({
      year,
      mortgagePayment: paymentY,
      interest: interestY,
      principal: principalY,
      balance,
      ownerOutflow,
      rent,
      buyerNetWorth,
      renterNetWorth: renterAssets,
    });
  }

  const last = schedule[schedule.length - 1];
  const buyerNetWorth = last?.buyerNetWorth ?? 0;
  const renterNetWorth = last?.renterNetWorth ?? 0;
  const advantage = buyerNetWorth - renterNetWorth;
  const band = 0.05 * renterNetWorth;
  const verdict: Verdict = advantage < -band ? 'huren' : advantage > band ? 'kopen' : 'pariteit';

  return {
    schedule,
    registrationDuties,
    notaryFee,
    upfrontCosts: upfront,
    downPayment: down,
    loan,
    monthlyPayment: payment,
    buyerNetWorth,
    renterNetWorth,
    advantageToBuyer: advantage,
    breakevenYear,
    verdict,
  };
}
