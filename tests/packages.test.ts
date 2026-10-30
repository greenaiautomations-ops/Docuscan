import { expect, it } from 'vitest'
import { TIERS, PACKAGE_LIMITS, computeEntitlements } from '../src/utils/entitlements'
import { TIERS as serverTiers } from '../supabase/functions/_shared/entitlements'
it('keeps launch prices, stored-document limits, and included AI questions consistent', () => {
  expect(Object.values(TIERS).map(t => t.priceEuros)).toEqual([0,6.99,17.99,49])
  expect(Object.values(TIERS).map(t => t.documentLimit)).toEqual([20,200,1500,5000])
  for (const tier of ['free','basic','pro','enterprise'] as const) {
    expect(TIERS[tier].documentLimit).toBe(serverTiers[tier].documentLimit)
    expect(TIERS[tier].askAi).toBe(true)
    expect(serverTiers[tier].askAi).toBe(true)
  }
  expect(Object.values(PACKAGE_LIMITS).map(t => t.pages)).toEqual([30,150,750,2000])
  expect(Object.values(PACKAGE_LIMITS).map(t => t.questions)).toEqual([3,30,200,500])
})
it('falls back to Free on an inactive subscription without dropping the included AI questions', () => {
  const plan = computeEntitlements({ role:'user',is_comp_access:false,subscription_tier:'enterprise',subscription_status:'canceled' })
  expect(plan.tier).toBe('free'); expect(plan.documentLimit).toBe(20); expect(plan.askAi).toBe(true)
})
