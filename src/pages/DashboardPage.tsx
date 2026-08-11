import { useAuth } from '../hooks/useAuth'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { StatCard } from '../components/dashboard/StatCard'
import { RecentDocumentsList } from '../components/dashboard/RecentDocumentsList'
import { NotificationsList } from '../components/dashboard/NotificationsList'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { UploadButton } from '../components/documents/UploadButton'

export function DashboardPage() {
  const { profile } = useAuth()
  const { stats, loading, error, refresh } = useDashboardStats()

  if (loading) return <LoadingSpinner fullHeight label="Loading dashboard…" />
  if (error) return <ErrorMessage message={error} onRetry={refresh} />
  if (!stats) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}
          </h1>
          <p className="text-sm text-slate-500">Here&apos;s what&apos;s happening with your documents.</p>
        </div>
        <UploadButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total documents" value={stats.totalDocuments} />
        <StatCard label="Important documents" value={stats.importantDocuments.length} />
        <StatCard label="Requiring action" value={stats.actionRequiredDocuments.length} />
        <StatCard label="Recent uploads" value={stats.recentDocuments.length} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RecentDocumentsList
          title="Recently added"
          documents={stats.recentDocuments}
          emptyText="No documents yet. Upload your first one to get started."
        />
        <RecentDocumentsList
          title="Important documents"
          documents={stats.importantDocuments}
          emptyText="Mark documents as important to see them here."
        />
        <RecentDocumentsList
          title="Requiring action"
          documents={stats.actionRequiredDocuments}
          emptyText="Nothing needs your attention right now."
        />
      </div>

      <NotificationsList notifications={stats.recentNotifications} />
    </div>
  )
}
