import { useMemo, useState } from 'react'
import type { DbPerson, KpiScore, TaskRole } from '../lib/types'

export type KpiCellValue = {
  specialistId: string | null
  score: KpiScore
  comment: string | null
}

export function KpiCell(props: {
  role: TaskRole
  specialists: DbPerson[]
  value: KpiCellValue
  disabled: boolean
  onChange: (next: KpiCellValue) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)

  const specialistOptions = useMemo(() => {
    const filtered = props.specialists.filter((s) => {
      const isActive = s.is_active
      const hasRole = Array.isArray(s.directions) && s.directions.includes(props.role)
      const isCurrent = s.id === props.value.specialistId
      return (isActive && hasRole) || isCurrent
    })

    return [
      { id: '', label: '-' },
      ...filtered.map((s) => ({
        id: s.id,
        label: s.is_active ? s.full_name : `${s.full_name} (не працює)`
      }))
    ]
  }, [props.specialists, props.role, props.value.specialistId])

  const specialistClass = useMemo(() => {
    const base = "w-full rounded-md border px-2 py-1 text-xs transition-all duration-150 focus:outline-none focus:ring-1 cursor-pointer"
    if (props.value.specialistId) {
      return `${base} bg-white text-slate-800 border-slate-300 font-medium hover:border-slate-400 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:border-slate-600`
    }
    return `${base} bg-slate-50/50 text-slate-400 border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-950/40 dark:text-slate-500 dark:border-slate-800/80 dark:hover:border-slate-700`
  }, [props.value.specialistId])

  const scoreClass = useMemo(() => {
    const base = "w-full rounded-md border px-2 py-1 text-xs transition-all duration-150 focus:outline-none focus:ring-1"
    if (!props.value.specialistId) {
      return `${base} bg-slate-100/50 text-slate-400 border-slate-200/60 cursor-not-allowed dark:bg-slate-950/30 dark:text-slate-600 dark:border-slate-800/40`
    }
    const cursor = "cursor-pointer"
    switch (props.value.score) {
      case '1':
        return `${base} ${cursor} bg-green-50 text-green-700 border-green-300 font-semibold hover:border-green-400 focus:border-green-500 focus:ring-green-500 dark:bg-green-950/45 dark:text-green-300 dark:border-green-800/80`
      case 'ж':
        return `${base} ${cursor} bg-yellow-50 text-yellow-800 border-yellow-300 font-semibold hover:border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500 dark:bg-yellow-950/45 dark:text-yellow-300 dark:border-yellow-800/80`
      case '0':
        return `${base} ${cursor} bg-red-50 text-red-700 border-red-300 font-semibold hover:border-red-400 focus:border-red-500 focus:ring-red-500 dark:bg-red-950/45 dark:text-red-300 dark:border-red-800/80`
      default:
        // Specialist selected but score is '-' (pending entry)
        return `${base} ${cursor} bg-blue-50/40 text-blue-600 border-blue-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/60`
    }
  }, [props.value.specialistId, props.value.score])

  return (
    <div className="flex w-full flex-col gap-1.5">
      <select
        className={specialistClass}
        value={props.value.specialistId ?? ''}
        disabled={props.disabled || isSaving}
        onChange={async (e) => {
          const specialistId = e.target.value || null
          const next: KpiCellValue = { ...props.value, specialistId }
          setIsSaving(true)
          try {
            await props.onChange(next)
          } finally {
            setIsSaving(false)
          }
        }}
      >
        {specialistOptions.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className={scoreClass}
        value={props.value.score}
        disabled={props.disabled || isSaving || !props.value.specialistId}
        onChange={async (e) => {
          const score = e.target.value as KpiScore

          let comment = props.value.comment ?? null
          if ((score === '0' || score === 'ж') && (!comment || comment.trim().length === 0)) {
            const entered = window.prompt('Додайте короткий коментар для оцінки "0" або "ж".', '')
            if (!entered || entered.trim().length === 0) {
              // keep previous value if comment is required but missing
              return
            }
            comment = entered.trim()
          }

          const next: KpiCellValue = { ...props.value, score, comment }
          setIsSaving(true)
          try {
            await props.onChange(next)
          } finally {
            setIsSaving(false)
          }
        }}
      >
        <option value="-">-</option>
        <option value="1">1 (Успіх)</option>
        <option value="0">0 (Неуспіх)</option>
        <option value="ж">ж (Успіх)</option>
      </select>
    </div>
  )
}

