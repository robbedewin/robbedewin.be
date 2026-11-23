<script lang="ts">
  import '../../styles/tools.css';
  import { eur, eurShort, pct } from './format.nl.ts';
  import { copyText, linkPath, linkQuery, readQuery, writeQuery } from '../../lib/url-state.ts';
  import { onMount } from 'svelte';
  import { legalPensionAge, leviesPillar2, PENSION_CONSTANTS } from '../../lib/be/pensiontax.ts';
  import { projectRetirement, sustainableSpending, type RetirementInputs } from '../../lib/be/retirement.ts';
  import { deviationPaths, simulateRetirement, sustainableSpendingMc } from '../../lib/be/retirement-mc.ts';
  import Info from './Info.svelte';
  import LineChart from './LineChart.svelte';
  import NumField from './NumField.svelte';
  import { t } from './pensioen.nl.ts';
  import ReturnsFields from './ReturnsFields.svelte';
  import { defaultReturns, DEFAULT_FEE_PCT, DEFAULT_MIX, MIXES, portfolioReturnPct } from '../../lib/returns.ts';

  const C = PENSION_CONSTANTS;

  // Percentages are held the way they are typed. The keys double as the
  // names in the shareable link.
  const DEFAULTS = {
    leeftijd: 35,
    stop: 65,
    tot: 95,
    uitgaven: 2500,
    vermogen: 50000,
    sparen: 500,
    mix: DEFAULT_MIX as string,
    // Nominal returns in %, only when typed over the long-run default.
    aandelen: null as number | null,
    obligaties: null as number | null,
    kosten: DEFAULT_FEE_PCT,
    inflatie: 2,
    reeel: true,
    wettelijk: 1800,
    // The start of the statutory pension, only when typed over the legal age.
    start: null as number | null,
    p2: 20000,
    p2storting: 2000,
    p2rendement: 2,
    ps: 5000,
    psstorting: C.pensioensparen.opties[0].max_premie_eur,
    psrendement: 4,
    mwb: C.meerwaardebelasting.tarief * 100,
    vrijstelling: C.meerwaardebelasting.vrijstelling_eur,
    tob: Math.round(C.tob_etf * 10000) / 100,
  };
  type Key = keyof typeof DEFAULTS;

  let s = $state<Record<Key, any>>({ ...DEFAULTS });
  let tab = $state<'vermogen' | 'opbouw' | 'inkomen' | 'belasting' | 'tabel'>('vermogen');
  let ready = $state(false);
  let copied = $state(false);

  // An empty or half-typed field counts as its lowest allowed value.
  const num = (v: unknown, lo: number, hi: number) => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) ? Math.min(Math.max(x, lo), hi) : lo;
  };

  const age = $derived(Math.round(num(s.leeftijd, 18, 90)));
  const retireAge = $derived(Math.round(num(s.stop, age, 85)));
  const endAge = $derived(Math.round(num(s.tot, Math.max(retireAge, age) + 1, 110)));
  // Born this year minus the age: one year off for a birthday still to come,
  // which only matters right at a boundary year.
  const legalAge = $derived(legalPensionAge(new Date().getFullYear() - age));
  const pensionAge = $derived(s.start === null || s.start === undefined ? legalAge : Math.round(num(s.start, 60, 75)));
  const inflation = $derived(num(s.inflatie, 0, 15) / 100);
  // The free portfolio's return: the weighted mix, minus costs.
  const returnPct = $derived.by(() => {
    const d = defaultReturns(inflation * 100);
    return portfolioReturnPct(
      s.mix,
      s.aandelen === null || s.aandelen === undefined ? d.equity : num(s.aandelen, -10, 20),
      s.obligaties === null || s.obligaties === undefined ? d.bonds : num(s.obligaties, -10, 20),
      num(s.kosten, 0, 5),
    );
  });

  const inputs = $derived<RetirementInputs>({
    age,
    retireAge,
    pensionAge,
    legalPensionAge: legalAge,
    endAge,
    inflation,
    portfolio: num(s.vermogen, 0, 1e9),
    monthlySaving: num(s.sparen, 0, 1e6),
    portfolioReturn: returnPct / 100,
    statePensionMonthly: num(s.wettelijk, 0, 1e5),
    pillar2: num(s.p2, 0, 1e9),
    pillar2Yearly: num(s.p2storting, 0, 1e6),
    pillar2Return: num(s.p2rendement, -5, 15) / 100,
    pensionSavings: num(s.ps, 0, 1e8),
    pensionSavingsYearly: num(s.psstorting, 0, C.pensioensparen.opties[1].max_premie_eur),
    pensionSavingsReturn: num(s.psrendement, -5, 15) / 100,
    spendingMonthly: num(s.uitgaven, 0, 1e6),
    capitalGainsRate: num(s.mwb, 0, 50) / 100,
    capitalGainsExemption: num(s.vrijstelling, 0, 1e7),
    tob: num(s.tob, 0, 5) / 100,
  });
  const res = $derived(projectRetirement(inputs));
  const sustainable = $derived(sustainableSpending(inputs));

  // A thousand futures (src/lib/be/retirement-mc.ts). They take a few tenths
  // of a second, so they run once the inputs have been still for a moment;
  // until then the page shows the last result.
  const PATHS = 1000;
  const equityShare = $derived(Number((MIXES as readonly string[]).includes(s.mix) ? s.mix : DEFAULT_MIX) / 100);
  let mc = $state<{ success: number; safe: number; p10: Float64Array; p90: Float64Array } | null>(null);
  $effect(() => {
    const inp = inputs;
    const share = equityShare;
    const timer = setTimeout(() => {
      const opts = { equityShare: share, paths: PATHS };
      const dev = deviationPaths(share, inp.endAge - inp.age, PATHS);
      const sim = simulateRetirement(inp, opts, dev);
      mc = { success: sim.success, safe: sustainableSpendingMc(inp, opts, 0.9, dev), p10: sim.p10, p90: sim.p90 };
    }, 150);
    return () => clearTimeout(timer);
  });

  // The last result's band, while it still fits the projection (a changed
  // age changes the number of years until the futures have run again).
  const band = $derived(mc && mc.p10.length === res.rows.length ? mc : null);

  // The engine works in the euros of each year. In today's euros a balance
  // is divided by the price level at the end of its year, a flow by the level
  // at the start.
  const rows = $derived(
    res.rows.map((r, i) => {
      const b = s.reeel ? 1 / r.priceEnd : 1;
      const f = s.reeel ? 1 / r.priceStart : 1;
      return {
        age: r.age,
        total: r.total * b,
        p10: (band ? band.p10[i] : 0) * b,
        p90: (band ? band.p90[i] : 0) * b,
        portfolio: r.portfolio * b,
        pillar2: r.pillar2 * b,
        pensionSavings: r.pensionSavings * b,
        saved: r.saved * f,
        spending: r.spending * f,
        statePension: r.statePension * f,
        withdrawal: r.withdrawal * f,
        pillar2Levies: r.pillar2Levies * f,
        pensionSavingsLevy: r.pensionSavingsLevy * f,
        capitalGainsTax: r.capitalGainsTax * f,
        tob: r.tob * f,
        credit: r.pensionSavingsCredit * f,
      };
    }),
  );
  const last = $derived(rows[rows.length - 1]);
  const atRetirement = $derived(res.wealthAtRetirement / (s.reeel ? res.priceAtRetirement : 1));
  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + pick(r), 0);
  const taxes = $derived({
    pillar2: sum((r) => r.pillar2Levies),
    pensionSavings: sum((r) => r.pensionSavingsLevy),
    gains: sum((r) => r.capitalGainsTax),
    tob: sum((r) => r.tob),
    credit: sum((r) => r.credit),
  });
  const pillar2Rate = $derived(leviesPillar2(Math.max(pensionAge, 60), retireAge >= legalAge, legalAge));

  const whole = (x: number) => pct(x, Number.isInteger(Math.round(x * 10000) / 100) ? 0 : 1);

  const verdictText = $derived.by(() => {
    const spending = eur(inputs.spendingMonthly);
    const parts = mc
      ? [t.verdict.chance(spending, endAge, pct(mc.success, 0)), t.verdict.safe(eur(mc.safe), eur(sustainable))]
      : [
          res.depletionAge === null
            ? t.verdict.lasts(spending, endAge, eur(last.total))
            : t.verdict.runsOut(spending, res.depletionAge),
          t.verdict.sustainable(eur(sustainable), endAge),
        ];
    if (retireAge < pensionAge) parts.push(t.verdict.gap(retireAge, pensionAge));
    return parts.join(' ');
  });

  // Shareable link: only the values that differ from the defaults.
  onMount(() => {
    const load = () => {
      s = { ...DEFAULTS, ...readQuery(linkQuery(location.hash, location.search), DEFAULTS, { mix: MIXES }) };
    };
    load();
    ready = true;
    // A link pasted into this same tab changes only the fragment: no reload.
    addEventListener('hashchange', load);
    return () => removeEventListener('hashchange', load);
  });
  $effect(() => {
    const q = writeQuery(s, DEFAULTS);
    if (ready) history.replaceState(null, '', linkPath(location.pathname, q));
  });
  async function copyLink() {
    // No clipboard access: the address bar already holds the link.
    if (await copyText(location.href)) {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }
  const reset = () => { s = { ...DEFAULTS }; };

  const TABS = ['vermogen', 'opbouw', 'inkomen', 'belasting', 'tabel'] as const;
  const ages = $derived(rows.map((r) => r.age));
  const unitNote = $derived(s.reeel ? t.tiles.real : t.tiles.nominal);
  const retireMarker = $derived(retireAge > age ? { year: retireAge, label: t.chart.retire } : null);
  const verified = Object.values(C.last_verified).sort();
</script>

<div class="calc">
  <div class="calc__main">
    <dl class="tiles">
      <div>
        <dt>{t.tiles.atRetirement(retireAge)}</dt>
        <dd>{eur(atRetirement)}</dd>
        <dd class="sub">{t.tiles.atRetirementSub(unitNote)}</dd>
      </div>
      <div>
        <dt>{t.tiles.chance(endAge)}</dt>
        <dd class="accent">{mc ? pct(mc.success, 0) : t.tiles.pending}</dd>
        <dd class="sub">{t.tiles.chanceSub(eur(inputs.spendingMonthly))}</dd>
      </div>
      <div>
        <dt>{t.tiles.safe}</dt>
        <dd>{mc ? eur(mc.safe) : t.tiles.pending}</dd>
        <dd class="sub">{t.tiles.safeSub(endAge)}</dd>
      </div>
      <div>
        <dt>{t.tiles.atEnd(endAge)}</dt>
        <dd>{eur(last.total)}</dd>
        <dd class="sub">{t.tiles.atEndSub(unitNote)}</dd>
      </div>
    </dl>

    <p class="verdict" aria-live="polite">{verdictText}</p>

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
            years={ages}
            series={[{ label: t.chart.expected, values: rows.map((r) => r.total), tone: 'a' }]}
            band={band ? { label: t.chart.band, lo: rows.map((r) => r.p10), hi: rows.map((r) => r.p90) } : null}
            label={t.chart.vermogenLabel}
            hint={t.chart.hint}
            format={eur}
            formatShort={eurShort}
            yearLabel={t.chart.age}
            marker={retireMarker}
          />
        {:else if tab === 'opbouw'}
          <LineChart
            years={ages}
            series={[
              { label: t.chart.portfolio, values: rows.map((r) => r.portfolio), tone: 'a' },
              { label: t.chart.pillar2, values: rows.map((r) => r.pillar2), tone: 'b' },
              { label: t.chart.pensionSavings, values: rows.map((r) => r.pensionSavings), tone: 'c' },
            ]}
            label={t.chart.opbouwLabel}
            hint={t.chart.hint}
            format={eur}
            formatShort={eurShort}
            yearLabel={t.chart.age}
            marker={retireMarker}
          />
        {:else if tab === 'inkomen'}
          <LineChart
            years={ages}
            series={[
              { label: t.chart.spending, values: rows.map((r) => r.spending), tone: 'a' },
              { label: t.chart.statePension, values: rows.map((r) => r.statePension), tone: 'b' },
              { label: t.chart.withdrawal, values: rows.map((r) => r.withdrawal), tone: 'c' },
            ]}
            label={t.chart.inkomenLabel}
            hint={t.chart.hint}
            format={eur}
            formatShort={eurShort}
            yearLabel={t.chart.age}
            marker={retireMarker}
          />
        {:else if tab === 'belasting'}
          <dl class="list">
            <div><dt>{t.tax.pillar2} <Info text={t.tax.pillar2Info(pct(pillar2Rate, 2))} /></dt><dd>{eur(taxes.pillar2)}</dd></div>
            <div><dt>{t.tax.pensionSavings} <Info text={t.tax.pensionSavingsInfo} /></dt><dd>{eur(taxes.pensionSavings)}</dd></div>
            <div><dt>{t.tax.gains} <Info text={t.tax.gainsInfo} /></dt><dd>{eur(taxes.gains)}</dd></div>
            <div><dt>{t.tax.tob} <Info text={t.tax.tobInfo} /></dt><dd>{eur(taxes.tob)}</dd></div>
            <div class="total"><dt>{t.tax.total}</dt><dd>{eur(taxes.pillar2 + taxes.pensionSavings + taxes.gains + taxes.tob)}</dd></div>
            <div><dt>{t.tax.credit} <Info text={t.tax.creditInfo} /></dt><dd>{eur(taxes.credit)}</dd></div>
          </dl>
        {:else}
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t.table.age}</th>
                  <th>{t.table.saved}</th>
                  <th>{t.table.spending}</th>
                  <th>{t.table.statePension}</th>
                  <th>{t.table.withdrawal}</th>
                  <th>{t.table.portfolio}</th>
                  <th>{t.table.pillar2}</th>
                  <th>{t.table.pensionSavings}</th>
                </tr>
              </thead>
              <tbody>
                {#each rows as r}
                  <tr>
                    <td>{r.age}</td>
                    <td>{eur(r.saved)}</td>
                    <td>{eur(r.spending)}</td>
                    <td>{eur(r.statePension)}</td>
                    <td>{eur(r.withdrawal)}</td>
                    <td>{eur(r.portfolio)}</td>
                    <td>{eur(r.pillar2)}</td>
                    <td>{eur(r.pensionSavings)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        <p class="unit">{unitNote}</p>
      </div>
    </section>

    <div class="below">
      <details class="about">
        <summary>{t.notes.title}</summary>
        <p>{t.notes.how}</p>
        <ul>
          {#each t.notes.items as item}<li>{item}</li>{/each}
        </ul>
        <p>{t.notes.verified(`${verified[0]} en ${verified[verified.length - 1]}`)}</p>
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
      <summary>{t.panel.you}</summary>
      <NumField id="leeftijd" label={t.fields.age} bind:value={s.leeftijd} unit={t.fields.unitYear} min={18} max={90} />
      <NumField id="stop" label={t.fields.retireAge} bind:value={s.stop} unit={t.fields.unitYear} min={18} max={85} info={t.fields.retireAgeInfo} />
      <NumField id="tot" label={t.fields.endAge} bind:value={s.tot} unit={t.fields.unitYear} min={50} max={110} info={t.fields.endAgeInfo} />
    </details>

    <details open>
      <summary>{t.panel.spending}</summary>
      <NumField id="uitgaven" label={t.fields.spending} bind:value={s.uitgaven} unit="€" step={100} info={t.fields.spendingInfo} />
    </details>

    <details open>
      <summary>{t.panel.pension}</summary>
      <NumField id="wettelijk" label={t.fields.statePension} bind:value={s.wettelijk} unit="€" step={50} info={t.fields.statePensionInfo} />
      <NumField id="start" label={t.fields.pensionAge} bind:value={() => s.start ?? legalAge, (v) => (s.start = v === legalAge ? null : v)} unit={t.fields.unitYear} min={60} max={75} info={t.fields.pensionAgeInfo(legalAge)} />
    </details>

    <details open>
      <summary>{t.panel.invest}</summary>
      <NumField id="vermogen" label={t.fields.portfolio} bind:value={s.vermogen} unit="€" step={1000} info={t.fields.portfolioInfo} />
      <NumField id="sparen" label={t.fields.saving} bind:value={s.sparen} unit="€" step={50} info={t.fields.savingInfo} />
    </details>

    <details open>
      <summary>{t.panel.pillar2}</summary>
      <NumField id="p2" label={t.fields.pillar2} bind:value={s.p2} unit="€" step={1000} info={t.fields.pillar2Info} />
      <NumField id="p2storting" label={t.fields.pillar2Yearly} bind:value={s.p2storting} unit="€" step={100} info={t.fields.pillar2YearlyInfo} />
      <NumField id="p2rendement" label={t.fields.pillar2Return} bind:value={s.p2rendement} unit="%" step={0.1} min={-5} info={t.fields.pillar2ReturnInfo} />
    </details>

    <details open>
      <summary>{t.panel.pensionSavings}</summary>
      <NumField id="ps" label={t.fields.pensionSavings} bind:value={s.ps} unit="€" step={500} />
      <NumField
        id="psstorting"
        label={t.fields.pensionSavingsYearly}
        bind:value={s.psstorting}
        unit="€"
        step={10}
        max={C.pensioensparen.opties[1].max_premie_eur}
        info={t.fields.pensionSavingsYearlyInfo(
          eur(C.pensioensparen.opties[0].max_premie_eur), whole(C.pensioensparen.opties[0].vermindering),
          eur(C.pensioensparen.opties[1].max_premie_eur), whole(C.pensioensparen.opties[1].vermindering),
        )}
      />
      <NumField id="psrendement" label={t.fields.pensionSavingsReturn} bind:value={s.psrendement} unit="%" step={0.1} min={-5} info={t.fields.pensionSavingsReturnInfo} />
    </details>

    <details open>
      <summary>{t.panel.returns}</summary>
      <ReturnsFields
        bind:mix={s.mix}
        bind:equity={s.aandelen}
        bind:bonds={s.obligaties}
        bind:fee={s.kosten}
        inflationPct={inflation * 100}
        mixInfo={t.fields.mixInfo}
      />
      <NumField id="inflatie" label={t.fields.inflation} bind:value={s.inflatie} unit="%" step={0.1} info={t.fields.inflationInfo} />
      <label class="check" for="reeel">
        <input id="reeel" type="checkbox" bind:checked={s.reeel} />
        {t.fields.real}
      </label>
    </details>

    <details>
      <summary>{t.panel.taxes}</summary>
      <NumField id="mwb" label={t.fields.gainsRate} bind:value={s.mwb} unit="%" step={1} max={50} info={t.fields.gainsInfo} />
      <NumField id="vrijstelling" label={t.fields.gainsExemption} bind:value={s.vrijstelling} unit="€" step={1000} />
      <NumField id="tob" label={t.fields.tob} bind:value={s.tob} unit="%" step={0.01} max={5} info={t.fields.tobInfo} />
    </details>
  </form>
</div>
