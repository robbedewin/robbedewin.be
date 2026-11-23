<script lang="ts">
  import { onMount } from 'svelte';
  import { linkPath, linkQuery } from '../../lib/url-state.ts';
  import {
    CAPACITIES, DREMPELS, GL_MAX, GL_MIN, SHORT_HORIZON_YEARS, adviceRange, capacityVerdict, equityRange,
    toleranceLevel, toleranceScore,
    type Stability, type ToleranceLevel,
  } from '../../lib/riskprofile.ts';
  import Info from './Info.svelte';
  import NumField from './NumField.svelte';
  import { t } from './risicoprofiel.nl.ts';

  // An answer is the index of the chosen option; null while open.
  let tol = $state<(number | null)[]>(t.tolerance.map(() => null));
  let beh = $state<(number | null)[]>(t.behaviour.map(() => null));
  let horizon = $state<number | null | undefined>(null);
  let stability = $state<Stability | null>(null);
  let income = $state<number | null | undefined>(null);
  let costs = $state<number | null | undefined>(null);
  // One question at a time: the 13 tolerance questions, the 4 on behaviour,
  // then the capacity form as the last step.
  const N_TOL = t.tolerance.length;
  const N_BEH = t.behaviour.length;
  const LAST = N_TOL + N_BEH;
  let step = $state(0);
  let ready = $state(false);
  let copied = $state(false);

  const eurFmt = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  // The texts hold amounts as {1000}.
  const fmt = (text: string) => text.replace(/\{(\d+)\}/g, (_, n) => eurFmt.format(Number(n)));
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const given = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
  const count = (answers: (number | null)[]) => answers.filter((a) => a !== null).length;

  const score = $derived(toleranceScore(tol));
  const level = $derived(score === null ? null : toleranceLevel(score));

  // Unknown income or costs: the margin counts neither way.
  const margin = $derived(given(income) && income > 0 && given(costs) ? (income - costs) / income : null);
  const capacity = $derived(
    given(horizon) && horizon >= 0 && stability ? capacityVerdict(horizon, stability, margin) : null,
  );
  const heldBack = $derived.by(() => {
    if (!capacity || !capacity.factors.length || !given(horizon)) return '';
    const limited = capacity.verdict === 'beperkt';
    const parts = capacity.factors.map((f) => {
      if (f === 'horizon') {
        return t.result.factors.horizon(horizon, limited ? DREMPELS.min_horizon_jaren : DREMPELS.ruim_horizon_jaren);
      }
      if (f === 'marge') {
        return limited ? t.result.factors.margeNegative : t.result.factors.marge(pct(margin ?? 0), pct(DREMPELS.ruim_marge_pct));
      }
      return t.result.factors.stabiliteit;
    });
    return t.result.heldBack(parts.join(' en '));
  });

  // Selling all or part in a 30 % fall (the first behaviour question).
  const sellsInFall = $derived(beh[0] === 0 || beh[0] === 1);
  const advice = $derived(
    level !== null && capacity && given(horizon)
      ? adviceRange(level, capacity.verdict, { horizonYears: horizon, sellsInFall })
      : null,
  );
  const range = $derived(advice?.range ?? null);
  // What sets the range: the page's limits first, else the lower of the two.
  const decidedBy = $derived.by(() => {
    if (level === null || !capacity || !advice) return '';
    // The short horizon says it all; the behaviour note stays below.
    if (advice.limits.includes('kort')) return t.result.limits.kort(SHORT_HORIZON_YEARS);
    if (advice.limits.includes('gedrag')) return t.result.limits.gedrag;
    const base = equityRange(level, capacity.verdict);
    if (equityRange(level, 'ruim')[1] > base[1]) return t.result.decidedBy.capacity;
    if (equityRange(4, capacity.verdict)[1] > base[1]) return t.result.decidedBy.tolerance;
    return t.result.decidedBy.both;
  });

  const notes = $derived.by(() => {
    const out: string[] = [];
    if (sellsInFall && level !== null && level >= 3) out.push(t.behaviourNotes.mismatch);
    t.behaviour.forEach((item, i) => {
      if (item.note && beh[i] !== null && item.flag.includes(beh[i] as number)) out.push(item.note);
    });
    if (beh[3] === 0) out.push(t.behaviourNotes.soldBefore);
    if (beh[3] === 2) out.push(t.behaviourNotes.untested);
    return out;
  });
  const behaviourDone = $derived(count(beh) === beh.length);

  // The address bar holds the answers, so a reload keeps them. Income and
  // fixed costs go only into the link that "Kopieer link" copies, so they do
  // not end up in the browser history on their own.
  const encode = (answers: (number | null)[]) => answers.map((a) => (a === null ? '-' : a)).join('');
  const decode = (raw: string | null, options: readonly { a: readonly string[] }[]) =>
    options.map((item, i) => {
      const n = Number(raw?.[i]);
      return raw?.[i] !== undefined && raw[i] !== '-' && Number.isInteger(n) && n < item.a.length ? n : null;
    });
  function query(full: boolean) {
    const q = new URLSearchParams();
    if (count(tol)) q.set('t', encode(tol));
    if (count(beh)) q.set('b', encode(beh));
    if (given(horizon)) q.set('h', String(horizon));
    if (stability) q.set('s', stability);
    if (full && given(income)) q.set('i', String(income));
    if (full && given(costs)) q.set('k', String(costs));
    return q.toString();
  }
  function load() {
    const q = new URLSearchParams(linkQuery(location.hash, location.search));
    const number = (key: string) => {
      const raw = q.get(key);
      return raw !== null && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
    };
    tol = decode(q.get('t'), t.tolerance);
    beh = decode(q.get('b'), t.behaviour);
    horizon = number('h');
    income = number('i');
    costs = number('k');
    const s = q.get('s');
    stability = s === 'hoog' || s === 'matig' || s === 'laag' ? s : null;
    const open = [...tol, ...beh].findIndex((a) => a === null);
    step = open === -1 ? LAST : open;
  }
  onMount(() => {
    load();
    ready = true;
    // A link pasted into this same tab changes only the fragment: no reload.
    addEventListener('hashchange', load);
    return () => removeEventListener('hashchange', load);
  });
  $effect(() => {
    const q = query(false);
    if (ready) history.replaceState(null, '', linkPath(location.pathname, q));
  });
  async function copyLink() {
    try {
      const q = query(true);
      await navigator.clipboard.writeText(`${location.origin}${linkPath(location.pathname, q)}`);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // No clipboard access: the address bar holds the link, without income and costs.
    }
  }
  function reset() {
    tol = t.tolerance.map(() => null);
    beh = t.behaviour.map(() => null);
    horizon = income = costs = null;
    stability = null;
    step = 0;
  }

  const section = $derived(step < N_TOL ? 0 : step < LAST ? 1 : 2);
  const SECTIONS = $derived([
    { name: t.steps.tolerance, first: 0, done: t.steps.done(count(tol), N_TOL) },
    { name: t.steps.behaviour, first: N_TOL, done: t.steps.done(count(beh), N_BEH) },
    { name: t.steps.capacity, first: LAST, done: '' },
  ]);
  // A click moves on to the next question. A choice made with the arrow keys
  // (a click event with detail 0) does not, or the first key press would jump.
  function chosen(e: MouseEvent) {
    if (e.detail > 0) setTimeout(() => { if (step < LAST) step += 1; }, 220);
  }

  const LEVELS = [4, 3, 2, 1, 0] as ToleranceLevel[];
  const STABILITIES = ['hoog', 'matig', 'laag'] as const;
