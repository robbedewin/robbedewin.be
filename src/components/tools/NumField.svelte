<script lang="ts">
  // One assumption per row: the label (and its info button) on the left, the
  // input on the right. Every input has the same width, so they line up
  // whatever the length of the label.
  import Info from './Info.svelte';
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
</script>

<div class="numrow">
  <div class="lab">
    <label for={id}>{label}</label>
    {#if info}<Info text={info} />{/if}
  </div>
  <div class="field__input">
    <input {id} type="number" inputmode="decimal" bind:value {step} {min} {max} />
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
  .field__input input { padding: 8px 0; text-align: right; }
</style>
