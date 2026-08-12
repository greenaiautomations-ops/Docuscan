import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getDocument,
  getDocumentAnalysis,
  getDocumentOcr,
  setImportant,
  setArchived,
} from '../services/documentService'
import { getSignedUrl } from '../services/storageService'
import { removeDocument } from '../services/uploadService'
import { processDocument } from '../services/processingService'
import { useDocumentProcessing } from '../hooks/useDocumentProcessing'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { StatusBadge, ImportanceBadge } from '../components/common/Badge'
import { ProcessingStatus } from '../components/documents/ProcessingStatus'
import { AiSummaryCard } from '../components/analysis/AiSummaryCard'
import { DocumentTypeCard } from '../components/analysis/DocumentTypeCard'
import { ImportantInfoSection } from '../components/analysis/ImportantInfoSection'
import { DatesSection } from '../components/analysis/DatesSection'
import { PaymentsSection } from '../components/analysis/PaymentsSection'
import { RequiredActionSection } from '../components/analysis/RequiredActionSection'
import { ExtractedDataRaw } from '../components/analysis/ExtractedDataRaw'
import { EditInformationModal } from '../components/analysis/EditInformationModal'
import { DocumentChatPanel } from '../components/chat/DocumentChatPanel'
import { TranslatePanel } from '../components/translation/TranslatePanel'
import { AppointmentCard } from '../components/events/AppointmentCard'
import { DeadlineCard } from '../components/events/DeadlineCard'
import { PaymentCard } from '../components/events/PaymentCard'
import { EventModal } from '../components/events/EventModal'
import { PaymentModal } from '../components/events/PaymentModal'
import { getEventsForDocument, completeEvent, snoozeEvent } from '../services/eventService'
import { getPaymentsForDocument, markPaymentPaid } from '../services/paymentService'
import { formatDateTime, formatFileSize, titleCase } from '../utils/formatters'
import type { DocumentAnalysis, DocumentOcr, Event, ExtractedData, Payment } from '../types/document'

