/** Deterministic color from string — used for project avatars, heatmap cells */

const PALETTE = [
  '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#5AC8FA',
  '#FF2D55', '#5856D6', '#FF3B30', '#00C7BE', '#FFD60A',
] as const

export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function colorFromString(str: string): string {
  return PALETTE[hashString(str) % PALETTE.length]
}

export function gradientFromString(str: string): string {
  const base = colorFromString(str)
  return `linear-gradient(135deg, ${base} 0%, ${base}88 100%)`
}

export function initialsFromString(str: string, max = 2): string {
  return str
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, max)
    .toUpperCase()
}
