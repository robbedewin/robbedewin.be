<script lang="ts">
  import '../../styles/tools.css';
  import { eur, eurShort, pct } from './format.nl.ts';
  import { copyText, readQuery, writeQuery } from '../../lib/url-state.ts';
  import { onMount } from 'svelte';
  import { breakEven, projectCashflows, type RentBuyInputs } from '../../lib/be/rentbuy.ts';
  import { owningCost } from '../../lib/be/owning.ts';
  import { creditDeedCost, LAST_VERIFIED, notaryFeePurchase, registrationRule, type Region } from '../../lib/be/realestate.ts';
  import Info from './Info.svelte';
  import LineChart from './LineChart.svelte';
  import NumField from './NumField.svelte';
  import { t } from './huren-of-kopen.nl.ts';
  import ReturnsFields from './ReturnsFields.svelte';
  import { defaultReturns, DEFAULT_FEE_PCT, DEFAULT_MIX, MIXES, portfolioReturnPct } from '../../lib/returns.ts';
  import { PENSION_CONSTANTS } from '../../lib/be/pensiontax.ts';

  // Percentages are held the way they are typed (3.4 for 3,4 %). The keys
  // double as the names in the shareable link.

  const DEFAULTS = {
    gewest: 'VL' as Region,
    // The registration rate in %, only when typed over the region's own.
    reg: null as number | null,
    // The notary cost in euro, only when typed over the fee scale's figure.
    notaris: null as number | null,
    // The credit-deed cost in euro, only when typed over the scale's figure.
    krediet: null as number | null,
    horizon: 30,
    prijs: 400000,
    inbreng: 20,
    rente: 3.4,
    looptijd: 25,
    enige: true,
    kernstad: false,
    ov: 0.3,
    onderhoud: 1,
    verzekering: 0.1,
    // Yearly rise of property tax, maintenance and insurance, in %.
    kostengroei: 2,
    groei: 3,
    verkoop: 3,
    huur: 1300,
    index: 2,
    // Share of equities in the portfolio, in %.
    mix: DEFAULT_MIX as string,
    // Nominal returns in %, only when typed over the long-run default.
    aandelen: null as number | null,
    obligaties: null as number | null,
    kosten: DEFAULT_FEE_PCT,
    // Capital-gains tax on what is invested: rate in %, yearly exemption in euro.
    mwb: PENSION_CONSTANTS.meerwaardebelasting.tarief * 100,
    vrijstelling: PENSION_CONSTANTS.meerwaardebelasting.vrijstelling_eur,
    inflatie: 2,
    reeel: true,
  };
  type Key = keyof typeof DEFAULTS;

  let s = $state<Record<Key, any>>({ ...DEFAULTS });
  let tab = $state<'vermogen' | 'kosten' | 'tabel'>('vermogen');
  let ready = $state(false);
  let copied = $state(false);

  // An empty or half-typed field counts as its lowest allowed value.
  const num = (v: unknown, lo: number, hi: number) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) ? Math.min(Math.max(x, lo), hi) : lo;
  };

  const horizon = $derived(Math.round(num(s.horizon, 1, 50)));
  const inflation = $derived(num(s.inflatie, 0, 15) / 100);
  // The portfolio's return is the weighted average of its two parts.
  // The portfolio's return: the weighted mix, minus costs.
  const returnPct = $derived.by(() => {
    const d = defaultReturns(inflation * 100);
    return portfolioReturnPct(
      s.mix,
      s.aandelen === null || s.aandelen === undefined ? d.equity : num(s.aandelen, -10, 20),
      s.obligaties === null || s.obligaties === undefined ? d.bonds : num(s.obligaties, -10, 20),
      num(s.kosten, 0, 5),
    );
  });
  const inputs = $derived<RentBuyInputs>({
    price: num(s.prijs, 10_000, 100_000_000),
    monthlyRent: num(s.huur, 0, 1_000_000),
    mortgageRate: num(s.rente, 0, 20) / 100,
    downPaymentPct: num(s.inbreng, 0, 100) / 100,
    investmentReturn: returnPct / 100,
    capitalGainsRate: num(s.mwb, 0, 50) / 100,
    capitalGainsExemption: num(s.vrijstelling, 0, 1e7),
    exemptionGrowth: inflation,
    propertyTaxPct: num(s.ov, 0, 5) / 100,
    maintenancePct: num(s.onderhoud, 0, 10) / 100,
    insurancePct: num(s.verzekering, 0, 5) / 100,
    costGrowthPct: num(s.kostengroei, -5, 15) / 100,
    mortgageTermYears: Math.round(num(s.looptijd, 1, 40)),
    horizonYears: horizon,
    houseGrowthPct: num(s.groei, -10, 15) / 100,
    rentGrowthPct: num(s.index, -5, 15) / 100,
    sellingCostPct: num(s.verkoop, 0, 20) / 100,
    region: s.gewest,
    soleOwnHome: s.enige,
    kernstad: s.gewest === 'VL' && s.kernstad,
    registrationRate: s.reg === null || s.reg === undefined ? undefined : num(s.reg, 0, 25) / 100,
    notaryFee: s.notaris === null || s.notaris === undefined ? undefined : num(s.notaris, 0, 1_000_000),
    creditDeed: s.krediet === null || s.krediet === undefined ? undefined : num(s.krediet, 0, 1_000_000),
  });
  const regRule = $derived(
    registrationRule(inputs.price, {
      region: inputs.region,
      soleOwnHome: inputs.soleOwnHome,
      kernstad: inputs.kernstad,
    }),
  );
  const notaryDefault = $derived(Math.round(notaryFeePurchase(inputs.price)));
  const creditDefault = $derived(Math.round(creditDeedCost(inputs.price * (1 - inputs.downPaymentPct), inputs.soleOwnHome)));
  const regDefault = $derived(Math.round(regRule.rate * 10000) / 100);
  const res = $derived(projectCashflows(inputs));
  // Where the outcome tips: each of three inputs at which buying and renting
  // end level, the others as they are.
  const tipping = $derived({
    rent: breakEven(inputs, 'monthlyRent', 0, (inputs.price * 0.15) / 12),
    ret: breakEven(inputs, 'investmentReturn', -0.05, 0.25),
    growth: breakEven(inputs, 'houseGrowthPct', -0.08, 0.15),
  });
  // The yearly cost of owning in today's euros (PWL's framing), with the
  // page's returns and growth taken above inflation.
  const owning = $derived(
    owningCost({
      value: inputs.price,
      rentMonthly: inputs.monthlyRent,
      propertyTaxPct: inputs.propertyTaxPct,
      maintenancePct: inputs.maintenancePct,
      insurancePct: inputs.insurancePct,
      downPaymentPct: inputs.downPaymentPct,
      mortgageRate: inputs.mortgageRate,
      inflation,
      realReturn: (1 + inputs.investmentReturn) / (1 + inflation) - 1,
      purchaseCosts: res.upfrontCosts,
      years: horizon,
      realGrowth: (1 + inputs.houseGrowthPct) / (1 + inflation) - 1,
    }),
  );

  // The engine works in the euros of each year; "today's euros" divides each
  // year by the inflation up to then. It scales both sides alike, so the
  // verdict does not change.
  const rows = $derived(
    res.schedule.map((r) => {
      const d = s.reeel ? (1 + inflation) ** -r.year : 1;
      return {
        year: r.year,
        buyer: r.buyerNetWorth * d,
        renter: r.renterNetWorth * d,
        owner: r.ownerOutflow * d,
        rent: r.rent * d,
        balance: r.balance * d,
      };
    }),
  );
  const last = $derived(rows[rows.length - 1]);
  const advantage = $derived(last.buyer - last.renter);

  // The first year of the lead that holds until the end of the period.
  const lead = $derived.by(() => {
    const ahead = (i: number) => rows[i].buyer >= rows[i].renter;
    const buyer = ahead(rows.length - 1);
    let since = rows.length;
    while (since > 1 && ahead(since - 2) === buyer) since--;
    return { buyer, since };
  });
  const paidOff = $derived(
    res.loan > 0 && inputs.mortgageTermYears <= horizon
      ? { year: inputs.mortgageTermYears, label: t.chart.paidOff }
      : null,
  );

  // A typed percentage and what it leaves above inflation, for the info texts.
  const aboveInflation = (p: number) => [pct(p / 100), pct(p / 100 - inflation)] as const;

  // The rule behind the registration duty, at the rate in use.
  const ruleText = $derived.by(() => {
    const r = regRule;
    const used = inputs.registrationRate ?? r.rate;
    const rate = pct(used, Number.isInteger(Math.round(used * 10000) / 100) ? 0 : 1);
    if (r.kind === 'enige_woning_bescheiden') return t.upfront.rule[r.kind](rate, eur(r.reduction), eur(r.ceiling ?? 0));
    if (r.kind === 'abattement') return t.upfront.rule[r.kind](rate, eur(r.exempt));
    if (r.kind === 'abattement_te_duur') return t.upfront.rule[r.kind](rate, eur(r.ceiling ?? 0));
    return t.upfront.rule[r.kind](rate);
  });
  const verdictText = $derived(
    res.verdict === 'pariteit'
      ? t.verdict.pariteit(horizon)
      : t.verdict[res.verdict](horizon, eur(Math.abs(advantage))),
  );
  const leadText = $derived(
    lead.since === 1
      ? lead.buyer ? t.verdict.buyerAlways : t.verdict.renterAlways
      : lead.buyer ? t.verdict.buyerSince(lead.since) : t.verdict.renterSince(lead.since),
  );

  // Shareable link: only the values that differ from the defaults.
  onMount(() => {
    Object.assign(s, readQuery(location.search, DEFAULTS, { mix: MIXES, gewest: ['VL', 'WA', 'BR'] }));
    ready = true;
  });
  $effect(() => {
    const q = writeQuery(s, DEFAULTS);
    if (ready) history.replaceState(null, '', q ? `?${q}` : location.pathname);
  });
  async function copyLink() {
    // No clipboard access: the address bar already holds the link.
    if (await copyText(location.href)) {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }
  const reset = () => { s = { ...DEFAULTS }; };

  const TABS = ['vermogen', 'kosten', 'tabel'] as const;
  const years = $derived(rows.map((r) => r.year));
  const unitNote = $derived(s.reeel ? t.tiles.real : t.tiles.nominal);
</script>

<div class="calc">
  <div class="calc__main">
    <dl class="tiles">
      <div>
        <dt>{t.tiles.buyer(horizon)}</dt>
        <dd>{eur(last.buyer)}</dd>
        <dd class="sub">{unitNote}</dd>
      </div>
      <div>
        <dt>{t.tiles.renter(horizon)}</dt>
        <dd>{eur(last.renter)}</dd>
        <dd class="sub">{unitNote}</dd>
      </div>
      <div>
        <dt>{t.tiles.advantage}</dt>
        <dd class="accent">{eur(Math.abs(advantage))}</dd>
        <dd class="sub">{advantage >= 0 ? t.tiles.advantageBuy : t.tiles.advantageRent}</dd>
      </div>
      <div>
        <dt>{t.tiles.ratio}</dt>
        <dd>{pct((inputs.monthlyRent * 12) / inputs.price)}</dd>
        <dd class="sub">{t.tiles.ratioSub(eur(res.monthlyPayment))}</dd>
      </div>
    </dl>

    <p class="verdict" aria-live="polite">{verdictText} {leadText}</p>

    <section class="card">
      <div class="tabs" role="tablist" aria-label={t.title}>
        {#each TABS as name}
          <button
            type="button"
            role="tab"
            id="tab-{name}"
            aria-selected={tab === name}
            aria-controls="tabpanel"
            onclick={() => (tab = name)}
          >{t.tabs[name]}</button>
        {/each}
      </div>
      <div id="tabpanel" role="tabpanel" aria-labelledby="tab-{tab}">
        {#if tab === 'vermogen'}
          <LineChart
            {years}
            series={[
              { label: t.chart.buyer, values: rows.map((r) => r.buyer), tone: 'a' },
              { label: t.chart.renter, values: rows.map((r) => r.renter), tone: 'b' },
            ]}
            label={t.chart.vermogenLabel}
            hint={t.chart.hint}
            format={eur}
            formatShort={eurShort}
            yearLabel={t.chart.year}
            marker={paidOff}
          />
        {:else if tab === 'kosten'}
          <LineChart
            {years}
            series={[
              { label: t.chart.owner, values: rows.map((r) => r.owner), tone: 'a' },
              { label: t.chart.rent, values: rows.map((r) => r.rent), tone: 'b' },
            ]}
            label={t.chart.kostenLabel}
            hint={t.chart.hint}
            format={eur}
            formatShort={eurShort}
            yearLabel={t.chart.year}
            marker={paidOff}
          />
        {:else}
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.table.year}</th>
                  <th>{t.table.rent}</th>
                  <th>{t.table.owner}</th>
                  <th>{t.table.balance}</th>
                  <th>{t.table.buyer}</th>
                  <th>{t.table.renter}</th>
                </tr>
              </thead>
              <tbody>
                {#each rows as r}
                  <tr>
                    <td>{r.year}</td>
                    <td>{eur(r.rent)}</td>
                    <td>{eur(r.owner)}</td>
                    <td>{eur(r.balance)}</td>
                    <td>{eur(r.buyer)}</td>
                    <td>{eur(r.renter)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        <p class="unit">{unitNote}</p>
      </div>
    </section>

    <div class="cards">
      <section class="card">
        <h2>{t.upfront.title}</h2>
        <dl class="list">
          <div><dt>{t.upfront.down}</dt><dd>{eur(res.downPayment)}</dd></div>
          <div>
            <dt>{t.upfront.registration} <Info text={`${t.fields.gewesten[inputs.region]}: ${ruleText}`} /></dt>
            <dd>{eur(res.registrationDuties)}</dd>
          </div>
          <div><dt>{t.upfront.notary}</dt><dd>{eur(res.notaryFee)}</dd></div>
          {#if res.creditDeed > 0}
            <div><dt>{t.upfront.creditDeed}</dt><dd>{eur(res.creditDeed)}</dd></div>
          {/if}
          <div class="total"><dt>{t.upfront.total}</dt><dd>{eur(res.downPayment + res.upfrontCosts)}</dd></div>
        </dl>
      </section>
      <section class="card">
        <h2>{t.upfront.loanTitle}</h2>
        <dl class="list">
          <div><dt>{t.upfront.loan}</dt><dd>{eur(res.loan)}</dd></div>
          <div><dt>{t.upfront.payment}</dt><dd>{eur(res.monthlyPayment)}</dd></div>
          <div>
            <dt>{t.upfront.interest}</dt>
            <dd>{eur(Math.max(res.monthlyPayment * inputs.mortgageTermYears * 12 - res.loan, 0))}</dd>
          </div>
        </dl>
      </section>
      <section class="card">
        <h2>{t.tipping.title} <Info text={t.tipping.info(horizon)} /></h2>
        <dl class="list">
          <div>
            <dt>{t.tipping.rent} <span class="now">{t.tipping.now(eur(inputs.monthlyRent))}</span></dt>
            <dd>{tipping.rent === null ? t.tipping.none : eur(tipping.rent)}</dd>
          </div>
          <div>
            <dt>{t.tipping.ret} <span class="now">{t.tipping.now(pct(inputs.investmentReturn))}</span></dt>
            <dd>{tipping.ret === null ? t.tipping.none : pct(tipping.ret, 2)}</dd>
          </div>
          <div>
            <dt>{t.tipping.growth} <span class="now">{t.tipping.now(pct(inputs.houseGrowthPct))}</span></dt>
            <dd>{tipping.growth === null ? t.tipping.none : pct(tipping.growth, 2)}</dd>
          </div>
        </dl>
      </section>
      <section class="card">
        <h2>{t.owning.title} <Info text={t.owning.info} /></h2>
        <dl class="list">
          <div><dt>{t.owning.propertyTax}</dt><dd>{eur(owning.propertyTax)}</dd></div>
          <div><dt>{t.owning.maintenance}</dt><dd>{eur(owning.maintenance)}</dd></div>
          {#if owning.insurance}<div><dt>{t.owning.insurance}</dt><dd>{eur(owning.insurance)}</dd></div>{/if}
          <div><dt>{t.owning.debt}</dt><dd>{eur(owning.debtCost)}</dd></div>
          <div><dt>{t.owning.equity}</dt><dd>{eur(owning.equityCost)}</dd></div>
          <div><dt>{t.owning.purchase(horizon)}</dt><dd>{eur(owning.purchasePerYear)}</dd></div>
          <div><dt>{t.owning.growth}</dt><dd>{eur(-owning.growth)}</dd></div>
          <div class="total"><dt>{t.owning.total}</dt><dd>{eur(owning.total)}</dd></div>
          <div><dt>{t.owning.rent}</dt><dd>{eur(owning.rent)}</dd></div>
        </dl>
        <p class="unit">{t.owning.note}</p>
      </section>
    </div>

    <div class="below">
      <details class="about">
        <summary>{t.notes.title}</summary>
        <p>{t.notes.how}</p>
        <ul>
          {#each t.notes.items as item}<li>{item}</li>{/each}
        </ul>
        <p>{t.notes.verified(LAST_VERIFIED)}</p>
        <p>
          {t.notes.engine}
          <a href="/projects/financial-planning-engine">{t.notes.engineLink}</a>
          {t.notes.engineTail}
        </p>
      </details>
      <p class="disclaimer">{t.notes.disclaimer}</p>
    </div>
  </div>

  <form class="panel" aria-label={t.panel.title} onsubmit={(e) => e.preventDefault()}>
    <div class="panel__head">
      <h2>{t.panel.title}</h2>
      <div class="panel__actions">
        <button type="button" class="link" onclick={reset}>{t.panel.reset}</button>
        <button type="button" class="link" onclick={copyLink}>
          <span aria-live="polite">{copied ? t.panel.copied : t.panel.copy}</span>
        </button>
      </div>
    </div>

    <details open>
      <summary>{t.panel.general}</summary>
      <fieldset class="field">
        <legend>{t.fields.gewest}</legend>
        <div class="segmented">
          {#each ['VL', 'WA', 'BR'] as const as g}
            <input type="radio" id="gewest-{g}" name="gewest" value={g} bind:group={s.gewest} onchange={() => (s.reg = null)} />
            <label for="gewest-{g}">{t.fields.gewesten[g]}</label>
          {/each}
        </div>
      </fieldset>
      <NumField
        id="reg"
        label={t.fields.reg}
        bind:value={() => s.reg ?? regDefault, (v) => (s.reg = v === regDefault ? null : v)}
        unit="%"
        step={0.5}
        max={25}
        info={s.gewest === 'VL' && s.enige ? `${t.fields.regInfo} ${t.fields.regVL2027}` : t.fields.regInfo}
      />
      <div class="field">
        <label for="horizon">{t.fields.horizon} <output>{horizon} {t.fields.horizonUnit}</output></label>
        <input id="horizon" type="range" min="1" max="50" step="1" bind:value={s.horizon} />
      </div>
    </details>

    <details open>
      <summary>{t.panel.buy}</summary>
      <NumField
        id="prijs"
        label={t.fields.prijs}
        bind:value={() => s.prijs, (v) => { s.prijs = v; s.notaris = null; s.krediet = null; }}
        unit="€"
        step={5000}
      />
      <NumField
        id="notaris"
        label={t.fields.notaris}
        bind:value={() => s.notaris ?? notaryDefault, (v) => (s.notaris = v === notaryDefault ? null : v)}
        unit="€"
        step={100}
        info={t.fields.notarisInfo}
      />
      <NumField id="inbreng" label={t.fields.inbreng} bind:value={() => s.inbreng, (v) => { s.inbreng = v; s.krediet = null; }} unit="%" max={100} info={t.fields.inbrengInfo} />
      {#if res.loan > 0}
        <NumField
          id="krediet"
          label={t.fields.krediet}
          bind:value={() => s.krediet ?? creditDefault, (v) => (s.krediet = v === creditDefault ? null : v)}
          unit="€"
          step={100}
          info={t.fields.kredietInfo}
        />
      {/if}
      <NumField id="rente" label={t.fields.rente} bind:value={s.rente} unit="%" step={0.1} />
      <NumField id="looptijd" label={t.fields.looptijd} bind:value={s.looptijd} unit={t.fields.horizonUnit} min={1} max={40} />
      <div class="checkrow">
        <label class="check" for="enige">
          <input id="enige" type="checkbox" bind:checked={s.enige} onchange={() => { s.reg = null; s.krediet = null; }} />
          {t.fields.enige}
        </label>
        <Info text={t.fields.enigeInfo} />
      </div>
      {#if s.gewest === 'VL' && s.enige}
        <div class="checkrow">
          <label class="check" for="kernstad">
            <input id="kernstad" type="checkbox" bind:checked={s.kernstad} />
            {t.fields.kernstad}
          </label>
          <Info text={t.fields.kernstadInfo} />
        </div>
      {/if}
      <NumField id="ov" label={t.fields.ov} bind:value={s.ov} unit="%" step={0.05} info={t.fields.ovInfo} />
      <NumField id="onderhoud" label={t.fields.onderhoud} bind:value={s.onderhoud} unit="%" step={0.1} info={t.fields.costInfo} />
      <NumField id="verzekering" label={t.fields.verzekering} bind:value={s.verzekering} unit="%" step={0.05} info={t.fields.costInfo} />
      <NumField id="kostengroei" label={t.fields.kostengroei} bind:value={s.kostengroei} unit="%" step={0.1} min={-5} info={t.fields.kostengroeiInfo} />
      <NumField id="groei" label={t.fields.groei} bind:value={s.groei} unit="%" step={0.1} min={-10} info={t.fields.groeiInfo(...aboveInflation(inputs.houseGrowthPct * 100))} />
      <NumField id="verkoop" label={t.fields.verkoop} bind:value={s.verkoop} unit="%" step={0.5} info={t.fields.verkoopInfo} />
    </details>

    <details open>
      <summary>{t.panel.rent}</summary>
      <NumField id="huur" label={t.fields.huur} bind:value={s.huur} unit="€" step={50} />
      <NumField id="index" label={t.fields.index} bind:value={s.index} unit="%" step={0.1} min={-5} info={t.fields.indexInfo} />
    </details>

    <details open>
      <summary>{t.panel.invest}</summary>
      <ReturnsFields
        bind:mix={s.mix}
        bind:equity={s.aandelen}
        bind:bonds={s.obligaties}
        bind:fee={s.kosten}
        inflationPct={inflation * 100}
        mixInfo={t.fields.mixInfo}
      />
      <NumField id="mwb" label={t.fields.mwb} bind:value={s.mwb} unit="%" step={1} max={50} info={t.fields.mwbInfo} />
      <NumField id="vrijstelling" label={t.fields.vrijstelling} bind:value={s.vrijstelling} unit="€" step={1000} info={t.fields.vrijstellingInfo} />
      <NumField id="inflatie" label={t.fields.inflatie} bind:value={s.inflatie} unit="%" step={0.1} info={t.fields.inflatieInfo} />
      <label class="check" for="reeel">
        <input id="reeel" type="checkbox" bind:checked={s.reeel} />
        {t.fields.reeel}
      </label>
    </details>
  </form>
</div>
