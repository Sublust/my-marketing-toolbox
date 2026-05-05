import type { DbPerson, DbProject, DbUserProfile, TaskRole } from '../lib/types'
import { KpiCell, type KpiCellValue } from './KpiCell'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'

const ROLE_LABELS: Record<TaskRole, string> = {
  seo: 'SEO',
  context: 'Контекст',
  target: 'Таргет',
  tiktok: 'TikTok',
}

export type KpiTableCellKey = `${string}:${TaskRole}`

export type ProjectSortKey = 'name' | 'category' | 'pm'
export type ProjectSortDir = 'asc' | 'desc'

function SortIcon(props: { active: boolean; dir: ProjectSortDir }) {
  if (!props.active) return <span className="inline-block w-4" />
  return props.dir === 'asc' ? (
    <ArrowUp className="h-4 w-4" />
  ) : (
    <ArrowDown className="h-4 w-4" />
  )
}

export function ProjectTable(props: {
  projects: DbProject[]
  pmUsersById: Record<string, DbUserProfile>
  specialists: DbPerson[]
  roles: TaskRole[]
  cellValues: Record<KpiTableCellKey, KpiCellValue | undefined>
  canEditProject: (project: DbProject) => boolean
  onCellChange: (args: { projectId: string; role: TaskRole; next: KpiCellValue }) => Promise<void>
  sort: { key: ProjectSortKey; dir: ProjectSortDir }
  onSortChange: (next: { key: ProjectSortKey; dir: ProjectSortDir }) => void
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
      <table className="min-w-[980px] w-full table-fixed divide-y divide-gray-200 dark:divide-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="sticky left-0 z-30 w-[260px] px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => {
                  const isActive = props.sort.key === 'name'
                  const dir: ProjectSortDir = isActive && props.sort.dir === 'asc' ? 'desc' : 'asc'
                  props.onSortChange({ key: 'name', dir })
                }}
              >
                Проєкт <SortIcon active={props.sort.key === 'name'} dir={props.sort.dir} />
              </button>
            </th>
            <th className="w-[70px] px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => {
                  const isActive = props.sort.key === 'category'
                  const dir: ProjectSortDir = isActive && props.sort.dir === 'asc' ? 'desc' : 'asc'
                  props.onSortChange({ key: 'category', dir })
                }}
              >
                Кат. <SortIcon active={props.sort.key === 'category'} dir={props.sort.dir} />
              </button>
            </th>
            <th className="w-[180px] px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => {
                  const isActive = props.sort.key === 'pm'
                  const dir: ProjectSortDir = isActive && props.sort.dir === 'asc' ? 'desc' : 'asc'
                  props.onSortChange({ key: 'pm', dir })
                }}
              >
                PM <SortIcon active={props.sort.key === 'pm'} dir={props.sort.dir} />
              </button>
            </th>
            {props.roles.map((r) => (
              <th
                key={r}
                className="w-[140px] px-2 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400"
              >
                {ROLE_LABELS[r]}
              </th>
            ))}
            <th className="w-[56px] px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
                <td className="sticky left-0 z-20 w-[260px] px-3 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
                  <div className="max-w-[260px] truncate" title={p.name}>
                    {p.name}
                  </div>
                </td>
                <td className="w-[70px] px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {p.category}
                </td>
                <td className="w-[180px] px-3 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="max-w-[180px] truncate" title={pmName ?? ''}>
                    {pmName ?? '—'}
                  </div>
                </td>
                {props.roles.map((role) => {
                  const key: KpiTableCellKey = `${p.id}:${role}`
                  const value =
                    props.cellValues[key] ?? { specialistId: null, score: '-', comment: null }

                  return (
                    <td key={role} className="w-[140px] px-2 py-3 align-top">
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
                <td className="w-[56px] px-3 py-3 text-right align-top">
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

