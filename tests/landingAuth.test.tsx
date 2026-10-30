import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '../src/pages/HomePage'
const { state } = vi.hoisted(() => ({ state: { user: null as null | {id:string}, entitlements: { tier: 'free' }, signOut: vi.fn() } }))
vi.mock('../src/lib/functionsClient', () => ({ invokeFunction: vi.fn() }))
vi.mock('../src/hooks/useAuth', () => ({ useAuth: () => state }))
vi.mock('../src/components/common/ThemeToggle', () => ({ ThemeToggle: () => null }))
vi.mock('../src/components/common/LanguageToggle', () => ({ LanguageToggle: () => null }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: { returnObjects?: boolean }) => options?.returnObjects ? [] : key }) }))
it('keeps Sign out visible alongside Dashboard for a signed-in visitor on the landing page', () => {
  state.user = { id: 'test-user' }
  const html = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(html).toContain('topbar.signOut')
  expect(html).toContain('home.nav.goToDashboard')
  expect(html).not.toContain('home.nav.signIn')
})
it('shows Sign in when the page has no session', () => {
  state.user = null
  const html = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(html).toContain('home.nav.signIn')
  expect(html).not.toContain('topbar.signOut')
})
