import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
export interface Workspace {
  ownerId: string; name: string; role: 'owner' | 'admin' | 'editor' | 'viewer'
  members: { userId: string; email: string; role: string }[]
  invites: { id: string; email: string; role: string; expiresAt: string }[]
  audit: { id: number; actor_id: string | null; action: string; subject: string | null; created_at: string }[]
}
const WorkspaceContext = createContext<{ workspaces: Workspace[]; error: string | null; refresh: () => Promise<void>; canEdit: (ownerId: string) => boolean } | null>(null)
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!userId) { setWorkspaces([]); return }
    const result = await supabase.rpc('workspace_snapshot', {})
    if (result.error) { setError(result.error.message); setWorkspaces([]); return }
    setError(null)
    setWorkspaces(result.data as Workspace[])
  }, [userId])
  useEffect(() => { void refresh() }, [refresh])
  return <WorkspaceContext.Provider value={{ workspaces, error, refresh, canEdit: ownerId => ownerId === userId || workspaces.some(w => w.ownerId === ownerId && w.role !== 'viewer') }}>{children}</WorkspaceContext.Provider>
}
export function useWorkspaces() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('WorkspaceProvider is missing')
  return value
}
