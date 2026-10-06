// The JS port must agree with the Python engine in financial_report.
// The two use different random generators, so we compare failure rates
// statistically: with 40k paths each, the standard error of a difference is
// at most ~0.35 percentage points, so 1.5 pp is a safe, still-meaningful bound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blend, simulate, sustainableRate } from '../src/lib/swr.js';

const data = JSON.parse(readFileSync(new URL('../src/data/damodaran-real.json', import.meta.url)));
const reference = JSON.parse(readFileSync(new URL('./fixtures/swr-reference.json', import.meta.url)));

for (const c of reference) {
  test(`failure rate ${Math.round(c.equity * 100)}/${Math.round(100 - c.equity * 100)}, ${(c.rate * 100).toFixed(1)}% over ${c.years}y matches Python`, () => {
    const { failure } = simulate(blend(data, c.equity), {
      start: 1, withdrawal: c.rate, years: c.years, paths: 40_000, seed: 11,
    });
    assert.ok(Math.abs(failure - c.failure) < 0.015,
      `JS ${(failure * 100).toFixed(2)}% vs Python ${(c.failure * 100).toFixed(2)}%`);
  });
}

test('fees lower the sustainable rate', () => {
  const noFee = sustainableRate(blend(data, 0.6, 0), { years: 30 });
  const fee = sustainableRate(blend(data, 0.6, 0.01), { years: 30 });
  assert.ok(fee < noFee);
});

test('the same seed gives the same result', () => {
  const r = blend(data, 0.6);
  const a = simulate(r, { start: 1, withdrawal: 0.045, years: 30, seed: 3 });
  const b = simulate(r, { start: 1, withdrawal: 0.045, years: 30, seed: 3 });
  assert.equal(a.failure, b.failure);
});

test('bands are ordered and start at the initial wealth', () => {
  const { bands } = simulate(blend(data, 0.6), {
    start: 100, withdrawal: 4, years: 30, bands: [10, 50, 90],
  });
  assert.equal(bands[50][0], 100);
  for (let t = 0; t <= 30; t++) assert.ok(bands[10][t] <= bands[50][t] && bands[50][t] <= bands[90][t]);
});
