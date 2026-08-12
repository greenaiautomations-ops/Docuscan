import { parseDateOnly, parseTimeOnly } from './dateParsing.ts'
import { computePriority, type Priority } from './priority.ts'
import type { ExtractedData } from './schemas.ts'

const HIGH_IMPACT_AMOUNT = 500
const CONFIDENCE_REVIEW_THRESHOLD = 0.7

type EventType = 'deadline' | 'appointment' | 'payment_due' | 'renewal' | 'expiration' | 'task' | 'other'

interface PaymentCandidate {
  amount: number | null
  currency: string | null
  recipient: string | null
  dueDate: string | null
  referenceNumber: string | null
  confidence: number | null
}

interface EventCandidate {
  type: EventType
  sourceField: string
  title: string
  description: string | null
  eventDate: string | null
  eventTime: string | null
  location: string | null
  confidence: number | null
  forceReview: boolean
  payment?: PaymentCandidate
}

function toNumber(value: string | undefined | null): number | null {
  if (!value) return null
  const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,(?=\d{3}(\D|$))/g, '')
  const normalized = cleaned.replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : null
}

/** Maps Phase 2's AI-extracted fields into candidate calendar events (and, for payments, a companion payment record). */
export function buildEventCandidates(
  documentType: string | null,
  extractedData: ExtractedData,
): EventCandidate[] {
  const candidates: EventCandidate[] = []
  const docTitle = extractedData.document_title?.value

  // ---- Deadline ----
  if (extractedData.deadline) {
    const eventDate = parseDateOnly(extractedData.deadline.value)
    candidates.push({
      type: 'deadline',
      sourceField: 'deadline',
      title: docTitle ? `Deadline: ${docTitle}` : 'Deadline',
      description: extractedData.required_action?.value ?? null,
      eventDate,
      eventTime: null,
      location: null,
      confidence: extractedData.deadline.confidence,
      forceReview: !eventDate,
    })
  }

  // ---- Payment due ----
  if (extractedData.payment_amount || extractedData.payment_due_date) {
    const amount = toNumber(extractedData.payment_amount?.value)
    const dueDate = parseDateOnly(extractedData.payment_due_date?.value)
    const confidences = [
      extractedData.payment_amount?.confidence,
      extractedData.payment_due_date?.confidence,
    ].filter((c): c is number => typeof c === 'number')
    const confidence = confidences.length ? Math.min(...confidences) : null

    const payment: PaymentCandidate = {
      amount,
      currency: extractedData.currency?.value ?? null,
      recipient: extractedData.issuer?.value ?? null,
      dueDate,
      referenceNumber: extractedData.invoice_number?.value ?? extractedData.reference_number?.value ?? null,
      confidence,
    }

    if (extractedData.payment_due_date) {
      candidates.push({
        type: 'payment_due',
        sourceField: 'payment_due_date',
        title: amount
          ? `Payment due: ${amount}${payment.currency ? ` ${payment.currency}` : ''}`
          : 'Payment due',
        description: payment.recipient ? `To: ${payment.recipient}` : null,
        eventDate: dueDate,
        eventTime: null,
        location: null,
        confidence,
        forceReview: !dueDate || (amount ?? 0) >= HIGH_IMPACT_AMOUNT,
        payment,
      })
    }
  }

  // ---- Appointment ----
  if (extractedData.appointment_datetime) {
    const raw = extractedData.appointment_datetime.value
    const eventDate = parseDateOnly(raw)
    const eventTime = parseTimeOnly(raw)
    candidates.push({
      type: 'appointment',
      sourceField: 'appointment_datetime',
      title: docTitle ? `Appointment: ${docTitle}` : 'Appointment',
      description: extractedData.organizations?.[0]?.value ?? null,
      eventDate,
      eventTime,
      location: extractedData.addresses?.[0]?.value ?? null,
      confidence: extractedData.appointment_datetime.confidence,
      forceReview: !eventDate,
    })
  }

  // ---- Expiry / renewal ----
  if (extractedData.expiry_date) {
    const eventDate = parseDateOnly(extractedData.expiry_date.value)
    const isRenewalType = documentType != null && ['subscription', 'insurance', 'rental'].includes(documentType)
    candidates.push({
      type: isRenewalType ? 'renewal' : 'expiration',
      sourceField: 'expiry_date',
      title: docTitle
        ? `${isRenewalType ? 'Renewal' : 'Expires'}: ${docTitle}`
        : isRenewalType
          ? 'Renewal due'
          : 'Expires',
      description: null,
      eventDate,
      eventTime: null,
      location: null,
      confidence: extractedData.expiry_date.confidence,
      forceReview: !eventDate,
    })
  }

  // ---- Task (required action with no other date-bearing event covering it) ----
  if (extractedData.required_action && !extractedData.deadline) {
    candidates.push({
      type: 'task',
      sourceField: 'required_action',
      title: docTitle ? `Action needed: ${docTitle}` : 'Action needed',
      description: extractedData.required_action.value,
      eventDate: parseDateOnly(extractedData.document_date?.value ?? null),
      eventTime: null,
      location: null,
      confidence: extractedData.required_action.confidence,
      forceReview: true,
    })
  }

  return candidates
}

function statusForConfidence(confidence: number | null, forceReview: boolean): 'needs_review' | 'confirmed' {
  if (forceReview) return 'needs_review'
  if (confidence === null) return 'needs_review'
  return confidence >= CONFIDENCE_REVIEW_THRESHOLD ? 'confirmed' : 'needs_review'
}