export function DocumentViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { document, setDocument, loading, error, refresh } = useDocumentProcessing(id)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
  const [ocr, setOcr] = useState<DocumentOcr | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatQuestion, setChatQuestion] = useState<string | null>(null)
  const [translateOpen, setTranslateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState<string | null>(null)
  const [linkedEvents, setLinkedEvents] = useState<Event[]>([])
  const [linkedPayments, setLinkedPayments] = useState<Payment[]>([])
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  const isAnalyzed = document?.status === 'analyzed' || document?.status === 'completed'

  useEffect(() => {
    if (!document?.file_path) return
    let cancelled = false
    getSignedUrl(document.file_path)
      .then((url) => !cancelled && setPreviewUrl(url))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [document?.file_path])

  useEffect(() => {
    if (!document || !isAnalyzed) return
    let cancelled = false
    Promise.all([getDocumentAnalysis(document.id), getDocumentOcr(document.id)]).then(
      ([a, o]) => {
        if (cancelled) return
        setAnalysis(a)
        setOcr(o)
      },
    )
    return () => {
      cancelled = true
    }
  }, [document?.id, document?.status, isAnalyzed])

  useEffect(() => {
    if (!document?.id) return
    let cancelled = false
    Promise.all([getEventsForDocument(document.id), getPaymentsForDocument(document.id)])
      .then(([events, payments]) => {
        if (cancelled) return
        setLinkedEvents(events.filter((e) => e.status !== 'dismissed'))
        setLinkedPayments(payments)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [document?.id])

  const handleToggleImportant = async () => {
    if (!document) return
    const updated = await setImportant(document.id, !document.is_important)
    setDocument(updated)
  }

  const handleToggleArchive = async () => {
    if (!document) return
    const updated = await setArchived(document.id, !document.is_archived)
    setDocument(updated)
  }

  const handleRetry = useCallback(async () => {
    if (!document) return
    setRetrying(true)
    setRetryError(null)
    try {
      await processDocument(document.id)
    } catch (err) {
      // The Edge Function also records failure on the document row itself
      // (status='failed' + error_message), which refresh() below picks up —
      // this local error is just so the button shows *why* immediately,
      // without waiting for the next poll tick.
      setRetryError(err instanceof Error ? err.message : 'Retry failed.')
    } finally {
      setRetrying(false)
      refresh()
    }
  }, [document, refresh])

  const handleDelete = async () => {
    if (!document) return
    await removeDocument(document)
    navigate('/documents', { replace: true })
  }

  const openExplain = () => {
    setChatQuestion('Explain this document to me in simple terms.')
    setChatOpen(true)
  }

  const openAskAi = () => {
    setChatQuestion(null)
    setChatOpen(true)
  }

  const handleCompleteLinkedEvent = async (event: Event) => {
    const updated = await completeEvent(event.id)
    setLinkedEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  const handleSnoozeLinkedEvent = async (event: Event) => {
    if (!event.event_date) return
    const next = new Date(`${event.event_date}T00:00:00`)
    next.setDate(next.getDate() + 3)
    const updated = await snoozeEvent(event.id, next.toISOString().slice(0, 10))
    setLinkedEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  const handleLinkedEventChanged = (updated: Event | null) => {
    setLinkedEvents((prev) =>
      updated ? prev.map((e) => (e.id === updated.id ? updated : e)) : prev.filter((e) => e.id !== editingEvent?.id),
    )
    setEditingEvent(null)
  }

  const handleMarkLinkedPaymentPaid = async (payment: Payment) => {
    const updated = await markPaymentPaid(payment.id)
    setLinkedPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const handleLinkedPaymentChanged = (updated: Payment | null) => {
    setLinkedPayments((prev) =>
      updated ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev.filter((p) => p.id !== editingPayment?.id),
    )
    setEditingPayment(null)
  }

  if (loading) return <LoadingSpinner fullHeight label="Loading document…" />
  if (error) return <ErrorMessage message={error} onRetry={() => getDocument(id ?? '')} />
  if (!document) return null

  const isImage = document.file_type.startsWith('image/')
  const isPdf = document.file_type === 'application/pdf'
  const extractedData = analysis?.extracted_data as unknown as ExtractedData | undefined

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{document.title}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={document.status} />
              <ImportanceBadge importance={document.importance} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewUrl && (
              <a
                href={previewUrl}
                download
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Download
              </a>
            )}
            <button
              onClick={handleToggleImportant}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {document.is_important ? 'Unmark important' : 'Mark important'}
            </button>
            <button
              onClick={handleToggleArchive}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {document.is_archived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Document preview */}
        <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {!previewUrl && <p className="text-sm text-slate-400">Preview unavailable.</p>}
          {previewUrl && isImage && (
            <img src={previewUrl} alt={document.title} className="max-h-[60vh] w-auto object-contain" />
          )}
          {previewUrl && isPdf && (
            <iframe title={document.title} src={previewUrl} className="h-[60vh] w-full" />
          )}
          {previewUrl && !isImage && !isPdf && (
            <p className="text-sm text-slate-500">Preview not supported for this file type.</p>
          )}
        </div>

        {/* Processing status / AI pipeline output */}
        <div className="mt-6 flex flex-col gap-4">
          {!isAnalyzed && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Processing</h2>
              <ProcessingStatus document={document} onRetry={handleRetry} retrying={retrying} />
              {retryError && <p className="mt-2 text-sm text-red-600">{retryError}</p>}
            </div>
          )}

          {isAnalyzed && analysis?.extracted_data && extractedData?.summary_sections && (
            <AiSummaryCard summary={extractedData.summary_sections} />
          )}

          {isAnalyzed && (
            <DocumentTypeCard
              documentType={analysis?.document_type ?? document.document_type}
              language={analysis?.language ?? document.language}
              confidence={analysis?.confidence ?? null}
            />
          )}

          {isAnalyzed && extractedData && <ImportantInfoSection data={extractedData} />}
          {isAnalyzed && extractedData && <DatesSection data={extractedData} />}
          {isAnalyzed && extractedData && <PaymentsSection data={extractedData} />}
          {isAnalyzed && extractedData && <RequiredActionSection data={extractedData} />}

          {(linkedEvents.length > 0 || linkedPayments.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Dates, payments &amp; tasks</h2>
              <div className="flex flex-col gap-4">
                {linkedEvents.filter((e) => e.type === 'appointment').length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Appointments</h3>
                    <div className="flex flex-col gap-2">
                      {linkedEvents
                        .filter((e) => e.type === 'appointment')
                        .map((event) => (
                          <AppointmentCard key={event.id} event={event} onOpen={setEditingEvent} />
                        ))}
                    </div>
                  </div>
                )}

                {linkedEvents.filter((e) => e.type !== 'appointment').length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Deadlines &amp; tasks</h3>
                    <div className="flex flex-col gap-2">
                      {linkedEvents
                        .filter((e) => e.type !== 'appointment')
                        .map((event) => (
                          <DeadlineCard
                            key={event.id}
                            event={event}
                            onComplete={handleCompleteLinkedEvent}
                            onEdit={setEditingEvent}
                            onSnooze={handleSnoozeLinkedEvent}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {linkedPayments.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Payments</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {linkedPayments.map((payment) => (
                        <PaymentCard
                          key={payment.id}
                          payment={payment}
                          onOpen={setEditingPayment}
                          onMarkPaid={handleMarkLinkedPaymentPaid}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isAnalyzed && extractedData && <ExtractedDataRaw data={extractedData} />}

          {isAnalyzed && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openExplain}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Explain
              </button>
              <button
                onClick={() => setTranslateOpen(true)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Translate
              </button>
              <button
                onClick={openAskAi}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ask AI
              </button>
              {analysis && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit Information
                </button>
              )}
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {retrying ? 'Retrying…' : 'Retry Processing'}
              </button>
            </div>
          )}
          {retryError && isAnalyzed && <p className="text-sm text-red-600">{retryError}</p>}

          {ocr?.raw_text && (
            <details className="rounded-xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                Raw OCR text
              </summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                {ocr.raw_text}
              </pre>
            </details>
          )}
        </div>
      </div>

      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">File information</h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Category</dt>
              <dd className="text-slate-700">{titleCase(document.category)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Type</dt>
              <dd className="text-slate-700">{document.file_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Size</dt>
              <dd className="text-slate-700">{formatFileSize(document.file_size)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Uploaded</dt>
              <dd className="text-slate-700">{formatDateTime(document.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Updated</dt>
              <dd className="text-slate-700">{formatDateTime(document.updated_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Status</dt>
              <dd><StatusBadge status={document.status} /></dd>
            </div>
          </dl>
        </div>
      </aside>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete document"
        message={`Are you sure you want to delete "${document.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {analysis && (
        <EditInformationModal
          open={editOpen}
          analysis={analysis}
          onClose={() => setEditOpen(false)}
          onSaved={setAnalysis}
        />
      )}

      <TranslatePanel documentId={document.id} open={translateOpen} onClose={() => setTranslateOpen(false)} />

      <DocumentChatPanel
        documentId={document.id}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        initialQuestion={chatQuestion}
      />

      <EventModal
        event={editingEvent}
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onChanged={handleLinkedEventChanged}
      />

      <PaymentModal
        payment={editingPayment}
        open={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        onChanged={handleLinkedPaymentChanged}
      />
    </div>
  )
}
