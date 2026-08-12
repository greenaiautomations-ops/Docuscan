export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface PriorityInput {
  eventDate: string | null // YYYY-MM-DD
  amount?: number | null
  documentImportance?: 'low' | 'normal' | 'high' | null
  confidence?: number | null
  hasRequiredAction?: boolean
}

/**
 * Rule-based priority scoring — intentionally NOT delegated to the AI, per
 * spec ("keep this rule-based initially; do not let AI arbitrarily assign
 * critical actions"). Factors: deadline proximity, payment amount, document
 * importance, overdue status, AI confidence, presence of a required action.
 */
export function computePriority({
  eventDate,
  amount,
  documentImportance,
  confidence,
  hasRequiredAction,
}: PriorityInput): Priority {
  let score = 0

  if (eventDate) {
    const daysUntil = daysBetweenTodayAnd(eventDate)
    if (daysUntil < 0) score += 3 // overdue
    else if (daysUntil <= 1) score += 3
    else if (daysUntil <= 3) score += 2
    else if (daysUntil <= 7) score += 1
  }

  if (typeof amount === 'number') {
    if (amount >= 500) score += 2
    else if (amount >= 100) score += 1
  }

  if (documentImportance === 'high') score += 1

  if (hasRequiredAction) score += 1

  if (typeof confidence === 'number' && confidence < 0.5) score -= 1

  if (score >= 5) return 'critical'
  if (score >= 3) return 'high'
  if (score >= 1) return 'medium'
  return 'low'
}

function daysBetweenTodayAnd(dateStr: string): number {
  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetUtc = Date.UTC(y, m - 1, d)
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24))
}