// deno-lint-ignore no-explicit-any
export async function syncEventsAndPayments(
  supabase: any,
  document: { id: string; user_id: string; document_type: string | null; importance: string | null },
  extractedData: ExtractedData,
): Promise<string[]> {
  const candidates = buildEventCandidates(document.document_type, extractedData)
  const confirmedEventIds: string[] = []

  for (const candidate of candidates) {
    const priority: Priority = computePriority({
      eventDate: candidate.eventDate,
      amount: candidate.payment?.amount ?? null,
      documentImportance: (document.importance as 'low' | 'normal' | 'high' | null) ?? null,
      confidence: candidate.confidence,
      hasRequiredAction: candidate.type === 'task' || candidate.type === 'deadline',
    })

    const { data: existing } = await supabase
      .from('events')
      .select('id, status, is_user_edited')
      .eq('document_id', document.id)
      .eq('source_field', candidate.sourceField)
      .maybeSingle()

    let eventId: string | null = null

    if (existing) {
      // Never overwrite something the user has already acted on.
      const isLocked = existing.is_user_edited || existing.status === 'dismissed' || existing.status === 'completed'
      if (!isLocked) {
        const status = statusForConfidence(candidate.confidence, candidate.forceReview)
        await supabase
          .from('events')
          .update({
            title: candidate.title,
            description: candidate.description,
            event_date: candidate.eventDate,
            event_time: candidate.eventTime,
            location: candidate.location,
            priority,
            status,
            source_confidence: candidate.confidence,
          })
          .eq('id', existing.id)
      }
      eventId = existing.id
    } else {
      const status = statusForConfidence(candidate.confidence, candidate.forceReview)
      const { data: inserted, error } = await supabase
        .from('events')
        .insert({
          user_id: document.user_id,
          document_id: document.id,
          type: candidate.type,
          title: candidate.title,
          description: candidate.description,
          event_date: candidate.eventDate,
          event_time: candidate.eventTime,
          location: candidate.location,
          priority,
          status,
          source_confidence: candidate.confidence,
          source_field: candidate.sourceField,
        })
        .select('id')
        .single()
      if (!error) eventId = inserted.id
    }

    if (eventId) confirmedEventIds.push(eventId)

    if (candidate.payment && eventId) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, is_user_edited, status')
        .eq('event_id', eventId)
        .maybeSingle()

      if (existingPayment) {
        if (!existingPayment.is_user_edited && existingPayment.status !== 'paid') {
          await supabase
            .from('payments')
            .update({
              amount: candidate.payment.amount,
              currency: candidate.payment.currency,
              recipient: candidate.payment.recipient,
              due_date: candidate.payment.dueDate,
              reference_number: candidate.payment.referenceNumber,
              confidence: candidate.payment.confidence,
            })
            .eq('id', existingPayment.id)
        }
      } else {
        await supabase.from('payments').insert({
          user_id: document.user_id,
          document_id: document.id,
          event_id: eventId,
          amount: candidate.payment.amount,
          currency: candidate.payment.currency,
          recipient: candidate.payment.recipient,
          due_date: candidate.payment.dueDate,
          reference_number: candidate.payment.referenceNumber,
          status: 'unknown',
          confidence: candidate.payment.confidence,
        })
      }
    }
  }

  return confirmedEventIds
}

const REMINDER_OFFSETS: { type: 'seven_days' | 'three_days' | 'one_day' | 'same_day'; days: number }[] = [
  { type: 'seven_days', days: 7 },
  { type: 'three_days', days: 3 },
  { type: 'one_day', days: 1 },
  { type: 'same_day', days: 0 },
]

/** Creates reminders for confirmed, future-dated events per the user's notification preferences. Duplicate-safe via the (event_id, reminder_type) unique constraint. */
// deno-lint-ignore no-explicit-any
export async function createRemindersForEvents(supabase: any, userId: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return

  const [{ data: prefs }, { data: events }] = await Promise.all([
    supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('events').select('id, event_date, status').in('id', eventIds),
  ])

  const enabledOffsets = REMINDER_OFFSETS.filter((offset) => {
    if (!prefs) return true // default all-on if the row is somehow missing
    if (offset.type === 'seven_days') return prefs.seven_days
    if (offset.type === 'three_days') return prefs.three_days
    if (offset.type === 'one_day') return prefs.one_day
    return prefs.same_day
  })

  const todayUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())

  for (const event of events ?? []) {
    if (event.status !== 'confirmed' || !event.event_date) continue

    for (const offset of enabledOffsets) {
      const [y, m, d] = event.event_date.split('-').map(Number)
      const reminderUtc = Date.UTC(y, m - 1, d - offset.days)
      if (reminderUtc < todayUtc) continue // don't back-date reminders for near-term events

      const reminderDate = new Date(reminderUtc).toISOString().slice(0, 10)

      // Duplicate (event_id, reminder_type) is expected whenever a document
      // is reprocessed — ignoreDuplicates makes this a safe no-op instead of
      // an error, satisfying "do not create duplicate reminders".
      await supabase.from('reminders').upsert(
        {
          user_id: userId,
          event_id: event.id,
          reminder_date: reminderDate,
          reminder_type: offset.type,
        },
        { onConflict: 'event_id,reminder_type', ignoreDuplicates: true },
      )
    }
  }
}
