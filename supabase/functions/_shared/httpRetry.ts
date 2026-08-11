/**
 * Fetches with exponential-backoff retries for transient failures
 * (503 model-overloaded, 429 rate-limited) — Gemini's free tier returns
 * these fairly often under load. Non-transient statuses (400, 401, 404, ...)
 * are returned immediately for the caller to handle/throw on as usual.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
): Promise<Response> {
  let lastResponse: Response | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options)
    if (response.ok) return response

    lastResponse = response
    const isTransient = response.status === 503 || response.status === 429
    if (!isTransient || attempt === maxRetries) {
      return response
    }

    const delayMs = 1000 * 2 ** attempt // 1s, 2s, 4s
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return lastResponse as Response
}
