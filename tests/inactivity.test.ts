import { describe, expect, it } from 'vitest'
import { activityKey, INACTIVITY_TIMEOUT_MS, isInactive } from '../src/utils/inactivity'

describe('inactivity expiry', () => {
  const last = 1_800_000_000_000
  it('expires at exactly ten minutes, including after device sleep', () => {
    expect(isInactive(last, last + INACTIVITY_TIMEOUT_MS - 1)).toBe(false)
    expect(isInactive(last, last + INACTIVITY_TIMEOUT_MS)).toBe(true)
    expect(isInactive(last, last + 60 * 60 * 1000)).toBe(true)
  })
  it('uses the persisted timestamp rather than granting a new session on reload', () => {
    const persisted = String(last)
    expect(isInactive(Number(persisted), last + INACTIVITY_TIMEOUT_MS)).toBe(true)
  })
  it('rejects corrupt timestamps and isolates users', () => {
    expect(isInactive(NaN)).toBe(true)
    expect(isInactive(0)).toBe(true)
    expect(activityKey('alice')).not.toBe(activityKey('bob'))
  })
})
