import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PeriodPicker } from '../components/PeriodPicker'
import { ProjectTable, type KpiTableCellKey } from '../components/ProjectTable'
import { useAuth } from '../context/AuthProvider'
import { calculateKpi, type KpiResults, type ProjectInput, type Weights } from '../domain/kpiEngine'
import { supabase } from '../lib/supabaseClient'
import type { DbCategoryWeight, DbKpiRecord, DbPeriod, DbPerson, DbProject, DbUserProfile, TaskRole } from '../lib/types'

const ROLES: TaskRole[] = ['seo', 'context', 'target', 'tiktok']

const DEFAULT_WEIGHTS: Weights = { VIP: 1.5, A: 1.0, B: 0.75, C: 0.5 }

export function KpiEntryPage() {
  const { user, profile } = useAuth()

  const [period, setPeriod] = useState<DbPeriod | null>(null)
  const [projects, setProjects] = useState<DbProject[]>([])
  const [specialists, setSpecialists] = useState<DbPerson[]>([])
  const [pms, setPms] = useState<DbUserProfile[]>([])
  const [cellValues, setCellValues] = useState<
    Record<KpiTableCellKey, { specialistId: string | null; score: DbKpiRecord['score']; comment: string | null }>
  >({})

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<KpiResults | null>(null)
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS)
  const [isPersisting, setIsPersisting] = useState(false)
  const [isProjectsCollapsed, setIsProjectsCollapsed] = useState(false)

  const pmUsersById = useMemo(() => Object.fromEntries(pms.map((p) => [p.id, p])), [pms])
  const isAdmin = profile?.role === 'admin'

  /**
   * Проєкти “тягнуться” в таблицю з місяця в місяць, бо `projects` — це довідник.
   * Для нового/відкритого періоду показуємо лише активні проєкти.
   * Для історичних (закритих) періодів лишаємо у таблиці також неактивні проєкти,
   * якщо по них вже є KPI-дані у вибраному періоді — щоб історія відображалась коректно.
   */
  const projectIdsWithDataInPeriod = useMemo(() => {
    const ids = new Set<string>()
    for (const rec of Object.values(cellValues)) {
      if (rec?.specialistId) {
        // key parsing is handled elsewhere; we only need presence of any filled cell per project
      }
    }
    // We don't have projectId inside cellValues; derive from keys instead.
    for (const key of Object.keys(cellValues)) {
      const v = cellValues[key as KpiTableCellKey]
      if (!v?.specialistId) continue
      const projectId = String(key).split(':')[0]
      if (projectId) ids.add(projectId)
    }
    return ids
  }, [cellValues])

  const visibleProjects = useMemo(() => {
    if (!period) return projects.filter((p) => p.is_active)
    if (!period.is_closed) return projects.filter((p) => p.is_active)
    // closed period: keep active + projects that had data in this period
    return projects.filter((p) => p.is_active || projectIdsWithDataInPeriod.has(p.id))
  }, [projects, period, projectIdsWithDataInPeriod])

  const canEditProject = (project: DbProject) => {
    if (!profile?.role || !user?.id) return false
    if (!period || period.is_closed) return false
    if (profile.role === 'admin') return true
    if (profile.role === 'pm') {
      if (project.pm_id && project.pm_id === user.id) return true

      // Fallback for legacy/partial data: allow PM edit by name match.
      // This prevents "can't edit in open period" when `projects.pm_id` is empty
      // but `projects.pm_name` is filled.
      const projectPmName = (project.pm_name ?? '').trim().toLowerCase()
      const myName = (profile.full_name ?? '').trim().toLowerCase()
      if (projectPmName && myName && projectPmName === myName) return true

      return false
    }
    return false
  }

  useEffect(() => {
    let alive = true
    const run = async () => {
      setIsLoading(true)
      setError(null)

      // Period: pick latest open if possible; otherwise latest.
      const { data: periodsOpen } = await supabase
        .from('periods')
        .select('id, year, month, is_closed')
        .eq('is_closed', false)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)

      const { data: periodsAny } = !periodsOpen?.length
        ? await supabase
            .from('periods')
            .select('id, year, month, is_closed')
            .order('year', { ascending: false })
            .order('month', { ascending: false })
            .limit(1)
        : { data: null }

      const nextPeriod = ((periodsOpen?.[0] ?? periodsAny?.[0]) as DbPeriod | undefined) ?? null
      if (!alive) return
      setPeriod(nextPeriod)

      // People lists
      const [{ data: specs, error: specsErr }, { data: pmsData, error: pmsErr }] = await Promise.all([
        supabase
          .from('people')
          .select('id, full_name, person_type, is_active')
          .eq('person_type', 'specialist')
          .order('full_name'),
        supabase.from('users').select('id, full_name, role').eq('role', 'pm').order('full_name'),
      ])
      if (!alive) return
      if (specsErr || pmsErr) {
        setError(specsErr?.message ?? pmsErr?.message ?? 'Помилка завантаження списків')
        setIsLoading(false)
        return
      }
      setSpecialists((specs ?? []) as DbPerson[])
      setPms((pmsData ?? []) as DbUserProfile[])

      // Projects
      const { data: proj, error: projErr } = await supabase
        .from('projects')
        .select('id, name, category, pm_id, pm_name, pm_person_id, is_active')
        .order('name')
      if (!alive) return
      if (projErr) {
        setError(projErr.message)
        setIsLoading(false)
        return
      }
      const projList = (proj ?? []) as DbProject[]
      setProjects(projList)

      // Category weights (optional table). If missing, keep defaults.
      const { data: cw, error: cwErr } = await supabase
        .from('category_weights')
        .select('category, weight')
      if (!alive) return
      if (!cwErr && cw?.length) {
        const nextW: Weights = { ...DEFAULT_WEIGHTS }
        for (const row of cw as DbCategoryWeight[]) {
          nextW[row.category] = Number(row.weight)
        }
        setWeights(nextW)
      }

      setIsLoading(false)
    }

    void run()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!period) return
      setError(null)
      setResults(null)

      const projectIds = projects.map((p) => p.id)
      if (projectIds.length === 0) {
        setCellValues({})
        return
      }

      const { data, error } = await supabase
        .from('kpi_records')
        .select('id, period_id, project_id, specialist_person_id, task_role, score, comment, created_by, updated_at')
        .eq('period_id', period.id)
        .in('project_id', projectIds)

      if (!alive) return
      if (error) {
        setError(error.message)
        return
      }

      // Our UI expects at most 1 record per (project,role). If duplicates exist, take newest.
      const byKey = new Map<string, DbKpiRecord>()
      for (const rec of (data ?? []) as DbKpiRecord[]) {
        const key = `${rec.project_id}:${rec.task_role}`
        const prev = byKey.get(key)
        if (!prev) byKey.set(key, rec)
        else if (prev.updated_at < rec.updated_at) byKey.set(key, rec)
      }

      const mapped: Record<KpiTableCellKey, { specialistId: string | null; score: DbKpiRecord['score']; comment: string | null }> =
        {}
      for (const [key, rec] of byKey.entries()) {
        mapped[key as KpiTableCellKey] = {
          specialistId: (rec as any).specialist_person_id ?? null,
          score: rec.score,
          comment: rec.comment,
        }
      }

      setCellValues(mapped)
    }

    void run()
    return () => {
      alive = false
    }
  }, [period?.id, projects])

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectCategory, setNewProjectCategory] = useState<DbProject['category']>('VIP')
  const [newProjectPmId, setNewProjectPmId] = useState<string>('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)

  const createProject = async () => {
    if (!isAdmin) return
    if (!newProjectName.trim()) return
    setIsCreatingProject(true)
    setError(null)

    const pmUser = newProjectPmId ? pmUsersById[newProjectPmId] ?? null : null
    let pmPersonId: string | null = null
    if (pmUser?.full_name?.trim()) {
      // Ensure PM exists in public.people for stable analytics/history.
      const { error: upErr } = await supabase
        .from('people')
        .upsert([{ full_name: pmUser.full_name.trim(), person_type: 'pm', is_active: true }], { onConflict: 'full_name' })
      if (upErr) {
        setIsCreatingProject(false)
        setError(upErr.message)
        return
      }

      const { data: pmPerson, error: pmSelErr } = await supabase
        .from('people')
        .select('id')
        .eq('full_name', pmUser.full_name.trim())
        .maybeSingle()
      if (pmSelErr) {
        setIsCreatingProject(false)
        setError(pmSelErr.message)
        return
      }
      pmPersonId = (pmPerson as any)?.id ?? null
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: newProjectName.trim(),
        category: newProjectCategory,
        pm_id: newProjectPmId || null,
        pm_name: pmUser?.full_name?.trim() ? pmUser.full_name.trim() : null,
        pm_person_id: pmPersonId,
        is_active: true,
      })
      .select('id, name, category, pm_id, pm_name, pm_person_id, is_active')
      .single()
    setIsCreatingProject(false)
    if (error) {
      setError(error.message)
      return
    }
    if (data) {
      setProjects((prev) => [...prev, data as DbProject].sort((a, b) => a.name.localeCompare(b.name)))
      setNewProjectName('')
    }
  }

  const deleteProject = async (projectId: string) => {
    setError(null)
    // Also remove KPI records in current period for clean UX (DB cascade handles on delete)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) {
      setError(error.message)
      return
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    setCellValues((prev) => {
      const next = { ...prev }
      for (const role of ROLES) {
        delete next[`${projectId}:${role}` as KpiTableCellKey]
      }
      return next
    })
  }

  const onProjectPmChange = async (args: { projectId: string; pmUserId: string | null }) => {
    if (!isAdmin) return
    setError(null)

    const pmUser = args.pmUserId ? pmUsersById[args.pmUserId] ?? null : null
    const pmName = pmUser?.full_name?.trim() ? pmUser.full_name.trim() : null

    let pmPersonId: string | null = null
    if (pmName) {
      const { error: upErr } = await supabase
        .from('people')
        .upsert([{ full_name: pmName, person_type: 'pm', is_active: true }], { onConflict: 'full_name' })
      if (upErr) {
        setError(upErr.message)
        return
      }

      const { data: pmPerson, error: pmSelErr } = await supabase
        .from('people')
        .select('id')
        .eq('full_name', pmName)
        .maybeSingle()
      if (pmSelErr) {
        setError(pmSelErr.message)
        return
      }
      pmPersonId = (pmPerson as any)?.id ?? null
    }

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === args.projectId
          ? {
              ...p,
              pm_id: args.pmUserId,
              pm_name: pmName,
              pm_person_id: pmPersonId,
            }
          : p,
      ),
    )

    const { error } = await supabase
      .from('projects')
      .update({ pm_id: args.pmUserId, pm_name: pmName, pm_person_id: pmPersonId })
      .eq('id', args.projectId)
    if (error) {
      setError(error.message)
    }
  }

  const onCellChange = async (args: {
    projectId: string
    role: TaskRole
    next: { specialistId: string | null; score: DbKpiRecord['score']; comment: string | null }
  }) => {
    if (!user?.id) return
    if (!period) return

    // Optimistic UI update
    const key = `${args.projectId}:${args.role}` as KpiTableCellKey
    setCellValues((prev) => ({ ...prev, [key]: args.next }))

    // Enforce single record per (period, project, role) by deleting any existing rows first.
    const { error: delErr } = await supabase
      .from('kpi_records')
      .delete()
      .eq('period_id', period.id)
      .eq('project_id', args.projectId)
      .eq('task_role', args.role)

    if (delErr) {
      setError(delErr.message)
      return
    }

    // If no specialist selected, keep empty cell (no DB row).
    if (!args.next.specialistId) return

    const { error: insErr } = await supabase.from('kpi_records').insert({
      period_id: period.id,
      project_id: args.projectId,
      specialist_person_id: args.next.specialistId,
      task_role: args.role,
      score: args.next.score,
      comment: args.next.comment,
      created_by: user.id,
    })

    if (insErr) {
      setError(insErr.message)
      return
    }
  }

  const persistSnapshots = async (args: {
    periodId: string
    inputProjects: ProjectInput[]
    specialistNames: string[]
    pmNames: string[]
    pmNameToPersonId: Record<string, string | null>
  }) => {
    if (!user?.id) throw new Error('Немає сесії користувача для збереження снапшотів.')
    if (!profile) throw new Error('Профіль ще не завантажився. Спробуйте ще раз через 1–2 секунди.')
    if (profile.role !== 'admin') {
      throw new Error('Снапшоти для дашборду може зберігати лише роль admin. Увійдіть під Head/адміном.')
    }

    const directions: Array<'all' | TaskRole> = ['all', ...ROLES]
    const rows: Array<{
      period_id: string
      scope: 'department' | 'specialist' | 'pm'
      direction: 'all' | TaskRole
      subject_kind: 'department' | 'person' | 'user' | 'name'
      subject_id: string | null
      subject_name: string
      percentage: number
      success_weight: number
      total_weight: number
      computed_by: string
    }> = []

    for (const dir of directions) {
      const roles = dir === 'all' ? ROLES : [dir]
      const res = calculateKpi({
        projects: args.inputProjects,
        weights,
        specialists: args.specialistNames,
        pms: args.pmNames,
        roles,
      })

      rows.push({
        period_id: args.periodId,
        scope: 'department',
        direction: dir,
        subject_kind: 'department',
        subject_id: null,
        subject_name: 'Відділ загалом',
        percentage: res.leader.percentage,
        success_weight: res.leader.success,
        total_weight: res.leader.total,
        computed_by: user.id,
      })

      // Specialists: special rule for Target direction = Target + TikTok combined (Meta Ads + TikTok Ads)
      const specialistRes =
        dir === 'target'
          ? calculateKpi({
              projects: args.inputProjects,
              weights,
              specialists: args.specialistNames,
              pms: args.pmNames,
              roles: ['target', 'tiktok'],
            }).specialists
          : res.specialists

      for (const [name, st] of Object.entries(specialistRes)) {
        if (!st.total || st.total <= 0) continue
        const person = specialists.find((p) => p.full_name === name) ?? null
        rows.push({
          period_id: args.periodId,
          scope: 'specialist',
          direction: dir,
          subject_kind: 'person',
          subject_id: person?.id ?? null,
          subject_name: name,
          percentage: st.percentage,
          success_weight: st.success,
          total_weight: st.total,
          computed_by: user.id,
        })
      }

      for (const [name, st] of Object.entries(res.pms)) {
        if (!st.total || st.total <= 0) continue
        const pmPid = args.pmNameToPersonId[name] ?? null
        if (!pmPid) continue
        rows.push({
          period_id: args.periodId,
          scope: 'pm',
          direction: dir,
          subject_kind: 'person',
          subject_id: pmPid,
          subject_name: name,
          percentage: st.percentage,
          success_weight: st.success,
          total_weight: st.total,
          computed_by: user.id,
        })
      }
    }

    // Prevent duplicates across repeated "РОЗРАХУВАТИ" runs.
    // Postgres UNIQUE constraints treat NULLs as distinct, so rows with subject_id=NULL can accumulate.
    const { error: delErr } = await supabase.from('kpi_snapshots').delete().eq('period_id', args.periodId)
    if (delErr) throw delErr

    const { error } = await supabase
      .from('kpi_snapshots')
      .upsert(rows, { onConflict: 'period_id,scope,direction,subject_kind,subject_id,subject_name' })
    if (error) throw error
  }

  const computeResults = async () => {
    if (!period) return
    if (!profile) {
      setError('Профіль ще не завантажився. Спробуйте ще раз через 1–2 секунди.')
      return
    }
    const specialistsById = Object.fromEntries(specialists.map((s) => [s.id, s]))

    const specialistNames = Array.from(
      new Set(
        Object.values(cellValues)
          .map((v) => (v.specialistId ? specialistsById[v.specialistId]?.full_name : null))
          .filter((x): x is string => !!x),
      ),
    )

    const inputProjects: ProjectInput[] = visibleProjects.map((p) => {
      const pmName = p.pm_name?.trim()
        ? p.pm_name
        : p.pm_id
          ? pmUsersById[p.pm_id]?.full_name ?? '-'
          : '-'

      const roles = Object.fromEntries(
        ROLES.map((role) => {
          const key = `${p.id}:${role}` as KpiTableCellKey
          const v = cellValues[key]
          const specName = v?.specialistId ? specialistsById[v.specialistId]?.full_name ?? '' : ''
          const result = v?.score ?? '-'
          return [role, { specialist: specName, result }]
        }),
      ) as ProjectInput['roles']

      return {
        name: p.name,
        category: p.category,
        pm: pmName,
        roles,
      }
    })

    // PM list must match actual `pm` values inside projects (pm_name string or user-based).
    const pmNames = Array.from(
      new Set(
        inputProjects
          .map((p) => p.pm?.trim())
          .filter((x): x is string => !!x && x !== '-'),
      ),
    )

    // Ensure PMs exist in public.people and build name -> person_id mapping for snapshots.
    let pmNameToPersonId: Record<string, string | null> = {}
    if (isAdmin && pmNames.length) {
      const upRows = pmNames.map((n) => ({ full_name: n, person_type: 'pm' as const, is_active: true }))
      const { error: pmUpErr } = await supabase.from('people').upsert(upRows, { onConflict: 'full_name' })
      if (pmUpErr) {
        setError(pmUpErr.message)
        return
      }

      const { data: pmPeople, error: pmSelErr } = await supabase
        .from('people')
        .select('id, full_name, person_type')
        .in('full_name', pmNames)
      if (pmSelErr) {
        setError(pmSelErr.message)
        return
      }
      pmNameToPersonId = Object.fromEntries((pmPeople ?? []).map((p: any) => [p.full_name, p.id]))
    }

    const r = calculateKpi({
      projects: inputProjects,
      weights,
      specialists: specialistNames,
      pms: pmNames,
      roles: ROLES,
    })

    setResults(r)

    setIsPersisting(true)
    try {
      await persistSnapshots({
        periodId: period.id,
        inputProjects,
        specialistNames,
        pmNames,
        pmNameToPersonId,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося зберегти дані для дашборду.')
    } finally {
      setIsPersisting(false)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-600 dark:text-gray-400">Завантаження…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Введення KPI</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Працює через Supabase. Редагування дозволено лише в відкритому періоді.
          </p>
        </div>
        <PeriodPicker
          value={period}
          onChange={(p) => {
            setPeriod(p)
          }}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {isAdmin ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Додати проєкт (admin)</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              placeholder="Назва проєкту"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={newProjectCategory}
              onChange={(e) => setNewProjectCategory(e.target.value as DbProject['category'])}
            >
              <option value="VIP">VIP</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={newProjectPmId}
              onChange={(e) => setNewProjectPmId(e.target.value)}
            >
              <option value="">PM: —</option>
              {pms.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.full_name}
                </option>
              ))}
            </select>
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!newProjectName.trim() || isCreatingProject}
              onClick={createProject}
            >
              {isCreatingProject ? 'Додавання…' : 'Додати'}
            </button>
          </div>
        </div>
      ) : null}

      {!period ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
          Немає доступного періоду. Додайте запис у таблицю `periods`.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            aria-expanded={!isProjectsCollapsed}
            onClick={() => setIsProjectsCollapsed((v) => !v)}
          >
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Проєкти</div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {projects.length} {projects.length === 1 ? 'проєкт' : projects.length < 5 ? 'проєкти' : 'проєктів'}
                {isProjectsCollapsed ? ' • згорнуто' : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
              {isProjectsCollapsed ? 'Розгорнути' : 'Згорнути'}
              {isProjectsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </button>

          {isProjectsCollapsed ? null : (
            <div className="border-t border-gray-200 px-2 pb-2 dark:border-gray-800">
              <ProjectTable
                projects={visibleProjects}
                pms={pms}
                pmUsersById={pmUsersById}
                specialists={specialists}
                roles={ROLES}
                cellValues={cellValues}
                canEditProject={canEditProject}
                onCellChange={onCellChange}
                canAssignPm={isAdmin}
                onProjectPmChange={onProjectPmChange}
                onDeleteProject={isAdmin ? deleteProject : undefined}
              />
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              Розрахунок ефективності
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Формули і правила відповідають `handleCalculate()` з вашого HTML.
            </div>
          </div>
          <button
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void computeResults()}
            disabled={!period || projects.length === 0 || !profile}
          >
            {isPersisting ? 'ЗБЕРІГАЮ…' : 'РОЗРАХУВАТИ'}
          </button>
        </div>
      </div>

      {results ? (
        <div className="space-y-8">
          <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm dark:border-green-900/60 dark:bg-gray-950">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              Загальна ефективність відділу (керівник)
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                На основі {results.leader.total.toFixed(2)} вагових балів
              </div>
              <div className="text-right">
                <div className="text-4xl font-black text-green-700 dark:text-green-400">
                  {results.leader.percentage}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ({results.leader.success.toFixed(2)} успішних / {results.leader.total.toFixed(2)} заг.)
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div>
              <div className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                Деталізація спеціалістів
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Object.entries(results.specialists)
                  .filter(([, d]) => d.total > 0)
                  .map(([name, d]) => {
                    const status =
                      d.percentage >= 76
                        ? 'border-green-200 dark:border-green-900/60'
                        : d.percentage <= 50
                          ? 'border-red-200 dark:border-red-900/60'
                          : 'border-yellow-200 dark:border-yellow-900/60'

                    const pctColor =
                      d.percentage >= 76
                        ? 'text-green-600 dark:text-green-400'
                        : d.percentage <= 50
                          ? 'text-red-600 dark:text-red-300'
                          : 'text-yellow-600 dark:text-yellow-300'

                    return (
                      <div
                        key={name}
                        className={`overflow-hidden rounded-xl border ${status} bg-white shadow-sm dark:bg-gray-950`}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/40">
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{name}</div>
                            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Всього проєктів: {d.details.length}
                            </div>
                          </div>
                          <div className={`text-3xl font-black ${pctColor}`}>{d.percentage}%</div>
                        </div>
                        <div className="max-h-80 overflow-auto">
                          <table className="w-full">
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {d.details.map((row, idx) => (
                                <tr key={idx} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-900/40">
                                  <td className="px-4 py-2 text-gray-800 dark:text-gray-200">
                                    {row.roleName ? (
                                      <>
                                        {row.projectName}{' '}
                                        <span className="text-xs text-gray-400">({row.roleName})</span>
                                      </>
                                    ) : (
                                      row.projectName
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
                                    {row.category} ({row.weight})
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {row.isSuccess ? (
                                      <span className="font-bold text-green-600 dark:text-green-400">✓</span>
                                    ) : (
                                      <span className="font-bold text-red-600 dark:text-red-300">✕</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                    {row.contribution}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 text-sm dark:border-gray-800 dark:bg-gray-900/40">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Разом:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {d.success.toFixed(2)} / {d.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            <div>
              <div className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                Деталізація Project Manager'ів
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {Object.entries(results.pms)
                  .filter(([, d]) => d.total > 0)
                  .map(([name, d]) => {
                    const status =
                      d.percentage >= 76
                        ? 'border-green-200 dark:border-green-900/60'
                        : d.percentage <= 50
                          ? 'border-red-200 dark:border-red-900/60'
                          : 'border-yellow-200 dark:border-yellow-900/60'

                    const pctColor =
                      d.percentage >= 76
                        ? 'text-green-600 dark:text-green-400'
                        : d.percentage <= 50
                          ? 'text-red-600 dark:text-red-300'
                          : 'text-yellow-600 dark:text-yellow-300'

                    return (
                      <div
                        key={name}
                        className={`overflow-hidden rounded-xl border ${status} bg-white shadow-sm dark:bg-gray-950`}
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/40">
                          <div>
                            <div className="text-lg font-bold text-gray-900 dark:text-white">{name}</div>
                            <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              Всього проєктів: {d.details.length}
                            </div>
                          </div>
                          <div className={`text-3xl font-black ${pctColor}`}>{d.percentage}%</div>
                        </div>
                        <div className="max-h-80 overflow-auto">
                          <table className="w-full">
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {d.details.map((row, idx) => (
                                <tr key={idx} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-900/40">
                                  <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{row.projectName}</td>
                                  <td className="px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400">
                                    {row.category} ({row.weight})
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    {row.isSuccess ? (
                                      <span className="font-bold text-green-600 dark:text-green-400">✓</span>
                                    ) : (
                                      <span className="font-bold text-red-600 dark:text-red-300">✕</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                                    {row.contribution}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 bg-gray-50 px-5 py-3 text-sm dark:border-gray-800 dark:bg-gray-900/40">
                          <span className="font-medium text-gray-600 dark:text-gray-300">Разом:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {d.success.toFixed(2)} / {d.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
              Детальний аналіз проєктів (для PM)
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-[860px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Проєкт
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Статус
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      PM
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Вага
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      KPI (G/Y/R)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {Object.entries(results.projectAnalysis)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([name, d]) => (
                      <tr key={name} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={[
                              'inline-flex rounded px-2 py-1 text-xs font-bold',
                              d.isSuccessful
                                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
                            ].join(' ')}
                          >
                            {d.isSuccessful ? 'Успішний' : 'Неуспішний'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{d.pm}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300">{d.weight}</td>
                        <td className="px-4 py-3 text-sm font-mono">
                          <span className="font-bold text-green-600 dark:text-green-400">{d.green}</span> /{' '}
                          <span className="font-bold text-yellow-600 dark:text-yellow-300">{d.yellow}</span> /{' '}
                          <span className="font-bold text-red-500 dark:text-red-300">{d.red}</span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

