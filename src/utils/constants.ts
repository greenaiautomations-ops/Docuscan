export const APP_NAME = 'Docuscan'

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Documents', path: '/documents' },
  { label: 'Scan', path: '/scan' },
  { label: 'Upload', path: '/upload' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Deadlines', path: '/deadlines' },
  { label: 'Payments', path: '/payments' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Settings', path: '/settings' },
] as const

// ---------------------------------------------------------------------
// Phase 3 — events, payments, priorities
// ---------------------------------------------------------------------

export const EVENT_TYPES = [
  'deadline',
  'appointment',
  'payment_due',
  'renewal',
  'expiration',
  'task',
  'other',
] as const

export const EVENT_TYPE_LABELS: Record<string, string> = {
  deadline: 'Deadline',
  appointment: 'Appointment',
  payment_due: 'Payment',
  renewal: 'Renewal',
  expiration: 'Expiration',
  task: 'Task',
  other: 'Other',
}

// Colors follow the spec's legend: 🔴 deadlines, 🟠 payments, 🔵 appointments,
// 🟣 renewals/expirations, 🟢 completed.
export const EVENT_TYPE_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  deadline: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  payment_due: { dot: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  appointment: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  renewal: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  expiration: { dot: 'bg-purple-500', bg: 'bg-purple-50', text: 'text-purple-700' },
  task: { dot: 'bg-slate-500', bg: 'bg-slate-50', text: 'text-slate-700' },
  other: { dot: 'bg-slate-400', bg: 'bg-slate-50', text: 'text-slate-600' },
}

export const EVENT_STATUS_COMPLETED_COLOR = { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' }

export const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

export const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
  disputed: 'bg-red-100 text-red-700',
  unknown: 'bg-slate-100 text-slate-500',
}

export const REMINDER_LABELS: Record<string, string> = {
  seven_days: '7 days before',
  three_days: '3 days before',
  one_day: '1 day before',
  same_day: 'Same day',
  custom: 'Custom',
}

// ---------------------------------------------------------------------
// Document folders
// ---------------------------------------------------------------------

export const FOLDER_COLOR_STYLES: Record<
  string,
  { dot: string; bg: string; text: string; ring: string; solid: string }
> = {
  red: { dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-500', solid: 'bg-red-500' },
  orange: {
    dot: 'bg-orange-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    ring: 'ring-orange-500',
    solid: 'bg-orange-500',
  },
  amber: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-500',
    solid: 'bg-amber-500',
  },
  emerald: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-500',
    solid: 'bg-emerald-500',
  },
  teal: { dot: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700', ring: 'ring-teal-500', solid: 'bg-teal-500' },
  blue: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-500', solid: 'bg-blue-500' },
  indigo: {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-500',
    solid: 'bg-indigo-500',
  },
  purple: {
    dot: 'bg-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-500',
    solid: 'bg-purple-500',
  },
  pink: { dot: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', ring: 'ring-pink-500', solid: 'bg-pink-500' },
  slate: {
    dot: 'bg-slate-500',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-500',
    solid: 'bg-slate-500',
  },
}
