import { supabase } from '../lib/supabase'
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

/** Sends a question to the chat-with-document Edge Function and returns the assistant's reply. */
export async function sendChatMessage(
  documentId: string,
  message: string,
): Promise<SendChatMessageResult> {
  const { data, error } = await supabase.functions.invoke('chat-with-document', {
    body: { documentId, message },
  })

  if (error) throw new Error(error.message ?? 'Failed to send message.')
  if (data?.error) throw new Error(data.error)
  return data as SendChatMessageResult
}

export async function clearChatHistory(documentId: string): Promise<void> {
  const { error } = await supabase
    .from('document_chat_messages')
    .delete()
    .eq('document_id', documentId)
  if (error) throw error
}
