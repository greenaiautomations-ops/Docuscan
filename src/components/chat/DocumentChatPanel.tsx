import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { listChatMessages, sendChatMessage } from '../../services/chatService'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { friendlyProcessingError, isUpgradeError } from '../../utils/formatters'
import type { ChatMessage } from '../../types/document'

interface DocumentChatPanelProps {
  documentId: string
  open: boolean
  onClose: () => void
  initialQuestion?: string | null
  /** 'explain' (Basic+) vs freeform 'chat'/Ask AI (Pro) — they share this panel but the server checks a different entitlement for each. */
  mode?: 'explain' | 'chat'
}

export function DocumentChatPanel({ documentId, open, onClose, initialQuestion, mode = 'chat' }: DocumentChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoSentRef = useRef(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    listChatMessages(documentId)
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load chat.'))
      .finally(() => setLoading(false))
  }, [open, documentId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (open && initialQuestion && !autoSentRef.current && !loading && messages.length === 0) {
      autoSentRef.current = true
      void handleSend(initialQuestion)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuestion, loading])

  useEffect(() => {
    if (!open) autoSentRef.current = false
  }, [open])

  const handleSend = async (text: string) => {
    const question = text.trim()
    if (!question || sending) return
    setError(null)
    setInput('')
    setSending(true)
    setMessages((prev) => [
      ...prev,
      { id: `optimistic-${Date.now()}`, user_id: '', document_id: documentId, role: 'user', content: question, created_at: new Date().toISOString() },
    ])
    try {
      await sendChatMessage(documentId, question, mode)
      // Refetch so both the user turn and the assistant reply have real ids.
      const fresh = await listChatMessages(documentId)
      setMessages(fresh)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.')
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('optimistic-')))
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ask AI about this document</h2>
        <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400" aria-label="Close chat">
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <LoadingSpinner label="Loading chat…" />
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Ask things like &quot;What is this document about?&quot; or &quot;When is the deadline?&quot;
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages
              .filter((m) => !m.id.startsWith('optimistic-') || m.role === 'user')
              .map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-auto bg-indigo-600 text-white'
                      : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {m.content}
                </div>
              ))}
            {sending && <div className="mr-auto text-xs text-slate-400 dark:text-slate-500">Thinking…</div>}
          </div>
        )}
        {error && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {friendlyProcessingError(error)}
            {isUpgradeError(error) && (
              <>
                {' '}
                <Link to="/billing" className="font-medium underline underline-offset-2" onClick={onClose}>
                  View plans
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSend(input)
        }}
        className="flex gap-2 border-t border-slate-200 dark:border-slate-700 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={sending}
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  )
}
