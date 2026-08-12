/**
 * Fetches with backoff retries for transient failures (503 model-overloaded,
 * 429 rate-limited) — Gemini's free tier returns these under load or when a
 * daily/per-minute quota is close to its limit.
 *
 * For 429s, Gemini's error body usually tells us exactly how long to wait
 * (either a structured `retryDelay` like "16s" inside error.details, or the
 * phrase "Please retry in 16.0s" in the message). We parse and honor that
 * instead of guessing with a fixed backoff — waiting less just wastes the
 * retry, and Edge Functions have a limited execution window so we also cap
 * how long any single wait (or the whole retry budget) can run.
 */

const MAX_SINGLE_WAIT_MS = 20_000
const MAX_TOTAL_WAIT_MS = 30_000

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastResponse: Response | null = null
  let totalWaitedMs = 0

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)
    if (response.ok) return response

    lastResponse = response
    const isTransient = response.status === 503 || response.status === 429
    if (!isTransient || attempt === maxRetries) {
      return response
    }

    const suggestedMs = response.status === 429 ? await readSuggestedDelayMs(response) : null
    const fallbackMs = 1000 * 2 ** attempt // 1s, 2s, 4s
    const delayMs = Math.min(suggestedMs ?? fallbackMs, MAX_SINGLE_WAIT_MS)

    if (totalWaitedMs + delayMs > MAX_TOTAL_WAIT_MS) {
      // Waiting further would blow the Edge Function's execution window —
      // stop retrying and let the caller surface the error instead of
      // silently timing out mid-wait.
      return response
    }

    totalWaitedMs += delayMs
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return lastResponse as Response
}

/** Reads (without consuming) a 429 response body to find Google's suggested retry delay. */
async function readSuggestedDelayMs(response: Response): Promise<number | null> {
  try {
    const body = await response.clone().text()

    // Structured form: {"error":{"details":[{"@type":"...RetryInfo","retryDelay":"16s"}]}}
    const structuredMatch = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/)
    if (structuredMatch) return Math.ceil(Number(structuredMatch[1]) * 1000)

    // Free-text form embedded in the message: "Please retry in 16.015271137s."
    const textMatch = body.match(/retry in\s+(\d+(?:\.\d+)?)s/i)
    if (textMatch) return Math.ceil(Number(textMatch[1]) * 1000)

    return null
  } catch {
    return null
  }
}
