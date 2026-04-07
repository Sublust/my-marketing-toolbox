import { useEffect, useMemo, useRef, useState } from 'react'
import { PeriodPicker } from '../components/PeriodPicker'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import type { DbCategoryWeight, DbPeriod, DbPerson, DbProject, DbUserProfile, TaskRole } from '../lib/types'

const ROLES: TaskRole[] = ['seo', 'context', 'target', 'tiktok']

type LegacyImport = {
  version?: string
  exportDate?: string
  projects: Array<{
    id?: string
    name: string
    category: 'VIP' | 'A' | 'B' | 'C'
    pm: string
    roles: Record<
      TaskRole,
      {
        specialist: string
        result: '1' | '0' | 'ж' | '-'
      }
    >
  }>
  config?: {
    specialists?: string[]
    pms?: string[]
    roles?: string[]
    weights?: Record<string, number>
  }
}

function nextMonthYear(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 }
  return { year, month: month + 1 }
}

function prevMonthYear(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 }
  return { year, month: month - 1 }
}

export function SettingsPage() {
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [period, setPeriod] = useState<DbPeriod | null>(null)
  const [periodError, setPeriodError] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isOpening, setIsOpening] = useState(false)
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false)
  const [isDeletingPeriod, setIsDeletingPeriod] = useState(false)
  const [periodPickerKey, setPeriodPickerKey] = useState(0)
  const [customYear, setCustomYear] = useState(() => prevMonthYear(new Date().getFullYear(), new Date().getMonth() + 1).year)
  const [customMonth, setCustomMonth] = useState(() => prevMonthYear(new Date().getFullYear(), new Date().getMonth() + 1).month)

  const [users, setUsers] = useState<DbUserProfile[]>([])
  const usersByName = useMemo(
    () =>
      Object.fromEntries(
        users.map((u) => [u.full_name.trim().toLowerCase(), u]),
      ),
    [users],
  )

  const [people, setPeople] = useState<DbPerson[]>([])
  const peopleByName = useMemo(
    () => Object.fromEntries(people.map((p) => [p.full_name.trim().toLowerCase(), p])),
    [people],
  )

  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [weights, setWeights] = useState<DbCategoryWeight[]>([])
  const [weightsError, setWeightsError] = useState<string | null>(null)
  const [isSavingWeights, setIsSavingWeights] = useState(false)

  const [projects, setProjects] = useState<DbProject[]>([])
  const [projectsError, setProjectsError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!isAdmin) return
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .order('full_name')
      if (!alive) return
      if (error) return
      setUsers((data ?? []) as DbUserProfile[])

      const [{ data: cw }, { data: proj }, { data: ppl }] = await Promise.all([
        supabase.from('category_weights').select('category, weight'),
        supabase.from('projects').select('id, name, category, pm_id, pm_name, pm_person_id, is_active').order('name'),
        supabase.from('people').select('id, full_name, person_type, is_active').order('full_name'),
      ])
      if (!alive) return
      setWeights(((cw ?? []) as DbCategoryWeight[]).sort((a, b) => a.category.localeCompare(b.category)))
      setProjects((proj ?? []) as DbProject[])
      setPeople((ppl ?? []) as DbPerson[])

      // pick latest open period for convenience
      const { data: open } = await supabase
        .from('periods')
        .select('id, year, month, is_closed')
        .eq('is_closed', false)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
      if (!alive) return
      if (open?.[0]) setPeriod(open[0] as DbPeriod)
    }
    void run()
    return () => {
      alive = false
    }
  }, [isAdmin])

  const saveWeights = async () => {
    if (!isAdmin) return
    setIsSavingWeights(true)
    setWeightsError(null)
    const rows = weights.map((w) => ({ category: w.category, weight: w.weight }))
    const { error } = await supabase.from('category_weights').upsert(rows, { onConflict: 'category' })
    setIsSavingWeights(false)
    if (error) setWeightsError(error.message)
  }

  const toggleProjectActive = async (p: DbProject) => {
    setProjectsError(null)
    const { error } = await supabase
      .from('projects')
      .update({ is_active: !p.is_active })
      .eq('id', p.id)
    if (error) {
      setProjectsError(error.message)
      return
    }
    setProjects((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !x.is_active } : x)))
  }

  const createCurrentPeriod = async () => {
    if (!isAdmin || !user?.id) return
    setIsCreatingPeriod(true)
    setPeriodError(null)
    const now = new Date()
    // KPI зазвичай заповнюємо за попередній місяць.
    const { year, month } = prevMonthYear(now.getFullYear(), now.getMonth() + 1)
    const { data, error } = await supabase
      .from('periods')
      .insert({ year, month, is_closed: false })
      .select('id, year, month, is_closed')
      .single()
    setIsCreatingPeriod(false)
    if (error) {
      setPeriodError(error.message)
      return
    }
    setPeriod((data ?? null) as DbPeriod | null)
    setPeriodPickerKey((k) => k + 1)
  }

  const createCustomPeriod = async () => {
    if (!isAdmin || !user?.id) return
    setIsCreatingPeriod(true)
    setPeriodError(null)

    const year = Number(customYear)
    const month = Number(customMonth)
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      setIsCreatingPeriod(false)
      setPeriodError('Некоректний рік.')
      return
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      setIsCreatingPeriod(false)
      setPeriodError('Некоректний місяць.')
      return
    }

    const { data, error } = await supabase
      .from('periods')
      .insert({ year, month, is_closed: true })
      .select('id, year, month, is_closed')
      .single()

    setIsCreatingPeriod(false)
    if (error) {
      // if unique(year,month) already exists, show friendly message
      const msg =
        error.message.includes('duplicate') || error.message.includes('unique')
          ? 'Такий період вже існує.'
          : error.message
      setPeriodError(msg)
      return
    }

    setPeriod((data ?? null) as DbPeriod | null)
    setPeriodPickerKey((k) => k + 1)
  }

  const closeSelectedPeriod = async () => {
    if (!isAdmin || !user?.id) return
    if (!period) return
    if (period.is_closed) return

    setIsClosing(true)
    setPeriodError(null)

    const { error: closeErr } = await supabase
      .from('periods')
      .update({ is_closed: true, closed_at: new Date().toISOString(), closed_by: user.id })
      .eq('id', period.id)
    if (closeErr) {
      setPeriodError(closeErr.message)
      setIsClosing(false)
      return
    }

    const next = nextMonthYear(period.year, period.month)
    // Create next period if absent
    const { data: existing } = await supabase
      .from('periods')
      .select('id, year, month, is_closed')
      .eq('year', next.year)
      .eq('month', next.month)
      .maybeSingle()

    if (existing?.id) {
      // Ensure it is open
      if (existing.is_closed) {
        await supabase.from('periods').update({ is_closed: false }).eq('id', existing.id)
      }
      setPeriod(existing as DbPeriod)
      setIsClosing(false)
        setPeriodPickerKey((k) => k + 1)
      return
    }

    const { data: created, error: createErr } = await supabase
      .from('periods')
      .insert({ year: next.year, month: next.month, is_closed: false })
      .select('id, year, month, is_closed')
      .single()

    setIsClosing(false)
    if (createErr) {
      setPeriodError(createErr.message)
      return
    }

    setPeriod((created ?? null) as DbPeriod | null)
    setPeriodPickerKey((k) => k + 1)
  }

  const openSelectedPeriod = async () => {
    if (!isAdmin || !user?.id) return
    if (!period) return
    if (!period.is_closed) return

    if (
      !confirm(
        'Відкрити вибраний період? Це знову дозволить редагування KPI та перерахунок. Після правок рекомендуємо закрити період назад.',
      )
    ) {
      return
    }

    setIsOpening(true)
    setPeriodError(null)

    const { data, error } = await supabase
      .from('periods')
      .update({ is_closed: false, closed_at: null, closed_by: null })
      .eq('id', period.id)
      .select('id, year, month, is_closed')
      .single()

    setIsOpening(false)
    if (error) {
      setPeriodError(error.message)
      return
    }

    setPeriod((data ?? null) as DbPeriod | null)
    setPeriodPickerKey((k) => k + 1)
  }

  const deleteSelectedPeriod = async () => {
    if (!isAdmin || !user?.id) return
    if (!period) return

    const label = `${String(period.month).padStart(2, '0')}.${period.year}`
    if (
      !confirm(
        `Видалити період ${label}? Будуть видалені всі KPI записи та снапшоти цього періоду (історію не відновити).`,
      )
    ) {
      return
    }

    setIsDeletingPeriod(true)
    setPeriodError(null)

    // Guard: prevent accidental delete if there is data and user cancels.
    const [{ count: kpiCount, error: kpiErr }, { count: snapCount, error: snapErr }] = await Promise.all([
      supabase.from('kpi_records').select('*', { count: 'exact', head: true }).eq('period_id', period.id),
      supabase.from('kpi_snapshots').select('*', { count: 'exact', head: true }).eq('period_id', period.id),
    ])

    if (kpiErr || snapErr) {
      setIsDeletingPeriod(false)
      setPeriodError(kpiErr?.message ?? snapErr?.message ?? 'Не вдалося перевірити дані періоду.')
      return
    }

    if ((kpiCount ?? 0) > 0 || (snapCount ?? 0) > 0) {
      if (
        !confirm(
          `У цьому періоді є дані: KPI=${kpiCount ?? 0}, snapshots=${snapCount ?? 0}. Точно видалити?`,
        )
      ) {
        setIsDeletingPeriod(false)
        return
      }
    }

    const { error: delErr } = await supabase.from('periods').delete().eq('id', period.id)
    setIsDeletingPeriod(false)
    if (delErr) {
      setPeriodError(delErr.message)
      return
    }

    setPeriod(null)
    setPeriodPickerKey((k) => k + 1)
  }

  const handleImportJson = async (file: File) => {
    if (!isAdmin || !user?.id) return
    if (!period) {
      setImportError('Оберіть період для імпорту.')
      return
    }

    setImportStatus('Читаю файл…')
    setImportError(null)

    let parsed: LegacyImport
    try {
      const txt = await file.text()
      parsed = JSON.parse(txt) as LegacyImport
    } catch (e) {
      setImportStatus(null)
      setImportError('Не вдалося прочитати JSON.')
      return
    }

    if (!parsed?.projects || !Array.isArray(parsed.projects)) {
      setImportStatus(null)
      setImportError('Невірний формат: очікується `projects: []`.')
      return
    }

    // Ensure specialists exist in public.people (no-auth directory).
    const names = new Set<string>()
    const pmNames = new Set<string>()
    for (const proj of parsed.projects) {
      const pm = (proj.pm || '').trim()
      if (pm && pm !== '-') pmNames.add(pm)
      for (const role of ROLES) {
        const spec = proj.roles?.[role]?.specialist
        if (spec && spec !== '-') names.add(spec)
      }
    }

    const toInsert: Array<{ full_name: string; person_type: 'specialist'; is_active: boolean }> = []
    for (const n of names) {
      const key = n.trim().toLowerCase()
      if (!peopleByName[key]) {
        toInsert.push({ full_name: n.trim(), person_type: 'specialist', is_active: true })
      }
    }

    if (toInsert.length) {
      const { error: pplErr } = await supabase.from('people').insert(toInsert)
      if (pplErr) {
        setImportStatus(null)
        setImportError(`Помилка створення людей (people): ${pplErr.message}`)
        return
      }

      const { data: ppl2 } = await supabase
        .from('people')
        .select('id, full_name, person_type, is_active')
        .order('full_name')
      setPeople((ppl2 ?? []) as DbPerson[])
    }

    // Ensure PMs exist in public.people as person_type='pm' (for stable dashboard filters).
    const pmToUpsert: Array<{ full_name: string; person_type: 'pm'; is_active: boolean }> = []
    for (const n of pmNames) {
      const key = n.trim().toLowerCase()
      const existing = peopleByName[key]
      if (!existing) {
        pmToUpsert.push({ full_name: n.trim(), person_type: 'pm', is_active: true })
      } else if (existing.person_type !== 'pm') {
        pmToUpsert.push({ full_name: existing.full_name, person_type: 'pm', is_active: existing.is_active })
      }
    }
    if (pmToUpsert.length) {
      const { error: pmErr } = await supabase.from('people').upsert(pmToUpsert, { onConflict: 'full_name' })
      if (pmErr) {
        setImportStatus(null)
        setImportError(`Помилка створення PM (people): ${pmErr.message}`)
        return
      }

      const { data: ppl2 } = await supabase
        .from('people')
        .select('id, full_name, person_type, is_active')
        .order('full_name')
      setPeople((ppl2 ?? []) as DbPerson[])
    }

    setImportStatus(`Імпортую проєкти (${parsed.projects.length})…`)

    // Upsert projects by name
    const projectRows = parsed.projects.map((p) => {
      const pmProfile = p.pm ? usersByName[p.pm.trim().toLowerCase()] : null
      const pmPerson = p.pm ? (peopleByName[p.pm.trim().toLowerCase()] ?? null) : null
      return {
        name: p.name.trim(),
        category: p.category,
        pm_id: pmProfile?.id ?? null,
        pm_name: p.pm?.trim() || null,
        pm_person_id: pmPerson?.id ?? null,
        is_active: true,
      }
    })

    const { data: upserted, error: projErr } = await supabase
      .from('projects')
      .upsert(projectRows, { onConflict: 'name' })
      .select('id, name, category, pm_id, pm_name, pm_person_id, is_active')

    if (projErr) {
      setImportStatus(null)
      setImportError(`Помилка імпорту проєктів: ${projErr.message}`)
      return
    }

    const dbProjects = (upserted ?? []) as DbProject[]
    const projectByName = Object.fromEntries(
      dbProjects.map((p) => [p.name.trim().toLowerCase(), p]),
    )

    // Import KPI: delete existing cells per (period, project, role) then insert.
    let inserted = 0
    let skipped = 0
    setImportStatus('Імпортую KPI записи…')

    for (const proj of parsed.projects) {
      const dbProj = projectByName[proj.name.trim().toLowerCase()]
      if (!dbProj) {
        skipped++
        continue
      }

      for (const role of ROLES) {
        const cell = proj.roles?.[role]
        if (!cell) continue
        const specName = (cell.specialist || '').trim()
        const score = cell.result

        // Empty cell in legacy file -> skip (no DB row).
        if (!specName || specName === '-' || score === '-') {
          skipped++
          continue
        }

        const specPerson = (peopleByName[specName.toLowerCase()] ??
          people.find((p) => p.full_name.trim().toLowerCase() === specName.toLowerCase())) as DbPerson | undefined
        if (!specPerson) {
          skipped++
          continue
        }

        const { error: delErr } = await supabase
          .from('kpi_records')
          .delete()
          .eq('period_id', period.id)
          .eq('project_id', dbProj.id)
          .eq('task_role', role)

        if (delErr) {
          setImportStatus(null)
          setImportError(`Помилка очищення KPI перед імпортом: ${delErr.message}`)
          return
        }

        const { error: insErr } = await supabase.from('kpi_records').insert({
          period_id: period.id,
          project_id: dbProj.id,
          specialist_person_id: specPerson.id,
          task_role: role,
          score,
          comment: null,
          created_by: user.id,
        })

        if (insErr) {
          setImportStatus(null)
          setImportError(`Помилка вставки KPI: ${insErr.message}`)
          return
        }

        inserted++
      }
    }

    setImportStatus(`Готово. KPI записів імпортовано: ${inserted}. Пропущено клітинок: ${skipped}.`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Step 6: періоди (закриття місяця) та імпорт JSON.
        </p>
      </div>

      {!isAdmin ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Налаштування доступні лише для admin.
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Ваги категорій</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Значення використовуються в розрахунку KPI і дашбордах.
            </div>

            {weightsError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {weightsError}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {(['VIP', 'A', 'B', 'C'] as const).map((cat) => {
                const row = weights.find((w) => w.category === cat) ?? { category: cat, weight: cat === 'VIP' ? 1.5 : cat === 'A' ? 1 : cat === 'B' ? 0.75 : 0.5 }
                return (
                  <label key={cat} className="block">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">{cat}</div>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                      value={row.weight}
                      onChange={(e) => {
                        const v = Number(e.target.value)
                        setWeights((prev) => {
                          const next = prev.filter((x) => x.category !== cat)
                          next.push({ category: cat, weight: v })
                          return next.sort((a, b) => a.category.localeCompare(b.category))
                        })
                      }}
                    />
                  </label>
                )
              })}
            </div>

            <div className="mt-4">
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={saveWeights}
                disabled={isSavingWeights}
              >
                {isSavingWeights ? 'Збереження…' : 'Зберегти ваги'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Періоди</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  KPI заповнюємо за попередній місяць. “Закрити період” робить місяць read-only і відкриває наступний.
                </div>
              </div>
              <PeriodPicker key={periodPickerKey} value={period} onChange={setPeriod} />
            </div>

            {periodError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {periodError}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={createCurrentPeriod}
                disabled={isCreatingPeriod}
              >
                {isCreatingPeriod ? 'Створення…' : 'Створити період (попередній місяць)'}
              </button>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Створити період:
                </div>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                  value={customYear}
                  onChange={(e) => setCustomYear(Number(e.target.value))}
                  title="Рік"
                />
                <select
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(Number(e.target.value))}
                  title="Місяць"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, '0')}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  onClick={createCustomPeriod}
                  disabled={isCreatingPeriod}
                  title="Створює період як закритий (для історії)"
                >
                  Додати
                </button>
              </div>

              <button
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  if (!period) return
                  if (period.is_closed) return
                  if (!confirm('Закрити вибраний період? Після цього редагування KPI буде заблоковано.')) return
                  await closeSelectedPeriod()
                }}
                disabled={!period || period.is_closed || isClosing}
              >
                {isClosing ? 'Закриття…' : 'Закрити період'}
              </button>

              <button
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void openSelectedPeriod()}
                disabled={!period || !period.is_closed || isOpening}
                title="Знімає блокування редагування для вибраного періоду (admin)"
              >
                {isOpening ? 'Відкриваю…' : 'Відкрити період'}
              </button>

              <button
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void deleteSelectedPeriod()}
                disabled={!period || isDeletingPeriod}
                title="Видаляє період і всі пов'язані KPI записи/снапшоти"
              >
                {isDeletingPeriod ? 'Видалення…' : 'Видалити період'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Активні проєкти</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Неактивні проєкти не показуються в таблиці KPI та не враховуються в розрахунках.
            </div>

            {projectsError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {projectsError}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[720px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Проєкт</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Кат.</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Активний</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Дія</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{p.category}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={[
                            'inline-flex rounded px-2 py-1 text-xs font-bold',
                            p.is_active
                              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300',
                          ].join(' ')}
                        >
                          {p.is_active ? 'Так' : 'Ні'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                          onClick={() => void toggleProjectActive(p)}
                        >
                          {p.is_active ? 'Деактивувати' : 'Активувати'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              Імпорт з JSON (backup з вашого HTML)
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Імпорт відбувається в <b>вибраний період</b>. Дані користувачів мають вже існувати в `public.users`.
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  await handleImportJson(f)
                }}
              />
              <button
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={!period}
              >
                Обрати JSON файл…
              </button>
              {importStatus ? (
                <div className="text-sm text-gray-600 dark:text-gray-300">{importStatus}</div>
              ) : null}
            </div>

            {importError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                {importError}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

