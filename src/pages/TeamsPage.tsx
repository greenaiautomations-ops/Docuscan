import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useWorkspaces } from '../contexts/WorkspaceContext'
import { supabase } from '../lib/supabase'
import { uploadDocument } from '../services/uploadService'
import type { Document } from '../types/document'

const inputClass = 'min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-600'
const buttonClass = 'min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
export function TeamsPage() {
  const { t } = useTranslation()
  const { user, entitlements } = useAuth()
  const { workspaces, refresh, error: loadError } = useWorkspaces()
  const [params, setParams] = useSearchParams()
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const workspace = workspaces.find(w => w.ownerId === selected) ?? workspaces[0]
  const ownerId = workspace?.ownerId
  const manager = workspace?.role === 'owner' || workspace?.role === 'admin'
  const writer = workspace && workspace.role !== 'viewer'
  const reloadDocuments = async () => {
    if (!ownerId) { setDocuments([]); return }
    const result = await supabase.from('documents').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(100)
    if (result.error) throw result.error
    setDocuments(result.data ?? [])
  }
  useEffect(() => {
    let active = true
    setDocuments([])
    if (ownerId) void supabase.from('documents').select('*').eq('user_id', ownerId).order('created_at', { ascending: false }).limit(100)
      .then(result => { if (active) { if (result.error) setError(result.error.message); else setDocuments(result.data ?? []) } })
    return () => { active = false }
  }, [ownerId])
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(null)
    try { await action(); await refresh() }
    catch (err) { setError(err instanceof Error ? err.message : t('teams.failed')) }
    finally { setBusy(false) }
  }
  const create = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => { const result = await supabase.rpc('create_workspace', { p_name: name }); if (result.error) throw result.error; setName('') })
  }
  const invite = (event: FormEvent) => {
    event.preventDefault()
    if (!workspace) return
    void run(async () => {
      const result = await supabase.rpc('invite_workspace_member', { p_owner: workspace.ownerId, p_email: email, p_role: role })
      if (result.error) throw result.error
      setInviteLink(`${window.location.origin}/teams?invite=${result.data}`)
      setEmail('')
    })
  }
  const changeMember = (memberId: string, nextRole: string) => void run(async () => {
    if (!ownerId) return
    const result = await supabase.rpc('change_workspace_member', { p_owner: ownerId, p_user: memberId, p_role: nextRole })
    if (result.error) throw result.error
  })
  return <div className="mx-auto flex max-w-5xl flex-col gap-6">
    <h1 className="text-2xl font-semibold">{t('teams.title')}</h1>
    <p className="text-sm text-slate-500">{t('teams.description')}</p>
    {(error || loadError) && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || loadError}</p>}
    {params.get('invite') && <section className="rounded-xl border p-4">
      <p>{t('teams.acceptNote')}</p>
      <button disabled={busy} className={`${buttonClass} mt-3`} onClick={() => void run(async () => {
        const result = await supabase.rpc('accept_workspace_invite', { p_invite: params.get('invite')! }); if (result.error) throw result.error
        setParams({})
      })}>{t('teams.accept')}</button>
    </section>}
    {!workspaces.some(w => w.ownerId === user?.id) && (entitlements.tier === 'enterprise' ?
      <form onSubmit={create} className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">{t('teams.create')}</h2>
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('teams.shareNotice')}</p>
        <label>{t('teams.name')}<input required maxLength={100} value={name} onChange={e => setName(e.target.value)} className={inputClass} /></label>
        <button disabled={busy} className={buttonClass}>{t('teams.create')}</button>
      </form> : <p><Link className="text-indigo-600 underline" to="/billing">{t('teams.businessRequired')}</Link></p>)}
    {workspaces.length > 0 && <>
      <label>{t('teams.library')}<select className={inputClass} value={workspace?.ownerId} onChange={e => { setSelected(e.target.value); setInviteLink('') }}>
        {workspaces.map(w => <option key={w.ownerId} value={w.ownerId}>{w.name} · {t(`teams.roles.${w.role}`)}</option>)}
      </select></label>
      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">{t('teams.members')}</h2>
        <p className="text-sm">{t('teams.ownerIncluded')}</p>
        {workspace?.members.map(member => <div key={member.userId} className="flex flex-wrap items-center justify-between gap-2 border-t py-2">
          <span className="min-w-0 break-all text-sm">{member.email}</span>
          {manager && (workspace.role === 'owner' || member.role !== 'admin') ? <div className="flex flex-wrap gap-2">
            <select aria-label={`${t('teams.role')} ${member.email}`} value={member.role} disabled={busy} className="rounded-lg border bg-transparent p-2" onChange={e => changeMember(member.userId, e.target.value)}>
              {['viewer','editor',...(workspace.role === 'owner' ? ['admin'] : [])].map(r => <option key={r} value={r}>{t(`teams.roles.${r}`)}</option>)}
            </select>
            <button disabled={busy} className="rounded-lg border px-3 text-sm text-red-600" onClick={() => { if (window.confirm(t('teams.removeConfirm'))) changeMember(member.userId, 'remove') }}>{t('teams.remove')}</button>
          </div> : <span>{t(`teams.roles.${member.role}`)}</span>}
        </div>)}
        {manager && <form onSubmit={invite} className="flex flex-col gap-3 border-t pt-3">
          <label>{t('teams.email')}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} /></label>
          <label>{t('teams.role')}<select value={role} onChange={e => setRole(e.target.value)} className={inputClass}>
            {['viewer','editor',...(workspace?.role === 'owner' ? ['admin'] : [])].map(r => <option key={r} value={r}>{t(`teams.roles.${r}`)}</option>)}
          </select></label>
          <button disabled={busy} className={buttonClass}>{t('teams.invite')}</button>
          <p className="text-xs text-slate-500">{t('teams.inviteNote')}</p>
          {inviteLink && <label>{t('teams.inviteLink')}<input readOnly value={inviteLink} onFocus={e => e.currentTarget.select()} className={inputClass} /></label>}
        </form>}
        {manager && workspace?.invites.map(invitation => <div key={invitation.id} className="flex flex-wrap justify-between gap-2 text-sm">
          <span>{invitation.email} · {t('teams.pending')}</span>
          <button disabled={busy} className="text-red-600" onClick={() => void run(async () => { const result = await supabase.rpc('revoke_workspace_invite', { p_invite: invitation.id }); if (result.error) throw result.error })}>{t('teams.revoke')}</button>
        </div>)}
      </section>
      <section className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="font-semibold">{t('teams.documents')}</h2>
        {writer && <label className="text-sm">{t('teams.upload')}<input className="mt-2 block w-full" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={e => {
          const file = e.target.files?.[0]; e.target.value = ''
          if (file && ownerId) void run(async () => { await uploadDocument({ userId: ownerId, file }); await reloadDocuments() })
        }} /></label>}
        <button className="self-start text-sm text-indigo-600" onClick={() => void run(reloadDocuments)} disabled={busy}>{t('teams.refresh')}</button>
        {documents.map(doc => <Link className="flex flex-wrap justify-between gap-2 border-t py-2 text-sm text-indigo-600" key={doc.id} to={`/documents/${doc.id}`}><span>{doc.title}</span><span>{t(`documentStatus.${doc.status}`, { defaultValue: doc.status })}</span></Link>)}
        {documents.length === 0 && <p className="text-sm text-slate-500">{t('teams.empty')}</p>}
      </section>
      {manager && <section className="rounded-xl border p-4">
        <h2 className="mb-3 font-semibold">{t('teams.audit')}</h2>
        <p className="mb-3 text-xs text-slate-500">{t('teams.auditNote')}</p>
        {workspace?.audit.map(entry => <div key={entry.id} className="border-t py-3 text-sm">
          <strong>{entry.action}</strong><p>{new Date(entry.created_at).toLocaleString()}</p>
          <p className="break-all text-xs text-slate-500">{entry.actor_id ?? t('teams.system')} · {entry.subject}</p>
        </div>)}
      </section>}
    </>}
  </div>
}
