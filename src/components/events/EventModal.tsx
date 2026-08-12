import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { EVENT_TYPE_LABELS, REMINDER_LABELS } from '../../utils/constants'
import { formatDateOnly } from '../../utils/formatters'
import {
  confirmEvent,
  deleteEvent,
  dismissEvent,
  completeEvent,
  updateEvent,
} from '../../services/eventService'
import { listRemindersForEvent, removeReminder } from '../../services/reminderService'
import type { Event, EventPriority, Reminder } from '../../types/document'

interface EventModalProps {
  event: Event | null
  open: boolean
  onClose: () => void
  onChanged: (updated: Event | null) => void
}

export function EventModal({ event, open, onClose, onChanged }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [priority, setPriority] = useState<EventPriority>('medium')
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!event) return
    setTitle(event.title)
    setDescription(event.description ?? '')
    setEventDate(event.event_date ?? '')
    setEventTime(event.event_time ?? '')
    setLocation(event.location ?? '')
    setPriority(event.priority)
    setError(null)
    listRemindersForEvent(event.id).then(setReminders).catch(() => undefined)
  }, [event])

  if (!event) return null

  const runAction = async (action: () => Promise<Event>) => {
    setSaving(true)
    setError(null)
    try {
      const updated = await action()
      onChanged(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    await runAction(() =>
      updateEvent(event.id, {
        title: title.trim() || event.title,
        description: description.trim() || null,
        event_date: eventDate || null,
        event_time: eventTime || null,
        location: location.trim() || null,
        priority,
      }),
    )
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await deleteEvent(event.id)
      onChanged(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this event.')
    } finally {
      setSaving(false)
      setDeleteOpen(false)
    }
  }

  const handleRemoveReminder = async (reminderId: string) => {
    await removeReminder(reminderId)
    setReminders((prev) => prev.filter((r) => r.id !== reminderId))
  }

  return (
    <>
      <Modal open={open} title={EVENT_TYPE_LABELS[event.type] ?? 'Event'} onClose={onClose}>
        <div className="flex flex-col gap-4">
          {event.status === 'needs_review' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-800">
                Possible {EVENT_TYPE_LABELS[event.type]?.toLowerCase() ?? 'event'} detected — please verify.
              </p>
              {typeof event.source_confidence === 'number' && (
                <p className="mt-0.5 text-xs text-amber-700">
                  AI confidence: {Math.round(event.source_confidence * 100)}%
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => runAction(() => confirmEvent(event.id))}
                  disabled={saving}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  Confirm
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  Edit &amp; Confirm
                </button>
                <button
                  onClick={() => runAction(() => dismissEvent(event.id))}
                  disabled={saving}
                  className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                >
                  Ignore
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as EventPriority)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {reminders.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Reminders</label>
              <ul className="flex flex-col gap-1">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                    <span>
                      {REMINDER_LABELS[r.reminder_type] ?? r.reminder_type} — {formatDateOnly(r.reminder_date)}
                      {r.sent ? ' (sent)' : ''}
                    </span>
                    <button onClick={() => handleRemoveReminder(r.id)} className="text-red-500 hover:text-red-700">
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {event.document_id && (
            <Link to={`/documents/${event.document_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Open source document
            </Link>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-2">
              {event.status !== 'completed' && (
                <button
                  onClick={() => runAction(() => completeEvent(event.id))}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Mark complete
                </button>
              )}
              <button
                onClick={() => setDeleteOpen(true)}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete event"
        message={`Delete "${event.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  )
}
