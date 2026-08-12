import { describe, expect, it } from 'vitest'
import { parseDateOnly, parseTimeOnly } from '../supabase/functions/_shared/dateParsing.ts'

describe('parseDateOnly (never guesses on unparseable input)', () => {
  it('parses a plain ISO date', () => {
    expect(parseDateOnly('2026-09-01')).toBe('2026-09-01')
  })

  it('parses an ISO timestamp by taking the date part', () => {
    expect(parseDateOnly('2026-09-01T10:30:00Z')).toBe('2026-09-01')
  })

  it('parses a natural-language date the AI might return', () => {
    expect(parseDateOnly('September 1, 2026')).toBe('2026-09-01')
  })

  it('rejects an impossible calendar date instead of guessing', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull()
  })

  it('rejects garbage / non-date text', () => {
    expect(parseDateOnly('not a date')).toBeNull()
    expect(parseDateOnly('')).toBeNull()
    expect(parseDateOnly(null)).toBeNull()
    expect(parseDateOnly(undefined)).toBeNull()
  })

  it('rejects absurd years an OCR misread might produce, via the free-text parsing path', () => {
    // Explicit ISO dates (YYYY-MM-DD) are trusted as-is; the absurd-year
    // guard applies to the free-text fallback path, e.g. dates JS's Date
    // constructor would otherwise happily "parse" into a nonsense year.
    expect(parseDateOnly('January 1, 9999')).toBeNull()
    expect(parseDateOnly('January 1, 1899')).toBeNull()
  })
})

describe('parseTimeOnly', () => {
  it('parses 24-hour time', () => {
    expect(parseTimeOnly('14:30')).toBe('14:30')
  })

  it('converts 12-hour PM time correctly', () => {
    expect(parseTimeOnly('2:30 PM')).toBe('14:30')
  })

  it('converts 12-hour AM edge case (12am -> 00:xx)', () => {
    expect(parseTimeOnly('12:15 am')).toBe('00:15')
  })

  it('extracts a time embedded in a longer sentence', () => {
    expect(parseTimeOnly('Please arrive by 9:00 am at the office')).toBe('09:00')
  })

  it('returns null when no time is present', () => {
    expect(parseTimeOnly('no time here')).toBeNull()
    expect(parseTimeOnly(null)).toBeNull()
  })

  it('rejects an out-of-range time', () => {
    expect(parseTimeOnly('25:99')).toBeNull()
  })
})
