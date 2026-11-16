<script lang="ts">
  // One assumption per row: the label (and its info button) on the left, the
  // input on the right. Every input has the same width, so they line up
  // whatever the length of the label.
  //
  // A text field rather than type="number": browsers handle a decimal comma
  // differently there, and some drop it ("3,4" became 34). The text is parsed
  // with parseNumber and shown the Belgian way ("400.000", "3,4") once the
  // field loses focus. The arrow keys still step the value.
  import Info from './Info.svelte';
  import { formatNumber, parseNumber } from '../../lib/parse-number.ts';
  let {
    id,
    label,
    value = $bindable(),
    unit = '',
    step = 1,
    min = 0,
    max = undefined,
    info = '',
  }: {
    id: string;
    label: string;
    value: number | null | undefined;
    unit?: string;
    step?: number;
    min?: number;
    max?: number;
    info?: string;
  } = $props();

  let text = $state(formatNumber(value));
  let focused = false;
  let invalid = $state(false);

  // A value set from outside (reset, a link) replaces the text, but not while
  // the field is being typed in.
  $effect(() => {
    const v = value;
    if (!focused) text = formatNumber(v);
  });

  function oninput() {
    const v = parseNumber(text);
    invalid = Number.isNaN(v);
    if (!invalid) value = v;
  }
  function onblur() {
    focused = false;
    invalid = false;
    text = formatNumber(value);
  }
  function onkeydown(e: KeyboardEvent) {
    const dir = { ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const digits = (String(step).split('.')[1] ?? '').length;
    let v = Number(((value ?? min) + dir * step).toFixed(digits));
    v = Math.max(v, min);
    if (max !== undefined) v = Math.min(v, max);
    value = v;
    text = formatNumber(v);
  }
</script>

<div class="numrow">
  <div class="lab">
    <label for={id}>{label}</label>
    {#if info}<Info text={info} />{/if}
  </div>
  <div class="field__input">
    <input
      {id}
      type="text"
      inputmode="decimal"
      autocomplete="off"
      spellcheck="false"
      aria-invalid={invalid || undefined}
      bind:value={text}
      onfocus={() => (focused = true)}
      {oninput}
      {onblur}
      {onkeydown}
    />
    {#if unit}<span>{unit}</span>{/if}
  </div>
</div>

<style>
  .numrow {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 140px;
    gap: 12px;
    align-items: center;
  }
  .lab { display: flex; align-items: center; gap: 8px; min-width: 0; }
  label { font-family: var(--font-mono); font-size: 13px; color: var(--fg-muted); }
  .field__input { min-height: 40px; }
  .field__input input { padding: 8px 0; text-align: right; font-variant-numeric: tabular-nums; }
  .field__input:has(input[aria-invalid='true']) { border-color: var(--warm); }
</style>
