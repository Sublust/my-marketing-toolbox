import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { DbPeriod } from '../lib/types'

function formatPeriod(p: DbPeriod) {
  const mm = String(p.month).padStart(2, '0')
  return `${mm}.${p.year}${p.is_closed ? ' (закрито)' : ''}`
}

export function PeriodPicker(props: {
  value: DbPeriod | null
  onChange: (p: DbPeriod | null) => void
}) {
  const [periods, setPeriods] = useState<DbPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('periods')
        .select('id, year, month, is_closed')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(24)

      if (!alive) return
      if (error) {
        setError(error.message)
        setPeriods([])
        setIsLoading(false)
        return
      }

      const list = (data ?? []) as DbPeriod[]
      setPeriods(list)

      setIsLoading(false)
    }

    void run()
    return () => {
      alive = false
    }
  }, [])

  const selectedId = props.value?.id ?? ''
  const options = useMemo(() => periods.map((p) => ({ p, label: formatPeriod(p) })), [periods])

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm font-semibold text-gray-900 dark:text-white">Період</div>
      <select
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        disabled={isLoading || periods.length === 0}
        value={selectedId}
        onChange={(e) => {
          const id = e.target.value
          const next = periods.find((p) => p.id === id) ?? null
          props.onChange(next)
        }}
      >
        {options.map(({ p, label }) => (
          <option key={p.id} value={p.id}>
            {label}
          </option>
        ))}
      </select>

      {error ? (
        <div className="text-xs text-red-600 dark:text-red-300">{error}</div>
      ) : null}
      {!error && !isLoading && periods.length === 0 ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Немає періодів. Створіть запис у `periods`.
        </div>
      ) : null}
    </div>
  )
}

