import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import { useTheme } from '../context/ThemeProvider'

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  )
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-dvh">
      <header className="border-b border-gray-200 bg-white/70 backdrop-blur dark:border-gray-800 dark:bg-gray-900/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
              KPI
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Marketing KPI Calculator
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Веб-версія (MVP)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex items-center gap-2">
              <NavItem to="/kpi">KPI</NavItem>
              <NavItem to="/dashboard">Dashboard</NavItem>
              <NavItem to="/settings">Settings</NavItem>
            </nav>

            <div className="hidden sm:flex items-center gap-2">
              <button
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
                aria-label="Перемкнути тему"
              >
                <span className="inline-flex items-center gap-2">
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Світла' : 'Темна'}
                </span>
              </button>
              <div className="text-right leading-tight">
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {profile?.full_name ?? 'Профіль не налаштовано'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  {profile?.role ?? '—'}
                </div>
              </div>
              <button
                className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                onClick={async () => {
                  await signOut()
                  navigate('/login', { replace: true })
                }}
              >
                Вийти
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

