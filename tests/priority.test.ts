import { describe, expect, it } from 'vitest'
import { computePriority } from '../supabase/functions/_shared/priority.ts'

function daysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe('computePriority (rule-based, never AI-arbitrary)', () => {
  it('flags an overdue deadline as at least high priority', () => {
    expect(computePriority({ eventDate: daysFromToday(-2) })).toBe('high')
  })

  it('flags a due-tomorrow deadline as at least high priority', () => {
    expect(computePriority({ eventDate: daysFromToday(1) })).toBe('high')
  })

  it('escalates to critical when overdue combines with a large amount and a required action', () => {
    expect(
      computePriority({ eventDate: daysFromToday(-1), amount: 600, hasRequiredAction: true }),
    ).toBe('critical')
  })

  it('escalates a medium-distance deadline when the amount is large', () => {
    // 5 days out alone would be "low"; a large amount pushes it up.
    expect(computePriority({ eventDate: daysFromToday(5), amount: 750 })).toBe('high')
  })

  it('treats a far-out, low-amount, low-confidence item as low priority', () => {
    expect(
      computePriority({ eventDate: daysFromToday(30), amount: 10, confidence: 0.3 }),
    ).toBe('low')
  })

  it('a required action nudges priority up even without a date', () => {
    const withoutAction = computePriority({ eventDate: null })
    const withAction = computePriority({ eventDate: null, hasRequiredAction: true })
    expect(withoutAction).toBe('low')
    expect(withAction).not.toBe('low')
  })

  it('high document importance contributes to a higher score', () => {
    const base = computePriority({ eventDate: daysFromToday(6) })
    const important = computePriority({ eventDate: daysFromToday(6), documentImportance: 'high' })
    // Both should be valid priorities; importance should never lower it.
    const order = { low: 0, medium: 1, high: 2, critical: 3 }
    expect(order[important]).toBeGreaterThanOrEqual(order[base])
  })

  it('low AI confidence pulls priority down, never up', () => {
    const confident = computePriority({ eventDate: daysFromToday(2), confidence: 0.95 })
    const unsure = computePriority({ eventDate: daysFromToday(2), confidence: 0.2 })
    const order = { low: 0, medium: 1, high: 2, critical: 3 }
    expect(order[unsure]).toBeLessThanOrEqual(order[confident])
  })
})
