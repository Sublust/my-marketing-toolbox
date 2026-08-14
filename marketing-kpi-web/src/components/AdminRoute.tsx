import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export function AdminRoute() {
  const { session, profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="py-10 text-sm text-gray-600 dark:text-gray-400">
        Перевірка прав доступу…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (profile?.role?.toLowerCase().trim() !== 'admin') {
    return <Navigate to="/kpi" replace />
  }

  return <Outlet />
}
