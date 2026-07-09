import { useMemo, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../lib/supabaseClient'

export function LoginPage() {
  const { session, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRecoverySubmitting, setIsRecoverySubmitting] = useState(false)
  const location = useLocation()

  const canSubmit = useMemo(
    () => email.trim().length > 3 && password.length >= 6,
    [email, password],
  )

  if (session) return <Navigate to="/kpi" replace />

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Вхід
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Увійдіть через Email/Password.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!canSubmit || isSubmitting) return

            setIsSubmitting(true)
            setError(null)
            setInfo(null)
            const { errorMessage } = await signInWithPassword({
              email: email.trim(),
              password,
            })
            setIsSubmitting(false)

            if (errorMessage) {
              setError(errorMessage)
              return
            }

            const from = (location.state as { from?: string } | null)?.from
            if (from) {
              window.location.assign(from)
            }
          }}
        >
          <label className="block">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          <label className="block">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Пароль
            </div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
              {info}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Вхід…' : 'Увійти'}
          </button>

          <button
            type="button"
            disabled={email.trim().length < 4 || isRecoverySubmitting}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            onClick={async () => {
              const e = email.trim()
              if (e.length < 4 || isRecoverySubmitting) return

              setIsRecoverySubmitting(true)
              setError(null)
              setInfo(null)

              const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin)
              redirectTo.pathname = `${import.meta.env.BASE_URL}reset-password`.replace(/\/{2,}/g, '/')

              const { error: resetError } = await supabase.auth.resetPasswordForEmail(e, {
                redirectTo: redirectTo.toString(),
              })

              setIsRecoverySubmitting(false)

              if (resetError) {
                setError(resetError.message)
                return
              }

              setInfo('Готово. Перевірте пошту — ми надіслали лист для відновлення пароля.')
            }}
          >
            {isRecoverySubmitting ? 'Надсилаємо лист…' : 'Забули пароль? Надіслати лист'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Повернутись у застосунок: <Link className="underline" to="/kpi">KPI</Link>
        </div>
      </div>
    </div>
  )
}

