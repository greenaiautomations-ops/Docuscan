export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return formatDate(dateString)
}

export function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}

/** Formats a plain "YYYY-MM-DD" date column without going through the Date
 * constructor's implicit UTC-midnight parsing (which can shift the
 * displayed day depending on the browser's local timezone). */
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTimeOnly(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  const date = new Date()
  date.setHours(h, m, 0, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatCurrency(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return '—'
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount)
  } catch {
    return `${amount}${currency ? ` ${currency}` : ''}`
  }
}

/** Days between today and a "YYYY-MM-DD" date (negative = overdue). Timezone-safe: compares calendar dates, not instants. */
export function daysUntil(dateStr: string): number {
  const today = new Date()
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetUtc = Date.UTC(y, m - 1, d)
  return Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24))
}

export function relativeDateLabel(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No date'
  const diff = daysUntil(dateStr)
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff <= 7) return `In ${diff} days`
  return formatDateOnly(dateStr)
}

/**
 * Turns a raw AI/OCR provider error (often a verbose JSON blob from Gemini)
 * into a short, actionable message for end users, while preserving the raw
 * text for anyone who wants to look closer via the browser console/network
 * tab. Known transient conditions (rate limit, overload) get a specific,
 * reassuring message instead of a wall of JSON.
 */
export function friendlyProcessingError(raw: string | null | undefined): string {
  if (!raw) return 'Processing failed.'

  const lower = raw.toLowerCase()

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return "AI usage limit reached for right now — this app's free-tier AI quota resets " +
      'quickly. Wait a minute, then click Retry.'
  }

  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('overloaded')) {
    return 'The AI service is temporarily busy. Click Retry in a few seconds.'
  }

  if (lower.includes('gemini_api_key is not configured') || lower.includes('api key not valid')) {
    return raw // Already a clear, actionable message — don't obscure it.
  }

  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw
}
