import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="py-10 text-sm text-gray-600 dark:text-gray-400">
        Завантаження…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

