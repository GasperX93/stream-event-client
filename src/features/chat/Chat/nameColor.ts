/** As many as the design defines `--color-name-<n>` tokens for. */
const NAME_COLOR_COUNT = 16;

/**
 * The colour a name is drawn in, the same for a name wherever it appears. Two people with one name
 * share a colour, as they share the name.
 */
export function nameColor(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);
  return NAME_COLORS[hash % NAME_COLOR_COUNT];
}

// Written out, not built from the count, so the design tokens check can see every one being read.
const NAME_COLORS = [
  'var(--color-name-1)',
  'var(--color-name-2)',
  'var(--color-name-3)',
  'var(--color-name-4)',
  'var(--color-name-5)',
  'var(--color-name-6)',
  'var(--color-name-7)',
  'var(--color-name-8)',
  'var(--color-name-9)',
  'var(--color-name-10)',
  'var(--color-name-11)',
  'var(--color-name-12)',
  'var(--color-name-13)',
  'var(--color-name-14)',
  'var(--color-name-15)',
  'var(--color-name-16)',
];
