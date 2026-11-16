// The capacity rule must give the same verdict as the Python engine in
// financial_report (reference cases from tools/export_riskprofile_data.py).
// The tolerance scoring is checked against the published key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPACITIES, GL_MAX, GL_MIN, GL_POINTS, capacityVerdict, equityRange, toleranceLevel, toleranceScore,
} from '../src/lib/riskprofile.ts';

const ref = JSON.parse(readFileSync(new URL('./fixtures/riskprofile-reference.json', import.meta.url)));

test('capacity verdict and its deciding factors match Python', () => {
  for (const c of ref) {
    const got = capacityVerdict(c.horizon, c.stability, c.margin);
    const label = `horizon ${c.horizon}, ${c.stability}, margin ${c.margin}`;
    assert.equal(got.verdict, c.verdict, label);
    assert.deepEqual(got.factors, c.factors, label);
  }
});

test('tolerance totals run from 13 to 47, as published', () => {
  const lowest = GL_POINTS.map((p) => p.indexOf(Math.min(...p)));
  const highest = GL_POINTS.map((p) => p.indexOf(Math.max(...p)));
  assert.equal(toleranceScore(lowest), GL_MIN);
  assert.equal(toleranceScore(highest), GL_MAX);
});

test('no total while a question is open or an answer does not exist', () => {
  const all = GL_POINTS.map(() => 0);
  assert.equal(toleranceScore([...all.slice(0, 12), null]), null);
  assert.equal(toleranceScore([...all.slice(0, 12), 9]), null);
});

test('tolerance bands: 18, 22, 28 and 32 are the upper ends', () => {
  assert.deepEqual([13, 18, 19, 22, 23, 28, 29, 32, 33, 47].map(toleranceLevel),
    [0, 0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('the equity range is 20 points wide, rises with both, and capacity caps it', () => {
  for (const c of CAPACITIES) {
    for (let level = 0; level <= 4; level++) {
      const [lo, hi] = equityRange(level, c);
      assert.equal(hi - lo, 20);
      assert.ok(lo >= 0 && hi <= 100);
      if (level > 0) assert.ok(hi >= equityRange(level - 1, c)[1]);
    }
  }
  assert.deepEqual(equityRange(4, 'ruim'), [80, 100]);
  assert.deepEqual(equityRange(4, 'gemiddeld'), [60, 80]);
  assert.deepEqual(equityRange(4, 'beperkt'), [20, 40]);
  assert.deepEqual(equityRange(0, 'ruim'), [0, 20]);
});
