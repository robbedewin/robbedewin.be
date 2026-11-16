// Amounts and percentages the Belgian way, for the calculators' text.
const eurFmt = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurShortFmt = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });

/** Whole euros, with a point between thousands. */
export const eur = (v: number) => eurFmt.format(Math.round(v));
/** Short, for chart axes (thousands as K, millions as mln.). */
export const eurShort = (v: number) => eurShortFmt.format(v);
/** A fraction as a percentage: pct(0.034) is "3,4 %". */
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits).replace('.', ',')} %`;
