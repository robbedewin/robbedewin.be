// The tax functions must agree with the Python engine in financial_report
// (reference cases from tools/export_pension_data.py). The projection itself
// has no Python counterpart; it is checked on cases worked out by hand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  capitalGainsTax, legalPensionAge, leviesPillar2, pensionSavingsCredit, PENSION_CONSTANTS,
} from '../src/lib/be/pensiontax.ts';
import { projectRetirement, sustainableSpending } from '../src/lib/be/retirement.ts';

const ref = JSON.parse(readFileSync(new URL('./fixtures/pension-reference.json', import.meta.url)));
const close = (a, b, what, tol = 1e-3) =>
  assert.ok(Math.abs(a - b) < tol, `${what}: got ${a}, expected ${b}`);

test('second-pillar levies match Python', () => {
  for (const c of ref.pillar2) {
    close(c.capital * (1 - leviesPillar2(c.age, c.active, c.legal)), c.net,
      `age ${c.age}, active ${c.active}, legal ${c.legal}`);
  }
});
test('pension-savings tax reduction matches Python', () => {
  for (const c of ref.savings) close(pensionSavingsCredit(c.premium, c.raised), c.credit, `premium ${c.premium} raised ${c.raised}`);
});
test('capital-gains tax matches Python', () => {
  for (const c of ref.gains) close(capitalGainsTax(c.gain, c.rate, c.exemption), c.tax, `gain ${c.gain}`);
});
test('legal pension age matches Python', () => {
  for (const c of ref.legal_age) assert.equal(legalPensionAge(c.born), c.age);
});

// The projection, against its own tax rules.
const plan = {
  age: 55, retireAge: 63, pensionAge: 63, legalPensionAge: 67, endAge: 70, inflation: 0,
  portfolio: 0, monthlySaving: 0, portfolioReturn: 0, statePensionMonthly: 0,
  pillar2: 100000, pillar2Yearly: 0, pillar2Return: 0,
  pensionSavings: 0, pensionSavingsYearly: 0, pensionSavingsReturn: 0,
  spendingMonthly: 0, capitalGainsRate: 0.1, capitalGainsExemption: 10000, tob: 0,
};
const levyAt = (inp, age) => projectRetirement(inp).rows.find((r) => r.age === age).pillar2Levies;

test('an early pension carries the higher second-pillar tax', () => {
  // 16,5 % final tax + RIZIV + solidarity, not the 10 % of the legal age.
  close(levyAt(plan, 63), 100000 * leviesPillar2(63, false, 67), 'early at 63');
  assert.ok(levyAt(plan, 63) > 100000 * 0.2, 'more than 20 % in all');
  // Working until the legal age and starting then: 10 %.
  const atLegal = { ...plan, retireAge: 67, pensionAge: 67 };
  close(levyAt(atLegal, 67), 100000 * leviesPillar2(67, true, 67), 'at the legal age');
  // Stopping work early but starting the pension at the legal age: no 10 %.
  const stopsEarly = { ...plan, retireAge: 63, pensionAge: 67 };
  close(levyAt(stopsEarly, 67), 100000 * leviesPillar2(67, false, 67), 'stopped before the legal age');
});

test('the pension-savings reduction takes the better ceiling', () => {
  const [basic, raised] = PENSION_CONSTANTS.pensioensparen.opties;
  const credit = (premium) =>
    projectRetirement({ ...plan, age: 40, retireAge: 41, pensionAge: 67, endAge: 41, pensionSavingsYearly: premium })
      .rows[0].pensionSavingsCredit;
  // Just above the basic ceiling, the basic ceiling still pays more.
  const justAbove = basic.max_premie_eur + 50;
  close(credit(justAbove), basic.max_premie_eur * basic.vermindering, 'just above the basic ceiling');
  // At the raised ceiling, the raised option pays more.
  close(credit(raised.max_premie_eur), raised.max_premie_eur * raised.vermindering, 'at the raised ceiling');
  close(credit(500), 500 * basic.vermindering, 'below the basic ceiling');
});

// No returns, no inflation, no taxes, no pillars: plain arithmetic.
const plain = {
  age: 60, retireAge: 65, pensionAge: 67, endAge: 90, inflation: 0,
  portfolio: 100_000, monthlySaving: 1_000, portfolioReturn: 0,
  statePensionMonthly: 0, pillar2: 0, pillar2Yearly: 0, pillar2Return: 0,
  pensionSavings: 0, pensionSavingsYearly: 0, pensionSavingsReturn: 0,
  spendingMonthly: 2_000, capitalGainsRate: 0, capitalGainsExemption: 0, tob: 0,
};

