import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearing, compass, hourly, summarise, wind, windows } from '../src/lib/tailwind.js';

const close = (a, b, eps = 0.5) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`);
const HOUR = 3_600_000;

test('bearing between two points', () => {
  close(bearing([50.8798, 4.7005], [50.885, 4.71]), 48.9);
  assert.equal(compass(48.9), 'NE');
  assert.equal(compass(359), 'N');
});

test('wind from behind is all tailwind, from the side all crosswind', () => {
  const south = [[50.01, 4], [50, 4]];
  const fromNorth = wind(south, 20, 0);
  close(fromNorth.tail, 20);
  close(fromNorth.cross, 0);
  const fromEast = wind(south, 20, 90);
  close(fromEast.tail, 0);
  close(fromEast.cross, 20);
  close(wind(south, 20, 180).tail, -20); // a headwind is negative
});

test('a bend is scored piece by piece, not by its average direction', () => {
  // Equal halves east then north, wind from the west.
  const bend = [[50, 4], [50, 4.014], [50.009, 4.014]];
  close(summarise(bend).bearing, 45, 1);
  const w = wind(bend, 20, 270);
  close(w.tail, 10); // one averaged NE direction would claim ~14
  close(w.cross, 10);
  assert.ok(summarise(bend).straightness < 0.8);
});

test('hourly rows skip hours that are over; windows join consecutive good hours', () => {
  const start = Date.UTC(2026, 10, 4, 8);
  const time = [0, 1, 2, 3, 4, 5].map((h) => (start + h * HOUR) / 1000);
  const fc = {
    hourly: {
      time,
      wind_speed_10m: [30, 30, 30, 5, 30, 30],
      wind_direction_10m: time.map(() => 0),
      wind_gusts_10m: time.map(() => 40),
    },
  };
  const rows = hourly([[50.01, 4], [50, 4]], fc, start + 1.5 * HOUR);
  assert.equal(rows.length, 5); // 08:00 is over, 09:00 is still running
  const found = windows(rows, 15);
  assert.deepEqual(found.map((w) => [w.start, w.end]), [
    [start + HOUR, start + 3 * HOUR],
    [start + 4 * HOUR, start + 6 * HOUR],
  ]);
});
