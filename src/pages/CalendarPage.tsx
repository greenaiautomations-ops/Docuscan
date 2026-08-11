import { useMemo } from 'react'
import { EmptyState } from '../components/common/EmptyState'

function getMonthGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarPage() {
  const today = useMemo(() => new Date(), [])
  const cells = useMemo(
    () => getMonthGrid(today.getFullYear(), today.getMonth()),
    [today],
  )
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Calendar</h1>
        <p className="text-sm text-slate-500">
          Important dates extracted from your documents will appear here.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">{monthLabel}</h2>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            const isToday = day === today.getDate()
            return (
              <div
                key={idx}
                className={`flex aspect-square items-center justify-center rounded-lg text-sm ${
                  day === null
                    ? ''
                    : isToday
                      ? 'bg-indigo-600 font-semibold text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {day}
              </div>
            )
          })}
        </div>
      </div>

      <EmptyState
        title="No upcoming dates yet"
        description="Once document analysis is available, deadlines, appointments, and due dates extracted from your documents will show up on this calendar."
      />
    </div>
  )
}
