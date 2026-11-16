// The TypeScript port must give the same numbers as the Python engine in
// financial_report (shared/rentbuy, shared/be_realestate). The reference
// cases come from tools/export_rentbuy_data.py; the model is deterministic,
// so the two must agree to well under a cent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creditDeedCost, notaryFeePurchase, registratierechten, registrationRule } from '../src/lib/be/realestate.ts';
import { projectCashflows } from '../src/lib/be/rentbuy.ts';

const ref = JSON.parse(readFileSync(new URL('./fixtures/rentbuy-reference.json', import.meta.url)));
const close = (a, b, what) =>
  assert.ok(Math.abs(a - b) < 1e-3, `${what}: TS ${a} vs Python ${b}`);

test('registration duties and notary fee match Python', () => {
  for (const c of ref.purchase) {
    const label = `${c.region} ${c.price} sole=${c.sole} kernstad=${c.kernstad}`;
    close(
      registratierechten(c.price, { region: c.region, soleOwnHome: c.sole, kernstad: c.kernstad }),
      c.registratierechten, `registratierechten ${label}`,
    );
    close(notaryFeePurchase(c.price), c.notaris, `notaris ${label}`);
  }
});

test('credit-deed cost matches Python', () => {
  for (const c of ref.credit) close(creditDeedCost(c.loan, c.sole), c.kredietakte, `loan ${c.loan} sole=${c.sole}`);
});

test('the rule shown on the page adds up to the duty charged', () => {
  for (const c of ref.purchase) {
    const rule = registrationRule(c.price, { region: c.region, soleOwnHome: c.sole, kernstad: c.kernstad });
    close(Math.max(rule.taxed * rule.rate - rule.reduction, 0), c.registratierechten,
      `rule ${c.region} ${c.price} sole=${c.sole} kernstad=${c.kernstad} (${rule.kind})`);
  }
});

test('a typed registration rate replaces the region rate, the reduction stays', () => {
  const base = {
    price: 200_000, monthlyRent: 900, mortgageRate: 0.034, downPaymentPct: 0.2,
    investmentReturn: 0.06, propertyTaxPct: 0.003, maintenancePct: 0.01, insurancePct: 0.001,
    mortgageTermYears: 25, horizonYears: 10, houseGrowthPct: 0.03, rentGrowthPct: 0.02,
    sellingCostPct: 0.03, region: 'VL', soleOwnHome: true, costGrowthPct: 0.02,
    includeCreditDeed: false,
  };
  close(projectCashflows(base).registrationDuties, 200_000 * 0.02 - 1867, 'region rate');
  close(projectCashflows({ ...base, registrationRate: 0.03 }).registrationDuties,
    200_000 * 0.03 - 1867, 'typed rate');
  close(projectCashflows({ ...base, region: 'BR', price: 400_000, registrationRate: 0.1 })
    .registrationDuties, 200_000 * 0.1, 'typed rate keeps the Brussels abattement');
  const deed = projectCashflows({ ...base, includeCreditDeed: true });
  close(deed.creditDeed, creditDeedCost(160_000, true), 'credit deed on the loan');
  close(projectCashflows({ ...base, includeCreditDeed: true, creditDeed: 3_000 }).creditDeed, 3_000, 'typed credit deed');
  const quoted = projectCashflows({ ...base, notaryFee: 5_000 });
  close(quoted.notaryFee, 5_000, 'typed notary cost');
  close(quoted.upfrontCosts, 200_000 * 0.02 - 1867 + 5_000, 'typed notary cost in the total');
});

const COLUMNS = {
  mortgagePayment: 'hypotheek_betaling_eur',
  interest: 'rente_eur',
  principal: 'kapitaalaflossing_eur',
  balance: 'openstaand_saldo_eur',
  ownerOutflow: 'eigenaar_uitgave_eur',
  rent: 'huur_eur',
  buyerNetWorth: 'vermogen_kopen_eur',
  renterNetWorth: 'vermogen_huren_eur',
};

ref.cashflow.forEach((c, i) => {
  const p = c.inputs;
  test(`cash-flow case ${i}: ${p.region}, ${p.holding_period_years}y, ${c.verdict}`, () => {
    const res = projectCashflows({
      price: p.home_value_eur,
      monthlyRent: p.monthly_rent_eur,
      mortgageRate: p.mortgage_rate,
      downPaymentPct: p.down_payment_pct,
      investmentReturn: p.opportunity_cost,
      propertyTaxPct: p.property_tax_pct,
      maintenancePct: p.maintenance_pct,
      insurancePct: p.insurance_pct,
      costGrowthPct: p.cost_growth_pct,
      includeCreditDeed: p.include_credit_deed,
      mortgageTermYears: p.mortgage_term_years,
      horizonYears: p.holding_period_years,
      houseGrowthPct: p.house_growth_pct,
      rentGrowthPct: p.rent_growth_pct,
      sellingCostPct: p.selling_cost_pct,
      region: p.region,
      soleOwnHome: p.is_sole_own_home,
    });
    close(res.upfrontCosts, c.upfront_transaction_eur, 'upfront costs');
    close(res.monthlyPayment, c.monthly_mortgage_payment_eur, 'monthly payment');
    close(res.buyerNetWorth, c.buyer_net_worth_eur, 'buyer net worth');
    close(res.renterNetWorth, c.renter_net_worth_eur, 'renter net worth');
    assert.equal(res.breakevenYear, c.breakeven_year);
    assert.equal(res.verdict, c.verdict);
    assert.equal(res.schedule.length, c.schedule.length);
    res.schedule.forEach((row, y) => {
      for (const [ts, py] of Object.entries(COLUMNS)) {
        close(row[ts], c.schedule[y][py], `year ${y + 1} ${ts}`);
      }
    });
  });
});
