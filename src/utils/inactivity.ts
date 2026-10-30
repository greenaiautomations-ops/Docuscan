export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000
export const activityKey = (userId: string) => `docvault:last-activity:${userId}`
export function isInactive(lastActivity: number, now = Date.now()): boolean {
  return !Number.isFinite(lastActivity) || lastActivity <= 0 || now - lastActivity >= INACTIVITY_TIMEOUT_MS
}
