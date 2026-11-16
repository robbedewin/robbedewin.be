// The Monte Carlo around the retirement projection: its drift, that a fixed
// return sequence reproduces the plain projection, and that the 90 % spending
// is the highest that holds in 90 % of the futures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deviationPaths, driftFor, simulateRetirement, sustainableSpendingMc } from '../src/lib/be/retirement-mc.ts';
import { projectRetirement, sustainableSpending } from '../src/lib/be/retirement.ts';

const plan = {
  age: 50, retireAge: 65, pensionAge: 67, legalPensionAge: 67, endAge: 90, inflation: 0.02,
  portfolio: 150_000, monthlySaving: 600, portfolioReturn: 0.06, statePensionMonthly: 1_700,
  pillar2: 40_000, pillar2Yearly: 1_500, pillar2Return: 0.02,
  pensionSavings: 15_000, pensionSavingsYearly: 1_000, pensionSavingsReturn: 0.035,
  spendingMonthly: 2_400, capitalGainsRate: 0.1, capitalGainsExemption: 10_000, tob: 0.0012,
};
const opts = { equityShare: 0.6, paths: 400, seed: 7 };

test('the drift compounds to the expected return', () => {
  assert.equal(driftFor(0.04, [0, 0, 0]), 0.04);
  const dev = [-0.2, 0.1, 0.25, -0.15];
  const mu = driftFor(0.04, dev);
  const geo = Math.exp(dev.reduce((a, d) => a + Math.log(1 + mu + d), 0) / dev.length) - 1;
  assert.ok(Math.abs(geo - 0.04) < 1e-9, `compound ${geo}`);
  assert.ok(mu > 0.04, 'swings need a higher arithmetic return');
});

test('a fixed sequence of the expected return is the plain projection', () => {
  const years = plan.endAge - plan.age;
  const plain = projectRetirement(plan);
  const fixed = projectRetirement({ ...plan, portfolioReturns: new Float64Array(years).fill(plan.portfolioReturn) });
  assert.equal(fixed.rows.at(-1).total, plain.rows.at(-1).total);
});

test('the futures are the same for the same seed', () => {
  const a = deviationPaths(0.6, 10, 5, 5, 1);
  const b = deviationPaths(0.6, 10, 5, 5, 1);
  assert.deepEqual(Array.from(a), Array.from(b));
});

test('the 90 % spending is the highest that lasts in 90 % of the futures', () => {
  const years = plan.endAge - plan.age;
  const dev = deviationPaths(opts.equityShare, years, opts.paths, 5, opts.seed);
  const s90 = sustainableSpendingMc(plan, opts, 0.9, dev);
  assert.ok(simulateRetirement({ ...plan, spendingMonthly: s90 }, opts, dev).success >= 0.9);
  assert.ok(simulateRetirement({ ...plan, spendingMonthly: s90 + 2 }, opts, dev).success < 0.9);
  // Swings cost something: below the figure at the expected return each year.
  assert.ok(s90 < sustainableSpending(plan), `${s90} vs ${sustainableSpending(plan)}`);
});

test('the middle future stays near the expected-return projection', () => {
  const sim = simulateRetirement(plan, opts);
  const expected = projectRetirement(plan).rows.at(-1).total;
  const ratio = sim.p50.at(-1) / expected;
  assert.ok(ratio > 0.8 && ratio < 1.25, `median / expected = ${ratio}`);
  assert.ok(sim.p10.at(-1) <= sim.p50.at(-1) && sim.p50.at(-1) <= sim.p90.at(-1));
});
