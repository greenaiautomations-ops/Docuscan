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

describe('friendlyProcessingError', () => {
  it('turns a Gemini 429 quota error into an actionable message', async () => {
    const { friendlyProcessingError } = await import('../src/utils/formatters')
    const raw =
      'Gemini API error (429): { "error": { "code": 429, "message": "You exceeded your current quota...", "status": "RESOURCE_EXHAUSTED" } }'
    const friendly = friendlyProcessingError(raw)
    expect(friendly).not.toContain('RESOURCE_EXHAUSTED')
    expect(friendly.toLowerCase()).toContain('limit')
  })

  it('turns a 503 overload error into an actionable message', async () => {
    const { friendlyProcessingError } = await import('../src/utils/formatters')
    const friendly = friendlyProcessingError('Gemini API error (503): { "status": "UNAVAILABLE" }')
    expect(friendly.toLowerCase()).toContain('busy')
  })

  it('passes through a missing-API-key error unchanged (already actionable)', async () => {
    const { friendlyProcessingError } = await import('../src/utils/formatters')
    const raw = 'GEMINI_API_KEY is not configured. Set it with `supabase secrets set ...`'
    expect(friendlyProcessingError(raw)).toBe(raw)
  })

  it('falls back to a generic label when there is no error text', async () => {
    const { friendlyProcessingError } = await import('../src/utils/formatters')
    expect(friendlyProcessingError(null)).toBe('Processing failed.')
    expect(friendlyProcessingError(undefined)).toBe('Processing failed.')
  })

  it('strips the DOCUMENT_LIMIT_REACHED prefix into a clean message', async () => {
    const { friendlyProcessingError } = await import('../src/utils/formatters')
    const raw = 'DOCUMENT_LIMIT_REACHED: Your plan allows 10 documents. Upgrade to upload more.'
    const friendly = friendlyProcessingError(raw)
    expect(friendly).not.toContain('DOCUMENT_LIMIT_REACHED')
    expect(friendly).toContain('Upgrade to upload more.')
  })

  it('strips the FEATURE_LOCKED prefix into a clean message', async () => {
    const { friendlyProcessingError } = await import('../src/utils/formatters')
    const raw = 'FEATURE_LOCKED: Ask AI is included from the Pro plan. Upgrade to unlock it.'
    const friendly = friendlyProcessingError(raw)
    expect(friendly).not.toContain('FEATURE_LOCKED')
    expect(friendly).toContain('Upgrade to unlock it.')
  })
})

describe('isUpgradeError', () => {
  it('detects DOCUMENT_LIMIT_REACHED and FEATURE_LOCKED errors', async () => {
    const { isUpgradeError } = await import('../src/utils/formatters')
    expect(isUpgradeError('DOCUMENT_LIMIT_REACHED: Your plan allows 10 documents.')).toBe(true)
    expect(isUpgradeError('FEATURE_LOCKED: Explain is included from the Basic plan.')).toBe(true)
    expect(isUpgradeError('Some other error')).toBe(false)
    expect(isUpgradeError(null)).toBe(false)
    expect(isUpgradeError(undefined)).toBe(false)
  })
})
