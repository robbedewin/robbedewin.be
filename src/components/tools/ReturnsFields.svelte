<script lang="ts">
  // The portfolio block the calculators share: the mix, the return of
  // equities and of bonds, the yearly costs, and the result after costs.
  // An empty equity or bond return (null) follows the long-run default for
  // the inflation the page uses; a typed figure stays.
  import Info from './Info.svelte';
  import NumField from './NumField.svelte';
  import { common } from './common.nl.ts';
  import { defaultReturns, MIXES, portfolioReturnPct, RETURNS } from '../../lib/returns.ts';

  let {
    mix = $bindable(),
    equity = $bindable(),
    bonds = $bindable(),
    fee = $bindable(),
    inflationPct,
    mixInfo,
  }: {
    mix: string;
    equity: number | null;
    bonds: number | null;
    fee: number | null | undefined;
    inflationPct: number;
    mixInfo: string;
  } = $props();

  const t = common.returns;
  const defaults = $derived(defaultReturns(inflationPct));
  const resultPct = $derived(
    portfolioReturnPct(mix, equity ?? defaults.equity, bonds ?? defaults.bonds, Number(fee ?? 0)),
  );
  const pct = (x: number, d = 1) => `${x.toFixed(d).replace('.', ',')} %`;
  const real = $derived(((1 + resultPct / 100) / (1 + inflationPct / 100) - 1) * 100);
  const source = `${RETURNS.source}, ${RETURNS.period}`;
</script>

<div class="selectrow">
  <div class="lab">
    <label for="mix">{t.mix}</label>
    <Info text={mixInfo} />
  </div>
  <select id="mix" bind:value={mix}>
    {#each MIXES as m}<option value={m}>{t.mixOption(Number(m))}</option>{/each}
  </select>
</div>
<NumField id="aandelen" label={t.equity} step={0.1} min={-10} unit="%"
  bind:value={() => equity ?? defaults.equity, (v) => (equity = v === defaults.equity ? null : v)}
  info={t.assetInfo(pct(RETURNS.equity_real * 100), pct(inflationPct), source)} />
<NumField id="obligaties" label={t.bonds} step={0.1} min={-10} unit="%"
  bind:value={() => bonds ?? defaults.bonds, (v) => (bonds = v === defaults.bonds ? null : v)}
  info={t.assetInfo(pct(RETURNS.bond_real * 100), pct(inflationPct), source)} />
<NumField id="kosten" label={t.fee} bind:value={fee} unit="%" step={0.05} max={5} info={t.feeInfo} />
<div class="outrow">
  <div class="lab">
    <span>{t.result}</span>
    <Info text={t.resultInfo(pct(resultPct), pct(real))} />
  </div>
  <output for="mix aandelen obligaties kosten">{pct(resultPct)}</output>
</div>

<style>
  .selectrow { position: relative; display: flex; flex-direction: column; gap: 8px; }
  .outrow { position: relative; display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 40px; }
  .outrow span { font-family: var(--font-mono); font-size: 13px; color: var(--fg-muted); }
  .outrow output { padding-right: 13px; font: 500 16px var(--font-mono); color: var(--accent); font-variant-numeric: tabular-nums; }
  .lab { display: flex; align-items: center; gap: 8px; }
  .lab label { font-family: var(--font-mono); font-size: 13px; color: var(--fg-muted); }
  select {
    width: 100%;
    min-height: 40px;
    padding: 0 12px;
    background: var(--bg);
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    color: var(--fg);
    font: 500 14px var(--font-mono);
  }
  select:focus-visible { border-color: var(--accent); }
</style>
