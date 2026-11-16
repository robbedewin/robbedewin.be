// The calculators' shareable links.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readQuery, writeQuery } from '../src/lib/url-state.ts';

const defaults = { prijs: 400000, rente: 3.4, enige: true, gewest: 'VL', mix: '80', notaris: null };
const choices = { gewest: ['VL', 'WA', 'BR'], mix: ['100', '80', '60'] };

test('only what differs from the defaults is written', () => {
  assert.equal(writeQuery({ ...defaults }, defaults), '');
  assert.equal(writeQuery({ ...defaults, rente: 2.9, enige: false, notaris: 5000 }, defaults), 'rente=2.9&enige=0&notaris=5000');
});

test('a written link reads back to the same state', () => {
  const state = { ...defaults, prijs: 350000, gewest: 'BR', mix: '60', enige: false, notaris: 4200 };
  assert.deepEqual({ ...defaults, ...readQuery(writeQuery(state, defaults), defaults, choices) }, state);
});

test('values that do not fit their key are left out', () => {
  assert.deepEqual(readQuery('?rente=abc&gewest=NL&mix=75&prijs=&onbekend=1', defaults, choices), {});
  assert.deepEqual(readQuery('?enige=1&rente=-1', defaults, choices), { enige: true, rente: -1 });
});
