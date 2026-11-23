// A calculator's assumptions in its address, so a result can be bookmarked
// or sent on. Only the values that differ from the defaults are written.
// A default of null means "follow the page's own figure" and is not written.
//
// They live after the #, because a browser never sends that part to the
// server: amounts in a ?query would reach the host's logs on every page load.

export type State = Record<string, unknown>;
/** Keys that only take one of a few strings (a select, a segmented control). */
export type Choices = Record<string, readonly string[]>;

/** The state in an address: its #fragment, or the ?query of a link made
 *  before the state moved to the fragment. A plain #anchor holds no state. */
export function linkQuery(hash: string, search: string): string {
  const fragment = hash.replace(/^#/, '');
  return fragment.includes('=') ? fragment : search;
}

/** The address for a state; it drops any old ?query. */
export function linkPath(pathname: string, query: string): string {
  return query ? `${pathname}#${query}` : pathname;
}

export function writeQuery(state: State, defaults: State): string {
  const q = new URLSearchParams();
  for (const k of Object.keys(defaults)) {
    const v = state[k];
    if (v === defaults[k] || v === null || v === undefined || v === '') continue;
    q.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
  return q.toString();
}

/** The values in `search` that fit their key; anything else is left out. */
export function readQuery(search: string, defaults: State, choices: Choices = {}): State {
  const q = new URLSearchParams(search);
  const out: State = {};
  for (const k of Object.keys(defaults)) {
    const raw = q.get(k);
    if (raw === null) continue;
    if (typeof defaults[k] === 'boolean') out[k] = raw === '1';
    else if (k in choices) { if (choices[k].includes(raw)) out[k] = raw; }
    else if (raw !== '' && Number.isFinite(Number(raw))) out[k] = Number(raw);
  }
  return out;
}

/** Copy `text`; false when the browser gives no clipboard access. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
