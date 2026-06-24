// Converts a CSS color + percentage to an rgba() string that works without color-mix()
// (Safari < 16.2 / iOS < 16.2 doesn't support color-mix()).
// Falls back to color-mix() for unknown colors so modern browsers still work.

const VAR_RGB: Record<string, string> = {
  'var(--accent)':      'var(--accent-rgb)',
  'var(--accent2)':     'var(--accent2-rgb)',
  'var(--accent-deep)': 'var(--accent-deep-rgb)',
  'var(--ok)':          'var(--ok-rgb)',
  'var(--err)':         'var(--err-rgb)',
  'var(--warn)':        'var(--warn-rgb)',
  'var(--text)':        'var(--text-rgb)',
  'var(--muted)':       'var(--muted-rgb)',
  'var(--muted2)':      'var(--muted2-rgb)',
}

const HEX_RGB: Record<string, string> = {
  '#b45309': '180,83,9',
  '#d97706': '217,119,6',
  '#f59e0b': '245,158,11',
  '#22c55e': '34,197,94',
  '#ef4444': '239,68,68',
  '#d94040': '217,64,64',
  '#64748b': '100,116,139',
  '#3b82f6': '59,130,246',
  '#8b5cf6': '139,92,246',
  '#7c3aed': '124,58,237',
}

export function tint(color: string, pct: number): string {
  const rgbVar = VAR_RGB[color]
  if (rgbVar) return `rgba(var(${rgbVar}),${pct / 100})`
  const rgb = HEX_RGB[color.toLowerCase()]
  if (rgb) return `rgba(${rgb},${pct / 100})`
  return `color-mix(in srgb,${color} ${pct}%,transparent)` // safe fallback for unknown colors
}
