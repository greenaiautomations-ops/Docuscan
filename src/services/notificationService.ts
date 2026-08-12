import { supabase } from '../lib/supabase'
import type { Notification, UnifiedNotification } from '../types/document'

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
  if (error) throw error
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------
// Notification Center — merges Phase 1's document-status `notifications`
// with Phase 3's event/reminder-driven `notification_events` into one feed.
// ---------------------------------------------------------------------

export async function listUnifiedNotifications(): Promise<UnifiedNotification[]> {
  const [docRes, eventRes] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('notification_events').select('*').order('created_at', { ascending: false }),
  ])
  if (docRes.error) throw docRes.error
  if (eventRes.error) throw eventRes.error

  const fromDocs: UnifiedNotification[] = (docRes.data ?? []).map((n) => ({
    id: n.id,
    source: 'document',
    type: n.type,
    title: n.title,
    message: n.message,
    documentId: n.document_id,
    eventId: null,
    read: n.read,
    createdAt: n.created_at,
  }))

  const fromEvents: UnifiedNotification[] = (eventRes.data ?? []).map((n) => ({
    id: n.id,
    source: 'event',
    type: n.type,
    title: n.title,
    message: n.message,
    documentId: null,
    eventId: n.event_id,
    read: n.read,
    createdAt: n.created_at,
  }))

  return [...fromDocs, ...fromEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getUnreadNotificationCount(): Promise<number> {
  const [docRes, eventRes] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false),
    supabase.from('notification_events').select('id', { count: 'exact', head: true }).eq('read', false),
  ])
  if (docRes.error) throw docRes.error
  if (eventRes.error) throw eventRes.error
  return (docRes.count ?? 0) + (eventRes.count ?? 0)
}

export async function markUnifiedAsRead(notification: UnifiedNotification): Promise<void> {
  const table = notification.source === 'document' ? 'notifications' : 'notification_events'
  const { error } = await supabase.from(table).update({ read: true }).eq('id', notification.id)
  if (error) throw error
}

export async function markAllUnifiedAsRead(): Promise<void> {
  const [a, b] = await Promise.all([
    supabase.from('notifications').update({ read: true }).eq('read', false),
    supabase.from('notification_events').update({ read: true }).eq('read', false),
  ])
  if (a.error) throw a.error
  if (b.error) throw b.error
}

export async function deleteUnifiedNotification(notification: UnifiedNotification): Promise<void> {
  const table = notification.source === 'document' ? 'notifications' : 'notification_events'
  const { error } = await supabase.from(table).delete().eq('id', notification.id)
  if (error) throw error
}