test('saving adds up and spending runs the portfolio down', () => {
  const res = projectRetirement(plain);
  // 100 000 + 5 years of 12 000 = 160 000 on the day work stops.
  close(res.wealthAtRetirement, 160_000, 'wealth at retirement');
  // 24 000 a year: 6 full years (144 000), the 7th year (age 71) falls short.
  assert.equal(res.depletionAge, 71);
  close(res.rows.find((r) => r.age === 71).shortfall, 8_000, 'shortfall');
  assert.equal(res.rows.length, 30);
});

test('the statutory pension lowers what the portfolio must pay', () => {
  const res = projectRetirement({ ...plain, statePensionMonthly: 1_500 });
  const at66 = res.rows.find((r) => r.age === 66);
  const at67 = res.rows.find((r) => r.age === 67);
  close(at66.withdrawal, 24_000, 'before the pension starts');
  close(at67.withdrawal, 6_000, 'once it has started');
});

test('the second pillar pays out net when the pension starts', () => {
  const res = projectRetirement({ ...plain, retireAge: 67, pillar2: 100_000 });
  const row = res.rows.find((r) => r.age === 67);
  // Worked until the legal age: 10 % + 3.55 % + 2 %.
  close(row.pillar2Levies, 15_550, 'levies');
  close(row.pillar2Payout, 84_450, 'net payout');
  const early = projectRetirement({ ...plain, retireAge: 62, pillar2: 100_000 });
  // Stopped earlier: 16.5 % + 3.55 % + 2 %.
  close(early.rows.find((r) => r.age === 67).pillar2Levies, 22_050, 'levies after stopping early');
});

test('pension savings: reduction while paying in, 8 % at 60, free at retirement', () => {
  const res = projectRetirement({ ...plain, age: 58, pensionSavings: 10_000, pensionSavingsYearly: 1_050, monthlySaving: 0 });
  const at58 = res.rows[0];
  close(at58.pensionSavingsCredit, 315, 'reduction at the basic ceiling');
  close(at58.pensionSavings, 11_050, 'balance after one premium');
  const at60 = res.rows.find((r) => r.age === 60);
  close(at60.pensionSavingsLevy, 12_100 * 0.08, 'levy at 60');
  const at65 = res.rows.find((r) => r.age === 65);
  assert.equal(at65.pensionSavings, 0);
});

test('a sale is grossed up so the net equals the spending', () => {
  const taxed = { ...plain, age: 65, retireAge: 65, portfolio: 1_000_000, portfolioBasis: 400_000,
    monthlySaving: 0, spendingMonthly: 5_000, capitalGainsRate: 0.1, capitalGainsExemption: 10_000, tob: 0.0012 };
  const row = projectRetirement(taxed).rows[0];
  // 60 % of each euro sold is gain.
  const gain = row.withdrawal * 0.6;
  close(row.capitalGainsTax, (gain - 10_000) * 0.1, 'tax on the gain above the exemption');
  close(row.withdrawal - row.capitalGainsTax - row.withdrawal * 0.0012, 60_000, 'net of both taxes');
  assert.equal(row.shortfall, 0);
});

test('amounts in today\'s euros rise with inflation', () => {
  const res = projectRetirement({ ...plain, inflation: 0.02 });
  close(res.rows[1].saved, 12_000 * 1.02, 'second year of saving');
  close(res.rows.find((r) => r.age === 65).spending, 24_000 * 1.02 ** 5, 'first year of spending');
});

test('the sustainable spending just lasts, and one percent more does not', () => {
  const inp = { ...plain, portfolioReturn: 0.05, inflation: 0.02, statePensionMonthly: 1_500,
    capitalGainsRate: 0.1, capitalGainsExemption: 10_000, tob: 0.0012 };
  const max = sustainableSpending(inp);
  assert.ok(max > 1_500);
  assert.equal(projectRetirement({ ...inp, spendingMonthly: max }).depletionAge, null);
  assert.notEqual(projectRetirement({ ...inp, spendingMonthly: max * 1.01 }).depletionAge, null);
});
