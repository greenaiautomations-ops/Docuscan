import { supabase } from '../lib/supabase'
import type { Payment, PaymentInsert, PaymentStatus, PaymentUpdate } from '../types/document'

export interface PaymentFilters {
  search?: string
  status?: string
  documentId?: string
}

export async function listPayments(filters: PaymentFilters = {}): Promise<Payment[]> {
  let query = supabase.from('payments').select('*').order('due_date', { ascending: true, nullsFirst: false })

  const term = filters.search?.trim()
  if (term) {
    query = query.or(`recipient.ilike.%${term}%,reference_number.ilike.%${term}%`)
  }
  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status as PaymentStatus)
  if (filters.documentId) query = query.eq('document_id', filters.documentId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getPayment(id: string): Promise<Payment | null> {
  const { data, error } = await supabase.from('payments').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function getPaymentsForDocument(documentId: string): Promise<Payment[]> {
  return listPayments({ documentId })
}

export async function getPaymentForEvent(eventId: string): Promise<Payment | null> {
  const { data, error } = await supabase.from('payments').select('*').eq('event_id', eventId).maybeSingle()
  if (error) throw error
  return data
}

export async function createPayment(input: Omit<PaymentInsert, 'is_user_edited'>): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...input, is_user_edited: true })
    .select()
    .single()
  if (error) throw error
  return data
}

/** All client-side edits mark the payment as user-edited, protecting it from being overwritten by reprocessing. */
export async function updatePayment(id: string, updates: PaymentUpdate): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .update({ ...updates, is_user_edited: true })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Marks a payment paid. Never called automatically — only ever a direct, explicit user action. */
export async function markPaymentPaid(id: string): Promise<Payment> {
  return updatePayment(id, { status: 'paid', paid_at: new Date().toISOString() })
}

export async function ignorePayment(id: string): Promise<Payment> {
  return updatePayment(id, { status: 'cancelled' })
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
}

export interface PaymentTotals {
  upcomingAmount: number
  overdueCount: number
}

/** Sums pending payments with a due date today or later, grouped by currency (returns the most common currency total for a simple headline figure, plus a per-currency breakdown). */
export async function getPaymentTotals(): Promise<{ byCurrency: Record<string, number>; overdueCount: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('payments')
    .select('amount, currency, due_date, status')
    .eq('status', 'pending')
  if (error) throw error

  const byCurrency: Record<string, number> = {}
  let overdueCount = 0

  for (const p of data ?? []) {
    if (p.amount == null) continue
    const currency = p.currency || '—'
    if (p.due_date && p.due_date < today) overdueCount += 1
    byCurrency[currency] = (byCurrency[currency] ?? 0) + Number(p.amount)
  }

  return { byCurrency, overdueCount }
}
