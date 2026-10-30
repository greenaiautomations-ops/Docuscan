import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useWorkspaces } from '../../contexts/WorkspaceContext'
import { invokeFunction } from '../../lib/functionsClient'
interface Result { document_id: string; title: string; excerpt: string; similarity: number }
export function SmartSearch() {
  const { user, entitlements } = useAuth()
  const { workspaces } = useWorkspaces()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const personalAllowed = ['pro','enterprise'].includes(entitlements.tier)
  const choices = [...(personalAllowed && user ? [{ id: user.id, name: t('smartSearch.personal') }] : []), ...workspaces.filter(w => w.ownerId !== user?.id).map(w => ({ id: w.ownerId, name: w.name }))]
  const ownerId = choices.some(c => c.id === owner) ? owner : choices[0]?.id
  const search = async (e: FormEvent) => {
    e.preventDefault(); if (!ownerId) return
    setBusy(true); setError(null); setResults(null)
    try { const data = await invokeFunction<{ results: Result[] }>('smart-search', { ownerId, query }); setResults(data.results) }
    catch (err) { setError(err instanceof Error ? err.message : t('smartSearch.failed')) }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/5">
    <h2 className="font-semibold">{t('smartSearch.title')}</h2>
    <p className="mt-1 text-sm text-slate-500">{t('smartSearch.description')}</p>
    {choices.length === 0 ? <Link className="mt-2 inline-block text-sm text-indigo-600 underline" to="/billing">{t('smartSearch.upgrade')}</Link> : <form onSubmit={search} className="mt-3 flex flex-wrap gap-2">
      <select aria-label={t('smartSearch.library')} value={ownerId} onChange={e => { setOwner(e.target.value); setResults(null) }} className="min-w-0 max-w-full rounded-lg border bg-transparent p-2">{choices.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <input required maxLength={1000} value={query} onChange={e => setQuery(e.target.value)} aria-label={t('smartSearch.query')} placeholder={t('smartSearch.placeholder')} className="min-h-11 min-w-0 flex-1 basis-48 rounded-lg border bg-transparent px-3 py-2" />
      <button disabled={busy} className="min-h-11 rounded-lg bg-indigo-600 px-4 text-sm text-white disabled:opacity-50">{busy ? t('smartSearch.searching') : t('smartSearch.search')}</button>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    {results?.length === 0 && <p className="mt-3 text-sm">{t('smartSearch.empty')}</p>}
    {results?.map(result => <Link key={result.document_id} to={`/documents/${result.document_id}`} className="mt-3 block rounded-lg bg-white p-3 dark:bg-slate-900"><strong className="text-sm text-indigo-600">{result.title}</strong><p className="mt-1 text-sm text-slate-500">{result.excerpt}</p></Link>)}
  </section>
}
