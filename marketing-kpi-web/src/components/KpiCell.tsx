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

  return (
    <div className="flex w-32 flex-col gap-1 lg:w-40">
      <select
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
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
        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
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

