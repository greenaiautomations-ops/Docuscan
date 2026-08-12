// Supabase Edge Function: process-reminders (scheduled, service-role)
//
// Runs periodically (see README "Set up scheduled reminders") to:
//   1. Find unsent reminders whose reminder_date has arrived, in each
//      user's own timezone.
//   2. Create a notification_events row per due reminder.
//   3. Mark those reminders as sent.
//
// Never relies on the browser being open — this is the server-side half of
// the reminder engine; the client only ever reads notification_events.

import { handleCors, jsonResponse } from '../_shared/cors.ts'
import { getServiceRoleClient, HttpError } from '../_shared/supabaseClient.ts'

const REMINDER_LABEL: Record<string, string> = {
  seven_days: '7-day',
  three_days: '3-day',
  one_day: '1-day',
  same_day: 'same-day',
  custom: '',
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    // deno-lint-ignore no-explicit-any
    const supabase: any = getServiceRoleClient(req)

    // Broad, timezone-safe upper bound: anything that could plausibly be
    // "due" somewhere on Earth right now. Precise per-user due-ness is
    // decided below using each user's profile timezone.
    const tomorrowUtc = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: candidates, error: fetchError } = await supabase
      .from('reminders')
      .select(
        'id, user_id, event_id, reminder_date, reminder_type, ' +
          'events!inner(id, title, type, event_date, event_time, location, document_id, status)',
      )
      .eq('sent', false)
      .lte('reminder_date', tomorrowUtc)
      .eq('events.status', 'confirmed')
      .limit(500)

    if (fetchError) throw new HttpError(500, fetchError.message)
    if (!candidates || candidates.length === 0) {
      return jsonResponse({ success: true, processed: 0 })
    }

    const userIds = [...new Set(candidates.map((c: { user_id: string }) => c.user_id))]
    const eventIds = [...new Set(candidates.map((c: { event_id: string }) => c.event_id))]

    const [{ data: profiles }, { data: payments }] = await Promise.all([
      supabase.from('profiles').select('user_id, timezone').in('user_id', userIds),
      supabase.from('payments').select('event_id, amount, currency').in('event_id', eventIds),
    ])

    const timezoneByUser = new Map<string, string>(
      (profiles ?? []).map((p: { user_id: string; timezone: string }) => [p.user_id, p.timezone || 'UTC']),
    )
    const paymentByEvent = new Map(
      (payments ?? []).map((p: { event_id: string; amount: number | null; currency: string | null }) => [
        p.event_id,
        p,
      ]),
    )

    const dueReminderIds: string[] = []
    const notificationRows: {
      user_id: string
      event_id: string
      type: string
      title: string
      message: string
    }[] = []
    const errors: string[] = []

    for (const reminder of candidates) {
      try {
        const timezone = timezoneByUser.get(reminder.user_id) ?? 'UTC'
        const todayLocal = todayInTimezone(timezone)
        if (reminder.reminder_date > todayLocal) continue // not due yet in this user's zone

        const event = reminder.events
        if (!event?.event_date) continue

        const daysUntil = daysBetween(todayLocal, event.event_date)
        const payment = paymentByEvent.get(event.id)
        const message = buildReminderMessage(event, daysUntil, payment)

        dueReminderIds.push(reminder.id)
        notificationRows.push({
          user_id: reminder.user_id,
          event_id: event.id,
          type: 'reminder',
          title: event.title,
          message,
        })
      } catch (err) {
        errors.push(`reminder ${reminder.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    if (notificationRows.length > 0) {
      const { error: insertError } = await supabase.from('notification_events').insert(notificationRows)
      if (insertError) throw new HttpError(500, `Failed to insert notifications: ${insertError.message}`)

      const { error: updateError } = await supabase
        .from('reminders')
        .update({ sent: true })
        .in('id', dueReminderIds)
      if (updateError) throw new HttpError(500, `Failed to mark reminders sent: ${updateError.message}`)
    }

    return jsonResponse({
      success: true,
      processed: notificationRows.length,
      skipped: candidates.length - notificationRows.length - errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    if (err instanceof HttpError) return jsonResponse({ error: err.message }, err.status)
    const message = err instanceof Error ? err.message : 'Unexpected error.'
    return jsonResponse({ error: message }, 500)
  }
})

function todayInTimezone(timeZone: string): string {
  try {
    // en-CA formats as YYYY-MM-DD, which is exactly the `date` column shape.
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function daysBetween(fromDate: string, toDate: string): number {
  const [fy, fm, fd] = fromDate.split('-').map(Number)
  const [ty, tm, td] = toDate.split('-').map(Number)
  const fromUtc = Date.UTC(fy, fm - 1, fd)
  const toUtc = Date.UTC(ty, tm - 1, td)
  return Math.round((toUtc - fromUtc) / (1000 * 60 * 60 * 24))
}

interface EventRow {
  id: string
  title: string
  type: string
  event_date: string
  event_time: string | null
  location: string | null
}

function buildReminderMessage(
  event: EventRow,
  daysUntil: number,
  payment?: { amount: number | null; currency: string | null },
): string {
  const when = daysUntil <= 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`
  const bareTitle = event.title.replace(/^(Deadline|Payment due|Appointment|Renewal|Expires|Action needed):\s*/, '')

  switch (event.type) {
    case 'payment_due':
      return payment?.amount != null
        ? `Payment of ${payment.currency ?? ''}${payment.amount} is due ${when}.`
        : `A payment is due ${when}.`
    case 'appointment':
      return event.event_time
        ? `Appointment ${when} at ${event.event_time}${event.location ? ` (${event.location})` : ''}.`
        : `Appointment ${when}.`
    case 'renewal':
      return `${bareTitle} renews ${when}.`
    case 'expiration':
      return `${bareTitle} expires ${when}.`
    case 'deadline':
      return `${bareTitle} deadline is ${when}.`
    case 'task':
      return `Action needed ${when}: ${bareTitle}`
    default:
      return `${bareTitle} — ${when}.`
  }
}
