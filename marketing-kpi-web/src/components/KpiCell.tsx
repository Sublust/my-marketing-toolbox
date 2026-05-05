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

  const specialistOptions = useMemo(
    () => [{ id: '', label: '-' }, ...props.specialists.map((s) => ({ id: s.id, label: s.full_name }))],
    [props.specialists],
  )

  const scoreTone =
    props.value.score === '1'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100'
      : props.value.score === '0'
        ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100'
        : props.value.score === 'ж'
          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100'
          : 'border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

  return (
    <div className="flex w-28 flex-col gap-1 lg:w-32">
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
        className={`w-full rounded-md border px-2 py-1 text-xs ${scoreTone}`}
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

