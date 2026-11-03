// Tailwind finder: how much of the forecast wind pushes you along a road.
// Pure functions, so the page and tests/tailwind.test.mjs share them.

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** Initial great-circle bearing from a to b ([lat, lon]), in degrees. */
export function bearing(a, b) {
  const p1 = rad(a[0]);
  const p2 = rad(b[0]);
  const dl = rad(b[1] - a[1]);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Metres between two points. */
export function metres(a, b) {
  const p1 = rad(a[0]);
  const p2 = rad(b[0]);
  const h =
    Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(rad(b[1] - a[1]) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

const NAMES = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
export const compass = (d) => NAMES[Math.round((((d % 360) + 360) % 360) / 22.5) % 16];

/** The road split into straight pieces, each with its direction and length. */
export function pieces(points) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const m = metres(points[i], points[i + 1]);
    if (m > 0) out.push({ bearing: bearing(points[i], points[i + 1]), metres: m });
  }
  return out;
}

/**
 * Length-weighted mean direction, total distance, and straightness
 * (1 = a ruler; below about 0.8 one direction is a rough summary).
 */
export function summarise(points) {
  const ps = pieces(points);
  let x = 0;
  let y = 0;
  let total = 0;
  for (const p of ps) {
    x += p.metres * Math.cos(rad(p.bearing));
    y += p.metres * Math.sin(rad(p.bearing));
    total += p.metres;
  }
  const mean = (deg(Math.atan2(y, x)) + 360) % 360;
  const aligned = ps.reduce((s, p) => s + p.metres * Math.cos(rad(p.bearing - mean)), 0);
  return { bearing: mean, distance: total, straightness: total ? aligned / total : 0 };
}

/**
 * Tail- and crosswind along the road for wind of `speed` blowing FROM
 * `from` degrees. Scored piece by piece, weighted by length, so a bend into
 * the wind counts for what it costs. Positive tail pushes you along.
 */
export function wind(points, speed, from) {
  let tail = 0;
  let cross = 0;
  let total = 0;
  for (const p of pieces(points)) {
    const d = rad(from - p.bearing);
    tail += p.metres * -speed * Math.cos(d);
    cross += p.metres * Math.abs(speed * Math.sin(d));
    total += p.metres;
  }
  return total ? { tail: tail / total, cross: cross / total } : { tail: 0, cross: 0 };
}

export function forecastUrl(lat, lon, days = 3) {
  const q = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: String(days),
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** One row per forecast hour from `now` on: the road's tail- and crosswind. */
export function hourly(points, forecast, now) {
  const h = forecast.hourly;
  const rows = [];
  h.time.forEach((sec, i) => {
    const t = sec * 1000;
    if (t + 3_600_000 <= now) return; // this hour is over
    const speed = h.wind_speed_10m[i];
    const from = h.wind_direction_10m[i];
    if (typeof speed !== 'number' || typeof from !== 'number') return;
    rows.push({ t, speed, from, gust: h.wind_gusts_10m[i], ...wind(points, speed, from) });
  });
  return rows;
}

/** Consecutive hours with at least `min` km/h of tailwind, as windows. */
export function windows(rows, min) {
  const out = [];
  for (const r of rows) {
    if (r.tail < min) continue;
    const last = out[out.length - 1];
    if (last && r.t === last.end) {
      last.rows.push(r);
      last.end = r.t + 3_600_000;
    } else {
      out.push({ start: r.t, end: r.t + 3_600_000, rows: [r] });
    }
  }
  return out;
}
