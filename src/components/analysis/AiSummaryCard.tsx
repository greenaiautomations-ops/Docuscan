import type { SummarySections } from '../../types/document'

export function AiSummaryCard({ summary }: { summary: SummarySections }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Summary</h2>
        <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          AI interpretation
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{summary.overview}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryItem label="What is this?" value={summary.what_is_this} />
        <SummaryItem label="Who sent it?" value={summary.who_sent_it} />
        <SummaryItem label="What does it mean?" value={summary.what_it_means} />
        <SummaryItem label="What do you need to do?" value={summary.what_to_do} />
        <SummaryItem
          label="Deadline?"
          value={summary.has_deadline ? summary.deadline_detail || 'Yes' : 'No deadline mentioned'}
        />
        <SummaryItem
          label="Money involved?"
          value={summary.involves_money ? summary.money_detail || 'Yes' : 'No payment mentioned'}
        />
        <SummaryItem label="Next action" value={summary.next_action} />
      </dl>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{value}</dd>
    </div>
  )
}
