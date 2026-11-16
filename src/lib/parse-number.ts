// Numbers as people in Belgium type them. A decimal comma ("3,4") and a
// decimal point ("3.4") both work; a point or space between groups of three
// digits ("400.000", "400 000") separates thousands. With both a point and a
// comma, the last of the two is the decimal mark ("1.234,5", "1,234.5").

/** The number in `text`; null when empty, NaN when it is not a number. */
export function parseNumber(text: string): number | null {
  let s = text.trim().replace(/[\s  ']/g, '').replace(/^[−–]/, '-');
  if (s === '' || s === '-') return null;
  const comma = s.lastIndexOf(',');
  const point = s.lastIndexOf('.');
  if (comma >= 0 && point >= 0) {
    const [group, dec] = comma > point ? ['.', ','] : [',', '.'];
    s = s.split(group).join('').replace(dec, '.');
  } else if (comma >= 0) {
    s = /^-?\d{1,3}(,\d{3}){2,}$/.test(s) ? s.split(',').join('') : s.replace(',', '.');
  } else if (point >= 0 && /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) {
    // "400.000" is four hundred thousand; "0.125" and "3.4" stay decimals.
    s = s.split('.').join('');
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

const shown = new Intl.NumberFormat('nl-BE', { maximumFractionDigits: 4 });

/** How a field shows a number: "400.000", "3,4". */
export function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? shown.format(value) : '';
}
