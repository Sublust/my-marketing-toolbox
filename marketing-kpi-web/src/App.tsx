import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ProtectedRoute } from './components/ProtectedRoute'

const LoginPage = lazy(async () => {
  const mod = await import('./pages/LoginPage')
  return { default: mod.LoginPage }
})

const KpiEntryPage = lazy(async () => {
  const mod = await import('./pages/KpiEntryPage')
  return { default: mod.KpiEntryPage }
})

const DashboardPage = lazy(async () => {
  const mod = await import('./pages/DashboardPage')
  return { default: mod.DashboardPage }
})

const SettingsPage = lazy(async () => {
  const mod = await import('./pages/SettingsPage')
  return { default: mod.SettingsPage }
})

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<div className="py-10 text-sm text-gray-600 dark:text-gray-400">Завантаження…</div>}>
              <LoginPage />
            </Suspense>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <Suspense fallback={<div className="py-10 text-sm text-gray-600 dark:text-gray-400">Завантаження сторінки…</div>}>
                <AppShell />
              </Suspense>
            }
          >
            <Route path="/" element={<Navigate to="/kpi" replace />} />
            <Route path="/kpi" element={<KpiEntryPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/kpi" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
