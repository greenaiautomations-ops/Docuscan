import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { listAllUsersForAdmin, setCompAccess, type AdminUserRow } from '../services/subscriptionService'
import { useTranslation } from 'react-i18next'
import { TIERS } from '../utils/entitlements'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { EmptyState } from '../components/common/EmptyState'

const COMP_ACCESS_LIMIT = 5

export function AdminPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAllUsersForAdmin()
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPage.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const compCount = rows.filter((r) => r.is_comp_access).length

  const handleToggleComp = async (row: AdminUserRow) => {
    setError(null)
    setPendingUserId(row.user_id)
    try {
      const updated = await setCompAccess(row.user_id, !row.is_comp_access)
      setRows((prev) => prev.map((r) => (r.user_id === row.user_id ? { ...r, ...updated } : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminPage.updateFailed'))
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('adminPage.title')}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('adminPage.subtitle', { limit: COMP_ACCESS_LIMIT })}</p>
      </div>

      {error && <ErrorMessage message={error} onRetry={load} />}

      {loading ? (
        <LoadingSpinner label={t('adminPage.loadingUsers')} />
      ) : rows.length === 0 ? (
        <EmptyState title={t('adminPage.noUsersTitle')} description={t('adminPage.noUsersDescription')} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('adminPage.userCount', { count: rows.length })}
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('adminPage.compAccessCount', { count: compCount, limit: COMP_ACCESS_LIMIT })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-2 font-medium">{t('adminPage.colUser')}</th>
                  <th className="px-5 py-2 font-medium">{t('adminPage.colRole')}</th>
                  <th className="px-5 py-2 font-medium">{t('adminPage.colPlan')}</th>
                  <th className="px-5 py-2 font-medium">{t('adminPage.colStatus')}</th>
                  <th className="px-5 py-2 font-medium">{t('adminPage.colDocuments')}</th>
                  <th className="px-5 py-2 font-medium">{t('adminPage.colCompAccess')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelf = row.user_id === user?.id
                  const canGrant = row.is_comp_access || compCount < COMP_ACCESS_LIMIT
                  return (
                    <tr key={row.user_id} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{row.name || '—'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.email ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3">
                        {row.role === 'admin' ? (
                          <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-400">
                            {t('adminPage.roleAdmin')}
                          </span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">{t('adminPage.roleUser')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        {TIERS[row.subscription_tier] ? t(`billing.tiers.${row.subscription_tier}.label`) : row.subscription_tier}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{t(`subscriptionStatus.${row.subscription_status}`, { defaultValue: row.subscription_status })}</td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{row.document_count}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleToggleComp(row)}
                          disabled={isSelf || pendingUserId === row.user_id || (!row.is_comp_access && !canGrant)}
                          title={
                            isSelf
                              ? t('adminPage.cannotChangeSelf')
                              : !row.is_comp_access && !canGrant
                                ? t('adminPage.compLimitReached')
                                : undefined
                          }
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            row.is_comp_access
                              ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20'
                              : 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pendingUserId === row.user_id ? t('adminPage.saving') : row.is_comp_access ? t('adminPage.granted') : t('adminPage.grant')}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