</script>

<div class="calc">
  <form class="card wizard" onsubmit={(e) => e.preventDefault()}>
    <nav class="sections" aria-label={t.steps.progress}>
      {#each SECTIONS as sec, i}
        <button type="button" aria-current={section === i ? 'step' : undefined} onclick={() => (step = sec.first)}>
          <span class="step">{i + 1}</span>{sec.name}
          {#if sec.done}<span class="done">{sec.done}</span>{/if}
        </button>
      {/each}
    </nav>
    <div class="progress" role="progressbar" aria-label={t.steps.progress} aria-valuemin="0" aria-valuemax={LAST} aria-valuenow={step}>
      <span style="width: {(step / LAST) * 100}%"></span>
    </div>

    <div class="body">
      {#if section === 0}
        {@const i = step}
        {@const item = t.tolerance[i]}
        <p class="intro">{t.steps.toleranceIntro}</p>
        {#key i}
          <fieldset class="q">
            <legend><span class="n">{t.steps.question(i + 1, N_TOL)}</span>{fmt(item.q)}</legend>
            {#each item.a as option, j}
              <label class="opt">
                <input type="radio" name="t{i}" value={j} bind:group={tol[i]} onclick={chosen} />
                <span>{fmt(option)}</span>
              </label>
            {/each}
          </fieldset>
        {/key}
      {:else if section === 1}
        {@const i = step - N_TOL}
        {@const item = t.behaviour[i]}
        <p class="intro">{t.steps.behaviourIntro}</p>
        {#key i}
          <fieldset class="q">
            <legend><span class="n">{t.steps.question(i + 1, N_BEH)}</span>{item.q}</legend>
            {#each item.a as option, j}
              <label class="opt">
                <input type="radio" name="b{i}" value={j} bind:group={beh[i]} onclick={chosen} />
                <span>{option}</span>
              </label>
            {/each}
          </fieldset>
        {/key}
      {:else}
        <p class="intro">{t.steps.capacityIntro}</p>
        <div class="fields">
          <NumField id="horizon" label={t.capacity.horizon} bind:value={horizon} unit={t.capacity.horizonUnit} max={80} info={t.capacity.horizonInfo} />
          <fieldset class="stab">
            <legend>
              {t.capacity.stability}
              <Info text={t.capacity.stabilityInfo} />
            </legend>
            <div class="segmented">
              {#each STABILITIES as st}
                <input type="radio" id="stab-{st}" name="stab" value={st} bind:group={stability} />
                <label for="stab-{st}">{t.capacity.stabilityOptions[st]}</label>
              {/each}
            </div>
          </fieldset>
          <NumField id="income" label={t.capacity.income} bind:value={income} unit="€" step={100} />
          <NumField id="costs" label={t.capacity.costs} bind:value={costs} unit="€" step={100} info={t.capacity.costsInfo} />
        </div>
      {/if}
    </div>

    <div class="nav">
      <button type="button" class="btn" disabled={step === 0} onclick={() => (step -= 1)}>← {t.steps.previous}</button>
      {#if step < LAST}
        <button type="button" class="btn" onclick={() => (step += 1)}>{t.steps.next} →</button>
      {/if}
    </div>
  </form>

  <aside class="panel" aria-label={t.result.title} aria-live="polite">
    <div class="panel__head">
      <h2>{t.result.title}</h2>
      <div class="panel__actions">
        <button type="button" class="link" onclick={reset}>{t.result.reset}</button>
        <button type="button" class="link" onclick={copyLink}>{copied ? t.result.copied : t.result.copy}</button>
      </div>
    </div>

    <dl class="scores">
      <div>
        <dt>{t.result.tolerance}</dt>
        {#if score !== null && level !== null}
          <dd>{t.result.levels[level]}</dd>
          <dd class="sub">{t.result.score(score, GL_MIN, GL_MAX)}</dd>
        {:else}
          <dd class="pending">{t.result.pendingTolerance(tol.length - count(tol))}</dd>
        {/if}
      </div>
      <div>
        <dt>{t.result.capacity}</dt>
        {#if capacity}
          <dd>{t.result.capacities[capacity.verdict]}</dd>
          <dd class="sub">{capacity.verdict === 'ruim' ? t.result.roomy : heldBack}</dd>
        {:else}
          <dd class="pending">{t.result.pendingCapacity}</dd>
        {/if}
      </div>
    </dl>

    <section>
      <h3>{t.result.mixTitle}</h3>
      {#if range}
        <p class="mix">{t.result.mix(range[0], range[1])}</p>
        <p class="sub">{t.result.mixRest(range[0], range[1])}</p>
        <div class="bar" aria-hidden="true">
          <span style="left: {range[0]}%; width: {range[1] - range[0]}%"></span>
        </div>
        <div class="bar__axis" aria-hidden="true"><span>0 %</span><span>50 %</span><span>100 %</span></div>
        <p class="sub">{decidedBy}</p>
        <p class="sub">{t.result.need}</p>
        <p class="links">
          <a href="/tools/pensioen?mix={range[0]}">{t.result.pension(range[0])}</a>
          <a href="/tools/huren-of-kopen?mix={range[0]}">{t.result.rentbuy(range[0])}</a>
        </p>
      {:else}
        <p class="pending">{t.result.mixPending}</p>
      {/if}
    </section>

    <section>
      <h3>{t.result.gridTitle}</h3>
      <table class="grid" aria-label={t.result.gridLabel}>
        <tbody>
          {#each LEVELS as l}
            <tr>
              <th scope="row">{t.result.levels[l]}</th>
              {#each CAPACITIES as c}
                {@const r = equityRange(l, c)}
                <td
                  class:current={level === l && capacity?.verdict === c}
                  style="background: color-mix(in srgb, var(--accent) {r[1] * 0.4}%, var(--panel))"
                >{t.result.gridCell(r[0], r[1])}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <td></td>
            {#each CAPACITIES as c}<th scope="col">{t.result.capacities[c]}</th>{/each}
          </tr>
        </tfoot>
      </table>
      <p class="axes"><span>↑ {t.result.tolerance}</span><span>{t.result.capacity} →</span></p>
    </section>

    {#if notes.length || behaviourDone}
      <section>
        <h3>{t.behaviourNotes.title}</h3>
        {#if notes.length}
          <ul class="notes">
            {#each notes as note}<li>{note}</li>{/each}
          </ul>
        {:else}
          <p class="sub">{t.behaviourNotes.none}</p>
        {/if}
      </section>
    {/if}

    <details class="about">
      <summary>{t.about.title}</summary>
      <ul>
        {#each t.about.items as item}<li>{item}</li>{/each}
      </ul>
    </details>
    <p class="disclaimer">{t.about.disclaimer}</p>
  </aside>
</div>

<style>
  .calc {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(360px, 460px);
    gap: 28px;
    align-items: start;
  }
  @media (max-width: 1040px) {
    .calc { grid-template-columns: minmax(0, 1fr); }
  }

  .card, .panel {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 24px;
    min-width: 0;
  }
  .wizard { display: flex; flex-direction: column; }

  .sections { display: flex; flex-wrap: wrap; gap: 4px 28px; }
  .sections button {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    min-height: 40px;
    padding: 0;
    background: none;
    border: 0;
    color: var(--fg-muted);
    font: 600 1rem var(--font);
    cursor: pointer;
  }
  .sections button:hover { color: var(--accent-hover); }
  .sections button[aria-current='step'] { color: var(--fg); }
  .step { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--accent); }
  .step::after { content: '.'; }
  .done { font: 400 12px var(--font-mono); color: var(--fg-muted); }
  .progress { height: 3px; margin-top: 8px; background: var(--line); border-radius: 2px; overflow: hidden; }
  .progress span { display: block; height: 100%; background: var(--accent); transition: width 0.2s; }
  @media (prefers-reduced-motion: reduce) { .progress span { transition: none; } }

  /* Tall enough for the longest question, so the buttons below stay put. */
  .body { min-height: 430px; padding-top: 20px; }
  .intro { margin: 0 0 20px; color: var(--fg-muted); font-size: 0.94rem; max-width: 70ch; }
  h2 { margin: 0; font-size: 1.15rem; }
  h3 { margin: 0 0 8px; font-size: 13px; font-weight: 500; font-family: var(--font-mono); color: var(--fg-muted); letter-spacing: 0; }

  .q { border: 0; margin: 0; padding: 0; min-width: 0; }
  .q legend { float: left; width: 100%; padding: 0; margin-bottom: 14px; max-width: 70ch; font-size: 1.2rem; font-weight: 500; line-height: 1.4; }
  .q legend + * { clear: both; }
  .n { display: block; margin-bottom: 6px; font: 400 13px var(--font-mono); color: var(--fg-muted); }
  .opt {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 14px;
    margin-top: 8px;
    max-width: 70ch;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    cursor: pointer;
  }
  .opt:hover { border-color: var(--accent); }
  .opt:has(input:checked) { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, transparent); }
  .opt input { flex: none; width: 18px; height: 18px; margin: 4px 0 0; accent-color: var(--accent); }

  .nav { display: flex; justify-content: space-between; gap: 12px; margin-top: 20px; }
  .nav .btn { background: none; cursor: pointer; }
  .nav .btn:disabled { opacity: 0.35; cursor: default; }

  .fields { display: flex; flex-direction: column; gap: 12px; max-width: 560px; }
  .stab { position: relative; border: 0; margin: 0; padding: 0; min-width: 0; }
  .stab legend { padding: 0; margin-bottom: 8px; font-family: var(--font-mono); font-size: 13px; color: var(--fg-muted); }

  .panel { display: flex; flex-direction: column; gap: 20px; }
  .panel :global(a) { font-size: 0.94rem; }
  .panel__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 16px; }
  .panel__actions { display: flex; flex-wrap: wrap; gap: 0 16px; }
  .link {
    min-height: 36px;
    padding: 0;
    background: none;
    border: 0;
    color: var(--accent);
    font: 13px var(--font-mono);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .link:hover { color: var(--accent-hover); }

  .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 0; }
  .scores dt { margin-bottom: 4px; font-family: var(--font-mono); font-size: 13px; color: var(--fg-muted); }
  .scores dd { margin: 0; font-size: 1.4rem; font-weight: 600; line-height: 1.2; }
  .scores dd.sub, .sub { margin: 4px 0 0; font-size: 13px; font-weight: 400; color: var(--fg-muted); line-height: 1.45; }
  .scores dd.pending, .pending { margin: 0; font-size: 0.94rem; font-weight: 400; color: var(--fg-muted); }
  section p { margin-bottom: 0; }
  section p + p { margin-top: 8px; }

  .mix { margin: 0; font-size: 1.75rem; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; color: var(--accent); }
  .bar { position: relative; height: 10px; margin-top: 14px; border-radius: 5px; background: var(--bg); border: 1px solid var(--line); }
  .bar span { position: absolute; top: -1px; bottom: -1px; border-radius: 5px; background: var(--accent); }
  .bar__axis { display: flex; justify-content: space-between; margin-top: 4px; font: 11px var(--font-mono); color: var(--fg-muted); }

  .links { display: flex; flex-direction: column; gap: 6px; }
  .grid { width: 100%; border-collapse: separate; border-spacing: 3px; font-size: 13px; }
  .grid th, .grid td { border: 0; padding: 0; }
  .grid th { font: 400 12px var(--font-mono); color: var(--fg-muted); vertical-align: middle; }
  .grid th[scope='row'] { text-align: left; padding-right: 8px; white-space: nowrap; }
  .grid th[scope='col'] { text-align: center; padding-top: 4px; }
  .grid tbody td {
    height: 34px;
    text-align: center;
    vertical-align: middle;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    color: var(--fg);
    white-space: nowrap;
  }
  /* Phone: the row labels wrap so the ranges keep one line. */
  @media (max-width: 480px) {
    .grid th[scope='row'] { white-space: normal; }
    .grid tbody td { font-size: 12px; padding: 0 2px; }
  }
  .grid td.current { outline: 2px solid var(--fg); outline-offset: -2px; font-weight: 700; }
  .axes { display: flex; justify-content: space-between; margin-top: 4px; font: 11px var(--font-mono); color: var(--fg-muted); }

  .notes { margin: 0; padding-left: 1.2em; font-size: 0.94rem; }
  .about { font-size: 0.9rem; color: var(--fg-muted); }
  .about summary { cursor: pointer; font-weight: 500; }
  .about summary:hover { color: var(--accent-hover); }
  .about ul { margin: 12px 0 0; padding-left: 1.2em; }
  .disclaimer { margin: 0; font-size: 13px; color: var(--fg-muted); }
</style>
