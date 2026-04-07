type Row = {
  projectName: string
  category: string
  redCount: number
  yellowCount: number
  greenCount: number
  totalCount: number
}

export function ProblematicProjectsList(props: { rows: Row[]; title?: string }) {
  const rows = props.rows ?? []
  const title = props.title ?? 'Проблемні проєкти'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Немає даних.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-[620px] w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Проєкт
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Кат.
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  0
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  ж
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  1
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Разом
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.map((r) => (
                <tr key={r.projectName} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {r.projectName}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.category}</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-red-600 dark:text-red-400">
                    {r.redCount}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-amber-600 dark:text-amber-400">
                    {r.yellowCount}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-green-600 dark:text-green-400">
                    {r.greenCount}
                  </td>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {r.totalCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

