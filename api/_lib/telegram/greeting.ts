export interface TimePrefs {
  timeZone: string | null
  offsetMinutes: number | null
}

export function hourInTimezone(timeZone: string, date = new Date()): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date)
    const hour = parseInt(formatted, 10)
    return Number.isFinite(hour) ? hour % 24 : date.getUTCHours()
  } catch {
    return date.getUTCHours()
  }
}

export function hourFromOffsetMinutes(offsetMinutes: number, date = new Date()): number {
  // JS getTimezoneOffset(): UTC = local + offsetMinutes
  return new Date(date.getTime() - offsetMinutes * 60_000).getUTCHours()
}

export function resolveTimePrefs(metadata: Record<string, unknown> | undefined): TimePrefs {
  const timeZone =
    typeof metadata?.timezone === 'string' && metadata.timezone.length > 0
      ? metadata.timezone
      : null
  const offsetMinutes =
    typeof metadata?.timezone_offset === 'number' && Number.isFinite(metadata.timezone_offset)
      ? metadata.timezone_offset
      : null
  return { timeZone, offsetMinutes }
}

export function localHour(prefs: TimePrefs, date = new Date()): number {
  if (prefs.timeZone && prefs.timeZone !== 'UTC') {
    return hourInTimezone(prefs.timeZone, date)
  }
  if (prefs.offsetMinutes !== null) {
    return hourFromOffsetMinutes(prefs.offsetMinutes, date)
  }
  return date.getUTCHours()
}

export function digestGreeting(prefs: TimePrefs, date = new Date()): { label: string; emoji: string } {
  const hour = localHour(prefs, date)
  if (hour < 12) return { label: 'Good morning', emoji: '☀️' }
  if (hour < 17) return { label: 'Good afternoon', emoji: '🌤️' }
  return { label: 'Good evening', emoji: '🌙' }
}

/** @deprecated use resolveTimePrefs */
export function resolveTimezone(metadata: Record<string, unknown> | undefined): string {
  return resolveTimePrefs(metadata).timeZone ?? 'UTC'
}
