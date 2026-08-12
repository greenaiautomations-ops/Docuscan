/**
 * Best-effort parse of an AI-extracted date string into a timezone-safe
 * "YYYY-MM-DD" (no time component — dates are stored as `date`, never
 * `timestamptz`, so they can't shift across timezones). Returns null
 * rather than guessing when the text isn't a recognizable date, per the
 * "never silently create incorrect events" requirement.
 */
export function parseDateOnly(text: string | null | undefined): string | null {
  if (!text) return null
  const trimmed = text.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    if (isValidCalendarDate(Number(y), Number(m), Number(d))) {
      return `${y}-${m}-${d}`
    }
    return null
  }

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  // Guard against absurd years (OCR/AI misreads sometimes produce these).
  if (parsed.getFullYear() < 1900 || parsed.getFullYear() > 2200) return null

  const y = parsed.getFullYear()
  const m = String(parsed.getMonth() + 1).padStart(2, '0')
  const d = String(parsed.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Extracts an HH:MM (24h) time from free text, if present. */
export function parseTimeOnly(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3]?.toLowerCase()
  if (hour > 23 || minute > 59) return null
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false
  const daysInMonth = new Date(year, month, 0).getDate()
  return day >= 1 && day <= daysInMonth
}
