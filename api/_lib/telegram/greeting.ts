export function hourInTimezone(timeZone: string, date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone,
    }).formatToParts(date)
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '0'
    return parseInt(hour, 10) % 24
  } catch {
    return date.getUTCHours()
  }
}

export function digestGreeting(timeZone: string): { label: string; emoji: string } {
  const hour = hourInTimezone(timeZone)
  if (hour < 12) return { label: 'Good morning', emoji: '☀️' }
  if (hour < 17) return { label: 'Good afternoon', emoji: '🌤️' }
  return { label: 'Good evening', emoji: '🌙' }
}

export function resolveTimezone(metadata: Record<string, unknown> | undefined): string {
  const tz = metadata?.timezone
  return typeof tz === 'string' && tz.length > 0 ? tz : 'UTC'
}
