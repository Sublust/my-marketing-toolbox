import type { DbPerson, DbProject, DbUserProfile, TaskRole } from '../lib/types'
import { KpiCell, type KpiCellValue } from './KpiCell'
import { Trash2 } from 'lucide-react'

const ROLE_LABELS: Record<TaskRole, string> = {
  seo: 'SEO',
  context: 'Контекст',
  target: 'Таргет',
  tiktok: 'TikTok',
}

export type KpiTableCellKey = `${string}:${TaskRole}`

export function ProjectTable(props: {
  projects: DbProject[]
  pms: DbUserProfile[]
  pmUsersById: Record<string, DbUserProfile>
  specialists: DbPerson[]
  roles: TaskRole[]
  cellValues: Record<KpiTableCellKey, KpiCellValue | undefined>
  canEditProject: (project: DbProject) => boolean
  onCellChange: (args: { projectId: string; role: TaskRole; next: KpiCellValue }) => Promise<void>
  canAssignPm: boolean
  onProjectPmChange: (args: { projectId: string; pmUserId: string | null }) => Promise<void>
  onDeleteProject?: (projectId: string) => Promise<void>
}) {
  if (props.projects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
        Немає проєктів. Додайте перший проєкт (admin).
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <table className="min-w-[980px] w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="sticky left-0 z-30 px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
              Проєкт
            </th>
            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Кат.
            </th>
            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              PM
            </th>
            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              PM (доступ)
            </th>
            {props.roles.map((r) => (
              <th
                key={r}
                className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {ROLE_LABELS[r]}
              </th>
            ))}
            <th className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <span className="sr-only">Дії</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {props.projects.map((p) => {
            const pmName = p.pm_name?.trim()
              ? p.pm_name
              : p.pm_id
                ? props.pmUsersById[p.pm_id]?.full_name
                : null
            const canEdit = props.canEditProject(p)

            return (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="sticky left-0 z-20 px-3 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
                  <div className="max-w-[260px] truncate" title={p.name}>
                    {p.name}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {p.category}
                </td>
                <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="max-w-[180px] truncate" title={pmName ?? ''}>
                    {pmName ?? '—'}
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <select
                    className="w-full max-w-[220px] rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                    value={p.pm_id ?? ''}
                    disabled={!props.canAssignPm}
                    onChange={async (e) => {
                      const nextId = e.target.value || null
                      await props.onProjectPmChange({ projectId: p.id, pmUserId: nextId })
                    }}
                    title={props.canAssignPm ? 'Вибрати PM, який має право редагувати KPI' : 'Доступно лише для admin'}
                  >
                    <option value="">—</option>
                    {props.pms.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.full_name}
                      </option>
                    ))}
                  </select>
                </td>
                {props.roles.map((role) => {
                  const key: KpiTableCellKey = `${p.id}:${role}`
                  const value =
                    props.cellValues[key] ?? { specialistId: null, score: '-', comment: null }

                  return (
                    <td key={role} className="px-3 py-3">
                      <KpiCell
                        role={role}
                        specialists={props.specialists}
                        value={value}
                        disabled={!canEdit}
                        onChange={async (next) => {
                          await props.onCellChange({ projectId: p.id, role, next })
                        }}
                      />
                    </td>
                  )
                })}
                <td className="px-3 py-3 text-right">
                  {props.onDeleteProject ? (
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-950 dark:text-red-300 dark:hover:bg-red-950/40"
                      onClick={async () => {
                        if (!confirm(`Видалити проєкт «${p.name}»?`)) return
                        await props.onDeleteProject?.(p.id)
                      }}
                      disabled={!canEdit}
                      title={canEdit ? 'Видалити' : 'Недостатньо прав'}
                      aria-label={canEdit ? `Видалити проєкт: ${p.name}` : 'Недостатньо прав'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

