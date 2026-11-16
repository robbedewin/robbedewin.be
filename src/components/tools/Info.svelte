<script lang="ts">
  // The (i) button with its explanation. The text opens as a small panel over
  // the page, so nothing below it moves; a click elsewhere or Escape closes
  // it. The panel spans the nearest positioned ancestor (the field's row),
  // which keeps it inside the column on any screen width.
  import { common } from './common.nl.ts';
  let { text }: { text: string } = $props();
  const id = $props.id();
  let open = $state(false);
  let root: HTMLElement;
</script>

<svelte:window
  onclick={(e) => { if (open && !root.contains(e.target as Node)) open = false; }}
  onkeydown={(e) => { if (e.key === 'Escape') open = false; }}
/>

<span bind:this={root}>
  <button
    type="button"
    class="info"
    aria-label={common.moreInfo}
    aria-expanded={open}
    aria-controls={id}
    onclick={() => (open = !open)}
  >i</button>
  {#if open}<span class="bubble" {id} role="note">{text}</span>{/if}
</span>

<style>
  .info {
    position: relative;
    flex: none;
    width: 20px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    background: none;
    color: var(--fg-muted);
    font: 500 12px/1 var(--font-mono);
    cursor: pointer;
    vertical-align: middle;
  }
  /* A larger area to tap than the circle that is drawn. */
  .info::before { content: ''; position: absolute; inset: -10px; }
  .info:hover { color: var(--accent-hover); border-color: var(--accent); }
  .info[aria-expanded='true'] { background: var(--accent); border-color: var(--accent); color: var(--bg); }
  .bubble {
    position: absolute;
    z-index: 5;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 6px;
    padding: 10px 12px;
    background: var(--bg);
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.45);
    color: var(--fg);
    font: 400 13px/1.5 var(--font);
    letter-spacing: 0;
    text-align: left;
    white-space: normal;
  }
</style>
