import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Row = { name: string; value: number }

function kpiColor(pct: number) {
  if (pct >= 76) return '#16a34a'
  if (pct <= 50) return '#dc2626'
  return '#f59e0b'
}

export function PmEfficiencyChart(props: { rows: Row[] }) {
  const rows = props.rows ?? []

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Ефективність PM</div>
      {rows.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Немає даних.</div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={240}>
            <BarChart data={rows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {rows.map((r) => (
                  <Cell key={r.name} fill={kpiColor(r.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

