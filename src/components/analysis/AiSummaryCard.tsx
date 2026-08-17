import { useTranslation } from 'react-i18next'
import type { SummarySections } from '../../types/document'

export function AiSummaryCard({ summary }: { summary: SummarySections }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('analysis.aiSummary.title')}</h2>
        <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
          {t('analysis.aiSummary.aiInterpretation')}
        </span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{summary.overview}</p>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryItem label={t('analysis.aiSummary.whatIsThis')} value={summary.what_is_this} />
        <SummaryItem label={t('analysis.aiSummary.whoSentIt')} value={summary.who_sent_it} />
        <SummaryItem label={t('analysis.aiSummary.whatItMeans')} value={summary.what_it_means} />
        <SummaryItem label={t('analysis.aiSummary.whatToDo')} value={summary.what_to_do} />
        <SummaryItem
          label={t('analysis.aiSummary.deadlineLabel')}
          value={summary.has_deadline ? summary.deadline_detail || t('analysis.aiSummary.deadlineYes') : t('analysis.aiSummary.noDeadline')}
        />
        <SummaryItem
          label={t('analysis.aiSummary.moneyLabel')}
          value={summary.involves_money ? summary.money_detail || t('analysis.aiSummary.moneyYes') : t('analysis.aiSummary.noPayment')}
        />
        <SummaryItem label={t('analysis.aiSummary.nextAction')} value={summary.next_action} />
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
