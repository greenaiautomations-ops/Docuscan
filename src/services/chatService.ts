import { supabase } from '../lib/supabase'
import { invokeFunction } from '../lib/functionsClient'
import type { ChatMessage } from '../types/document'

export async function listChatMessages(documentId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('document_chat_messages')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface SendChatMessageResult {
  reply: string
  message: ChatMessage
}

/** Sends a question to the chat-with-document Edge Function and returns the assistant's reply.
 * `mode` distinguishes "Explain" (Basic+) from freeform "Ask AI" (Pro) — they share this same
 * Edge Function, but the server checks a different entitlement depending on which one this is. */
export async function sendChatMessage(
  documentId: string,
  message: string,
  mode: 'explain' | 'chat' = 'chat',
): Promise<SendChatMessageResult> {
  return invokeFunction<SendChatMessageResult>('chat-with-document', { documentId, message, mode })
}

export async function clearChatHistory(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('document_chat_messages')
    .delete()
    .eq('document_id', documentId)
  if (error) throw error
}
