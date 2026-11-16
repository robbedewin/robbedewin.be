<script lang="ts">
  // A small line chart in the site's own style: up to three series, each
  // with its own colour and its own dash pattern, so they differ without
  // colour too. The legend above the plot shows the values of the chosen year
  // (pointer, touch or arrow keys); it starts at the last year. An optional
  // band (a range, such as the 10th to 90th percentile) is shaded behind them.
  interface Series {
    label: string;
    values: number[];
    tone: 'a' | 'b' | 'c';
  }
  let {
    series,
    years,
    label,
    hint,
    format,
    formatShort,
    yearLabel,
    marker = null,
    band = null,
  }: {
    series: Series[];
    years: number[];
    label: string;
    hint: string;
    format: (v: number) => string;
    formatShort: (v: number) => string;
    yearLabel: (y: number) => string;
    marker?: { year: number; label: string } | null;
    band?: { label: string; lo: number[]; hi: number[] } | null;
  } = $props();

  let width = $state(720);
  const uid = $props.id();
  let hover = $state<number | null>(null);

  const L = 84, R = 16, T = 16, B = 32;
  const n = $derived(years.length);
  const idx = $derived(hover === null || hover >= n ? n - 1 : hover);
  const W = $derived(Math.max(width, 280));
  const H = $derived(Math.round(Math.min(Math.max(W * 0.42, 240), 460)));

  const scale = $derived.by(() => {
    // A band's upper edge can run far above the lines (the best futures over
    // decades); the axis stops at twice the lines' top and the band is clipped.
    const lines = series.flatMap((s) => s.values);
    const top = Math.max(1, ...lines);
    const all = [...lines, ...(band ? [...band.lo, ...band.hi.map((v) => Math.min(v, 2 * top))] : [])];
    const min = Math.min(0, ...all);
    const max = Math.max(1, ...all);
    const rough = (max - min) / 4;
    const mag = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
    return { lo, hi, ticks };
  });
  const xStep = $derived([1, 2, 5, 10].find((s) => n / s <= (W < 520 ? 6 : 10)) ?? 10);

  const x = (i: number) => (n > 1 ? L + (i / (n - 1)) * (W - L - R) : (L + W - R) / 2);
  const y = (v: number) => T + (1 - (v - scale.lo) / (scale.hi - scale.lo)) * (H - T - B);
  const path = (values: number[]) =>
    values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const area = (lo: number[], hi: number[]) =>
    `${path(hi)}${lo.map((_, j) => { const i = lo.length - 1 - j; return `L${x(i).toFixed(1)},${y(lo[i]).toFixed(1)}`; }).join('')}Z`;

  function pick(e: PointerEvent) {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (n - 1));
    hover = Math.min(Math.max(i, 0), n - 1);
  }
  function key(e: KeyboardEvent) {
    const move = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!move) return;
    e.preventDefault();
    hover = Math.min(Math.max(idx + move, 0), n - 1);
  }
</script>

<figure class="chart">
  <figcaption class="legend">
    <span class="legend__year">{yearLabel(years[idx])}</span>
    {#if band}
      <span class="legend__item">
        <span class="swatch swatch--band"></span>
        {band.label}
        <strong>{format(band.lo[idx])} – {format(band.hi[idx])}</strong>
      </span>
    {/if}
    {#each series as s}
      <span class="legend__item">
        <span class="swatch swatch--{s.tone}"></span>
        {s.label}
        <strong>{format(s.values[idx])}</strong>
      </span>
    {/each}
  </figcaption>
  <div bind:clientWidth={width}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <svg
      viewBox="0 0 {W} {H}"
      role="img"
      aria-label="{label}. {hint}"
      tabindex="0"
      onpointermove={pick}
      onpointerdown={pick}
      onpointerleave={() => (hover = null)}
      onkeydown={key}
    >
      {#each scale.ticks as v}
        <line class={v === 0 ? 'zero' : 'grid'} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
        <text class="tick" x={L - 8} y={y(v) + 4} text-anchor="end">{formatShort(v)}</text>
      {/each}
      {#each years as yr, i}
        {#if yr % xStep === 0 || (n <= 3)}
          <text class="tick" x={x(i)} y={H - 10} text-anchor="middle">{yr}</text>
        {/if}
      {/each}
      {#if marker && marker.year >= years[0] && marker.year <= years[n - 1]}
        {@const mx = x(marker.year - years[0])}
        <!-- The label goes right of the line if it fits, else left; never over
             the axis labels. 11px mono is about 6.7px a character. -->
        {@const tw = marker.label.length * 6.7}
        {@const right = mx + 6 + tw <= W - R}
        <line class="marker" x1={mx} x2={mx} y1={T} y2={H - B} />
        <text
          class="tick"
          x={right ? mx + 6 : Math.max(mx - 6, L + 6 + tw)}
          y={T + 10}
          text-anchor={right ? 'start' : 'end'}
        >{marker.label}</text>
      {/if}
      {#if band}
        <clipPath id="{uid}-plot"><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath>
        <path class="band" d={area(band.lo, band.hi)} clip-path="url(#{uid}-plot)" />
      {/if}
      <line class="guide" x1={x(idx)} x2={x(idx)} y1={T} y2={H - B} />
      {#each series as s}
        <path class="line line--{s.tone}" d={path(s.values)} />
        <circle class="dot dot--{s.tone}" cx={x(idx)} cy={y(s.values[idx])} r="4.5" />
      {/each}
    </svg>
  </div>
</figure>

<style>
  .chart { margin: 0; }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 28px;
    align-items: baseline;
    margin-bottom: 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--fg-muted);
  }
  .legend__year { color: var(--fg); min-width: 7ch; }
  .legend__item { display: inline-flex; align-items: center; gap: 8px; }
  .legend strong { color: var(--fg); font-weight: 500; font-variant-numeric: tabular-nums; }
  .swatch { width: 22px; height: 0; border-top: 2px solid var(--accent); flex: none; }
  .swatch--b { border-color: var(--warm); border-top-style: dashed; }
  .swatch--band { height: 10px; border: 0; background: color-mix(in srgb, var(--accent) 22%, transparent); }
  .band { fill: color-mix(in srgb, var(--accent) 16%, transparent); stroke: none; }
  .swatch--c { border-color: var(--green); border-top-style: dotted; border-top-width: 3px; }
  svg { display: block; width: 100%; height: auto; touch-action: pan-y; cursor: crosshair; }
  .grid { stroke: var(--line); stroke-width: 1; }
  .zero { stroke: var(--line-strong); stroke-width: 1; }
  .tick { fill: var(--fg-muted); font: 11px var(--font-mono); }
  .guide { stroke: var(--line-strong); stroke-width: 1; }
  .marker { stroke: var(--fg-muted); stroke-width: 1; stroke-dasharray: 2 4; }
  .line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke: var(--accent); }
  .line--b { stroke: var(--warm); stroke-dasharray: 6 4; }
  .line--c { stroke: var(--green); stroke-dasharray: 2 4; stroke-linecap: round; }
  .dot { fill: var(--accent); stroke: var(--bg); stroke-width: 2; }
  .dot--b { fill: var(--warm); }
  .dot--c { fill: var(--green); }
</style>
