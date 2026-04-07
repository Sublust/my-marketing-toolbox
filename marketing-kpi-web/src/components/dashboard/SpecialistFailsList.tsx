type Row = {
  projectName: string
  category: string
  pmName: string | null
  role: string
}

export function SpecialistFailsList(props: { rows: Row[] }) {
  const rows = props.rows ?? []

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Провали (оцінка “0”)</div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Немає “0” за цей період.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-[680px] w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Проєкт
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Кат.
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  PM
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Роль
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.map((r) => (
                <tr key={`${r.projectName}:${r.role}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {r.projectName}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.category}</td>
                  <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{r.pmName ?? '—'}</td>
                  <td className="px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400">
                    {r.role}
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

