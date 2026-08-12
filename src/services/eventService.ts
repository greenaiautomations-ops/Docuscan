import { supabase } from '../lib/supabase'
import type { Event, EventInsert, EventPriority, EventStatus, EventType, EventUpdate } from '../types/document'

export interface EventFilters {
  search?: string
  type?: string
  status?: string
  priority?: string
  documentId?: string
  dateFrom?: string
  dateTo?: string
}

export async function listEvents(filters: EventFilters = {}): Promise<Event[]> {
  let query = supabase.from('events').select('*').order('event_date', { ascending: true, nullsFirst: false })

  const term = filters.search?.trim()
  if (term) {
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`)
  }
  if (filters.type && filters.type !== 'all') query = query.eq('type', filters.type as EventType)
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status as EventStatus)
  if (filters.priority && filters.priority !== 'all') query = query.eq('priority', filters.priority as EventPriority)
  if (filters.documentId) query = query.eq('document_id', filters.documentId)
  if (filters.dateFrom) query = query.gte('event_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('event_date', filters.dateTo)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getEventsForDocument(documentId: string): Promise<Event[]> {
  return listEvents({ documentId })
}

export async function createEvent(
  input: Omit<EventInsert, 'user_id' | 'source_field' | 'is_user_edited'> & { user_id: string },
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .insert({ ...input, is_user_edited: true })
    .select()
    .single()
  if (error) throw error
  return data
}

/** All client-side edits are, by definition, user edits — this permanently protects the row from being silently overwritten by future AI reprocessing. */
export async function updateEvent(id: string, updates: EventUpdate): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({ ...updates, is_user_edited: true })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function confirmEvent(id: string): Promise<Event> {
  return updateEvent(id, { status: 'confirmed' })
}

export async function dismissEvent(id: string): Promise<Event> {
  return updateEvent(id, { status: 'dismissed' })
}

export async function completeEvent(id: string): Promise<Event> {
  return updateEvent(id, { status: 'completed' })
}

export async function snoozeEvent(id: string, newDate: string): Promise<Event> {
  return updateEvent(id, { event_date: newDate })
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}

/** Events in the next N days (inclusive), confirmed/needs_review only (not dismissed/completed). Used by the Dashboard. */
export async function getUpcomingEvents(days: number): Promise<Event[]> {
  const today = new Date()
  const end = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', today.toISOString().slice(0, 10))
    .lte('event_date', end.toISOString().slice(0, 10))
    .in('status', ['needs_review', 'confirmed'])
    .order('event_date', { ascending: true })
  if (error) throw error
  return data ?? []
}
