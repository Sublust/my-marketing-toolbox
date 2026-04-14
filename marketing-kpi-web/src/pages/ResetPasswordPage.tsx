import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function parseHashParams(hash: string) {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  return new URLSearchParams(raw)
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [isReady, setIsReady] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hashParams = useMemo(() => parseHashParams(location.hash), [location.hash])
  const hashError = hashParams.get('error') ?? null
  const hashErrorCode = hashParams.get('error_code') ?? null
  const hashErrorDescription = hashParams.get('error_description') ?? null
  const hashType = hashParams.get('type') ?? null

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      const { data } = await supabase.auth.getSession()

      if (!isMounted) return

      if (hashError || hashErrorCode) {
        setStatus('error')
        setMessage(
          decodeURIComponent(hashErrorDescription ?? '') ||
            (hashErrorCode === 'otp_expired'
              ? 'Посилання для відновлення пароля протерміноване або вже використане. Запросіть новий лист.'
              : 'Не вдалося відкрити сторінку відновлення пароля. Запросіть новий лист.'),
        )
        setIsReady(true)
        return
      }

      const session = data.session ?? null
      if (!session) {
        setStatus('error')
        setMessage('Сесія відновлення не знайдена. Відкрийте найновіший лист для відновлення ще раз.')
        setIsReady(true)
        return
      }

      if (hashType && hashType !== 'recovery') {
        setStatus('error')
        setMessage('Це посилання не є посиланням для відновлення пароля.')
        setIsReady(true)
        return
      }

      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
      }

      setIsReady(true)
    }

    void init()
    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = useMemo(() => {
    if (!password || password.length < 8) return false
    if (password !== confirmPassword) return false
    return true
  }, [password, confirmPassword])

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Новий пароль</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Встановіть новий пароль для вашого акаунта.
        </p>

        {!isReady ? (
          <div className="py-6 text-sm text-gray-600 dark:text-gray-400">Перевіряємо посилання…</div>
        ) : status === 'success' ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            Пароль оновлено. Тепер можна увійти.
            <div className="mt-2">
              <Link className="underline" to="/login">
                Перейти на сторінку входу
              </Link>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {message ?? 'Помилка.'}
            <div className="mt-2">
              <Link className="underline" to="/login">
                Повернутись до входу
              </Link>
            </div>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault()
              if (!canSubmit || isSubmitting) return

              setIsSubmitting(true)
              setMessage(null)
              setStatus('idle')

              const { error } = await supabase.auth.updateUser({ password })
              setIsSubmitting(false)

              if (error) {
                setStatus('error')
                setMessage(error.message)
                return
              }

              setStatus('success')
              setMessage(null)
              setPassword('')
              setConfirmPassword('')

              setTimeout(() => navigate('/login', { replace: true }), 800)
            }}
          >
            <label className="block">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Новий пароль</div>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900"
              />
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Мінімум 8 символів.</div>
            </label>

            <label className="block">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Підтвердіть пароль</div>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>

            {message ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {message}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Зберігаємо…' : 'Змінити пароль'}
            </button>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Повернутись: <Link className="underline" to="/login">Вхід</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

