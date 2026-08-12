import { defineConfig } from 'vitest/config'

// Covers pure-logic "critical flow" units that don't need a live Supabase
// project or a browser DOM: rule-based priority scoring, AI-extracted date
// parsing, and calendar/currency formatters. Run with `npm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
