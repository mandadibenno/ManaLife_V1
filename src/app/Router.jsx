import { lazy, useEffect } from 'react'
import { HashRouter, Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from './AppShell'
import { useWorkspace, WorkspaceProvider } from '../hooks/workspace'
import { useSpace } from './SpaceContext'
import { readSession } from '../lib/storage'
import { MODULES } from '../config/modules'
import { EmptyState } from '../ui/Display'
import { Button } from '../ui/Button'
import { Compass } from 'lucide-react'

const Dashboard = lazy(() => import('../features/dashboard/Dashboard'))
const SpaceSettings = lazy(() => import('../features/spaces/SpaceSettings'))
const CreateSpace = lazy(() => import('../features/spaces/CreateSpace'))
const JoinSpace = lazy(() => import('../features/spaces/JoinSpace'))
const AccountSettings = lazy(() => import('../features/settings/AccountSettings'))
const Welcome = lazy(() => import('../features/onboarding/Welcome'))

const PAGES = {
  tasks: lazy(() => import('../features/tasks/TasksPage')),
  groceries: lazy(() => import('../features/groceries/GroceriesPage')),
  bills: lazy(() => import('../features/bills/BillsPage')),
  expenses: lazy(() => import('../features/expenses/ExpensesPage')),
  calendar: lazy(() => import('../features/calendar/CalendarPage')),
  habits: lazy(() => import('../features/habits/HabitsPage')),
  meals: lazy(() => import('../features/meals/MealsPage')),
  medicines: lazy(() => import('../features/medicines/MedicinesPage')),
  periods: lazy(() => import('../features/cycle/CyclePage')),
  reminders: lazy(() => import('../features/reminders/RemindersPage')),
  documents: lazy(() => import('../features/documents/DocumentsPage')),
}

export const PENDING_INVITE_KEY = 'manalife-meet-invite'

export function AppRouter() {
  return (
    <HashRouter>
      <WorkspaceProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomeRedirect />} />
            <Route path="space/:spaceId" element={<SpaceGuard />}>
              <Route index element={<Dashboard />} />
              <Route path="settings" element={<SpaceSettings />} />
              <Route path=":module" element={<ModuleRoute />} />
            </Route>
            <Route path="spaces/new" element={<CreateSpace />} />
            <Route path="join" element={<JoinSpace />} />
            <Route path="settings" element={<AccountSettings />} />
            <Route path="welcome" element={<Welcome />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </WorkspaceProvider>
    </HashRouter>
  )
}

/** "/" → pending invite, last used space, My Space, or onboarding. */
function HomeRedirect() {
  const ws = useWorkspace()
  if (readSession(PENDING_INVITE_KEY)) return <Navigate to="/join" replace />
  const last = ws.byId(ws.lastSpaceId())
  const target = last || ws.personal || ws.spaces[0]
  if (!target) return <Navigate to="/welcome" replace />
  return <Navigate to={`/space/${target.id}`} replace />
}

/** Only renders spaces the user belongs to; anything else falls back home. */
function SpaceGuard() {
  const { spaceId } = useParams()
  const ws = useWorkspace()
  const navigate = useNavigate()
  const space = ws.byId(spaceId)
  useEffect(() => {
    if (!space) navigate('/', { replace: true })
  }, [space, navigate])
  if (!space) return null
  // The shell (AppShell) already provides SpaceContext for the routed space.
  return <Outlet />
}

function ModuleRoute() {
  const { module } = useParams()
  const { has, basePath, title } = useSpace()
  const Page = PAGES[module]
  if (!Page || !MODULES[module]) return <Navigate to={basePath} replace />
  if (!has(module)) {
    return (
      <div className="page">
        <EmptyState
          icon={Compass}
          title={`${title(module)} isn't turned on here`}
          body="The owner of this space can enable it in space settings."
          action={
            <Button as={Link} to={basePath}>
              Back to overview
            </Button>
          }
        />
      </div>
    )
  }
  return <Page key={module} />
}
