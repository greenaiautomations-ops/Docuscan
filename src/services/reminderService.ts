import { supabase } from '../lib/supabase'
import type { Reminder, ReminderType } from '../types/document'

export async function listRemindersForEvent(eventId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('event_id', eventId)
    .order('reminder_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Per-event reminder customization: removes a standard reminder for just this event (e.g. user doesn't want the 7-day nudge for this particular deadline). */
export async function removeReminder(id: string): Promise<void> {
  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) throw error
}

/** Adds a one-off custom reminder for an event, or re-adds a standard offset that was previously removed. Silently no-ops on duplicates (event_id, reminder_type). */
export async function addReminder(
  userId: string,
  eventId: string,
  reminderDate: string,
  reminderType: ReminderType,
): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from('reminders')
    .upsert(
      { user_id: userId, event_id: eventId, reminder_date: reminderDate, reminder_type: reminderType },
      { onConflict: 'event_id,reminder_type', ignoreDuplicates: true },
    )
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}
