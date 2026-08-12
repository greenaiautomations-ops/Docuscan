import { describe, expect, it } from 'vitest'
import { daysUntil, formatCurrency, relativeDateLabel } from '../src/utils/formatters'

function daysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('daysUntil (timezone-safe calendar-date diff)', () => {
  it('is 0 for today', () => {
    expect(daysUntil(daysFromToday(0))).toBe(0)
  })

  it('is negative for a past date (overdue)', () => {
    expect(daysUntil(daysFromToday(-5))).toBe(-5)
  })

  it('is positive for a future date', () => {
    expect(daysUntil(daysFromToday(10))).toBe(10)
  })
})

describe('relativeDateLabel', () => {
  it('labels today and tomorrow specially', () => {
    expect(relativeDateLabel(daysFromToday(0))).toBe('Today')
    expect(relativeDateLabel(daysFromToday(1))).toBe('Tomorrow')
  })

  it('labels an overdue date with days-overdue count', () => {
    expect(relativeDateLabel(daysFromToday(-3))).toBe('3d overdue')
  })

  it('labels a date within the week as "In N days"', () => {
    expect(relativeDateLabel(daysFromToday(4))).toBe('In 4 days')
  })

  it('falls back to a formatted date beyond a week out', () => {
    const label = relativeDateLabel(daysFromToday(20))
    expect(label).not.toMatch(/^In \d+ days$/)
    expect(label).not.toBe('Today')
  })

  it('handles a missing date without throwing', () => {
    expect(relativeDateLabel(null)).toBe('No date')
    expect(relativeDateLabel(undefined)).toBe('No date')
  })
})

describe('formatCurrency', () => {
  it('formats a known currency', () => {
    expect(formatCurrency(49.99, 'USD')).toContain('49.99')
  })

  it('falls back gracefully for an invalid currency code', () => {
    expect(formatCurrency(10, 'NOTREAL')).toBe('10 NOTREAL')
  })

  it('shows a placeholder for a missing amount (never claims a number that was never extracted)', () => {
    expect(formatCurrency(null, 'USD')).toBe('—')
    expect(formatCurrency(undefined, 'USD')).toBe('—')
  })
})
