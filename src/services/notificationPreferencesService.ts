import { supabase } from '../lib/supabase'
import type { NotificationPreferences } from '../types/document'

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Pick<NotificationPreferences, 'seven_days' | 'three_days' | 'one_day' | 'same_day'>>,
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}
