// The calculators' number fields read Belgian and English notation alike.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, parseNumber } from '../src/lib/parse-number.ts';

test('decimal comma and decimal point', () => {
  assert.equal(parseNumber('3,4'), 3.4);
  assert.equal(parseNumber('3.4'), 3.4);
  assert.equal(parseNumber('0,125'), 0.125);
  assert.equal(parseNumber('0.125'), 0.125);
  assert.equal(parseNumber(',5'), 0.5);
  assert.equal(parseNumber('3,'), 3);
});

test('thousands separators', () => {
  assert.equal(parseNumber('400.000'), 400000);
  assert.equal(parseNumber('1.250.000'), 1250000);
  assert.equal(parseNumber('400 000'), 400000);
  assert.equal(parseNumber('400 000'), 400000);
  assert.equal(parseNumber('1.234,5'), 1234.5);
  assert.equal(parseNumber('1,234.5'), 1234.5);
  assert.equal(parseNumber('1,250,000'), 1250000);
});

test('signs, empty and nonsense', () => {
  assert.equal(parseNumber('-1,5'), -1.5);
  assert.equal(parseNumber('−1,5'), -1.5);
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('  '), null);
  assert.equal(parseNumber('-'), null);
  assert.ok(Number.isNaN(parseNumber('abc')));
  assert.ok(Number.isNaN(parseNumber('3,4,5')));
  assert.ok(Number.isNaN(parseNumber('1-2')));
});

test('shown the Belgian way, and read back unchanged', () => {
  for (const v of [400000, 3.4, 0.125, 1250000.5, -2, 0]) {
    assert.equal(parseNumber(formatNumber(v)), v, `round trip ${v} via "${formatNumber(v)}"`);
  }
  assert.equal(formatNumber(null), '');
});
