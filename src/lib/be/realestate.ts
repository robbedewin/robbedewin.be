// Belgian purchase costs: registration duties, the notary fee and the
// credit deed of the mortgage. A port of financial_report/shared/be_realestate
// (registratierechten.py, notariskosten.py) and shared/be_loans/kredietkosten.py; the constants come from the same source through
// tools/export_rentbuy_data.py. Tested against the Python in
// tests/rentbuy.test.mjs.
import constants from '../../data/be-realestate.json' with { type: 'json' };

export type Region = 'VL' | 'WA' | 'BR';

export interface RegistrationConfig {
  region: Region;
  /** Buying the only home, to live in (the reduced rate or abattement). */
  soleOwnHome: boolean;
  /** Flanders only: kernstad or Vlaamse Rand raises the ceiling of the
   *  reduction for a modest home. */
  kernstad?: boolean;
}

export const LAST_VERIFIED: string = constants.last_verified;

/** Registration duties on a purchase; `price` stands in for the tax base. */
export function registratierechten(price: number, cfg: RegistrationConfig): number {
  const r = constants.registratierechten;
  if (cfg.region === 'VL') {
    const tax = price * (cfg.soleOwnHome ? r.VL.enige_eigen_woning : r.VL.standaard);
    const bw = r.VL.vermindering_bescheiden_woning;
    const ceiling = cfg.kernstad ? bw.max_grondslag_kernstad_eur : bw.max_grondslag_eur;
    return cfg.soleOwnHome && price <= ceiling ? Math.max(tax - bw.bedrag_eur, 0) : tax;
  }
  if (cfg.region === 'WA') {
    return price * (cfg.soleOwnHome ? r.WA.enige_eigen_woning : r.WA.standaard);
  }
  if (cfg.soleOwnHome && price <= r.BR.abattement_max_grondslag_eur) {
    return Math.max(price - Math.min(price, r.BR.abattement_eur), 0) * r.BR.standaard;
  }
  return price * r.BR.standaard;
}

export type RegistrationKind =
  | 'standaard'
  | 'enige_woning'
  | 'enige_woning_bescheiden' // Flanders: reduced rate plus the modest-home reduction
  | 'abattement' // Brussels: the first slice is exempt
  | 'abattement_te_duur'; // Brussels: only home, but above the price ceiling

/** How the duty is built up, for showing it: max(taxed * rate - reduction, 0). */
export interface RegistrationRule {
  kind: RegistrationKind;
  rate: number;
  /** The part of the price the rate applies to. */
  taxed: number;
  /** Flanders: the fixed reduction for a modest home. */
  reduction: number;
  /** The price ceiling that goes with the kind, if any. */
  ceiling: number | null;
  /** Brussels: the exempt first slice. */
  exempt: number;
}

export function registrationRule(price: number, cfg: RegistrationConfig): RegistrationRule {
  const r = constants.registratierechten;
  const base = { taxed: price, reduction: 0, ceiling: null, exempt: 0 };
  if (cfg.region === 'VL') {
    if (!cfg.soleOwnHome) return { ...base, kind: 'standaard', rate: r.VL.standaard };
    const bw = r.VL.vermindering_bescheiden_woning;
    const ceiling = cfg.kernstad ? bw.max_grondslag_kernstad_eur : bw.max_grondslag_eur;
    return price <= ceiling
      ? { ...base, kind: 'enige_woning_bescheiden', rate: r.VL.enige_eigen_woning, reduction: bw.bedrag_eur, ceiling }
      : { ...base, kind: 'enige_woning', rate: r.VL.enige_eigen_woning, ceiling };
  }
  if (cfg.region === 'WA') {
    return cfg.soleOwnHome
      ? { ...base, kind: 'enige_woning', rate: r.WA.enige_eigen_woning }
      : { ...base, kind: 'standaard', rate: r.WA.standaard };
  }
  if (!cfg.soleOwnHome) return { ...base, kind: 'standaard', rate: r.BR.standaard };
  const ceiling = r.BR.abattement_max_grondslag_eur;
  if (price > ceiling) return { ...base, kind: 'abattement_te_duur', rate: r.BR.standaard, ceiling };
  const exempt = Math.min(price, r.BR.abattement_eur);
  return { kind: 'abattement', rate: r.BR.standaard, taxed: price - exempt, reduction: 0, ceiling, exempt };
}

/** Notary cost of a purchase deed: sliding-scale fee + fixed deed costs + VAT. */
export function notaryFeePurchase(price: number): number {
  const n = constants.notaris;
  let fee = 0;
  let remaining = price;
  let lower = 0;
  for (const [upper, rate] of n.schijven as [number | null, number][]) {
    const slice = Math.min(remaining, (upper ?? Infinity) - lower);
    if (slice <= 0) break;
    fee += slice * rate;
    remaining -= slice;
    lower = upper ?? Infinity;
    if (remaining <= 0) break;
  }
  return (fee + n.vaste_kosten_eur) * (1 + n.btw);
}

/** One-off cost of the notarial credit deed of a mortgage on `loan`: 1 %
 *  registration and 0,3 % mortgage duty on the inscribed amount (loan plus
 *  about 10 %), the retributie, the notary fee (schaal Gbis for the only own
 *  home, else G), fixed costs and VAT. Zero without a loan. */
export function creditDeedCost(loan: number, soleOwnHome = true): number {
  if (loan <= 0) return 0;
  const k = constants.kredietakte;
  const inscribed = loan * (1 + k.bijhorigheden);
  const [intercept, rate] = (soleOwnHome ? k.ereloon_gbis : k.ereloon_g) as [number, number];
  const fee = intercept + rate * loan;
  const vatBase = fee + k.administratieve_kosten_eur + k.uitgaven_derden_eur + k.recht_op_geschriften_eur;
  return (
    inscribed * (k.registratierecht + k.hypotheekrecht) +
    k.retributie_eur + k.forfait_bijlagen_eur + vatBase * (1 + k.btw)
  );
}

/** Annuity payment per month; flat repayment at a zero rate. */
export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = annualRate / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - (1 + r) ** -months);
}
