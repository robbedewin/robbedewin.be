// Belgian taxes on pension pillars and on a private portfolio. Ports of
// financial_report/shared/be_tax (pensioenpijlers.py, meerwaardebelasting.py),
// with the constants exported by tools/export_pension_data.py and tested
// against the Python in tests/pension.test.mjs.
import constants from '../../data/be-pension.json' with { type: 'json' };

export const PENSION_CONSTANTS = constants;

/** Legal pension age by year of birth (65, 66 or 67). */
export function legalPensionAge(born: number): number {
  const w = constants.wettelijk_pensioen;
  if (born < w.geboren_voor_66) return w.leeftijd_tot_2025;
  if (born < w.geboren_voor_67) return w.leeftijd_2025;
  return w.leeftijd_2030;
}

/** Final tax on second-pillar capital: 10 % only at the legal pension age
 *  for who stayed at work until then; otherwise 16.5 % from 62, 18 % at 61,
 *  20 % at 60. A payout before 60 falls under other rules and is not modelled. */
export function finalTaxPillar2(ageAtPayout: number, activeUntilPension: boolean, legalAge: number): number {
  const eb = constants.pijler2.eindbelasting;
  if (ageAtPayout >= legalAge && activeUntilPension) return eb.wettelijke_pensioenleeftijd_actief;
  if (ageAtPayout >= 62) return eb.age_62;
  if (ageAtPayout === 61) return eb.age_61;
  if (ageAtPayout === 60) return eb.age_60;
  throw new RangeError(`A payout at ${ageAtPayout} is not modelled`);
}

/** All levies on a second-pillar payout: final tax + RIZIV + solidarity. */
export function leviesPillar2(ageAtPayout: number, activeUntilPension: boolean, legalAge: number): number {
  return (
    finalTaxPillar2(ageAtPayout, activeUntilPension, legalAge) +
    constants.pijler2.riziv +
    constants.pijler2.solidariteit_max
  );
}

/** Tax reduction for a pension-savings premium. The raised ceiling carries a
 *  lower rate on the whole premium. */
export function pensionSavingsCredit(premium: number, raisedCeiling: boolean): number {
  const opt = constants.pensioensparen.opties[raisedCeiling ? 1 : 0];
  return Math.min(Math.max(premium, 0), opt.max_premie_eur) * opt.vermindering;
}

/** Capital-gains tax on the gains realised in one year. */
export function capitalGainsTax(gain: number, rate: number, exemption: number): number {
  return gain <= 0 ? 0 : Math.max(gain - exemption, 0) * rate;
}
