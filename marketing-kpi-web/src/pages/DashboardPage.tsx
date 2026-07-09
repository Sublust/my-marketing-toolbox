import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { calculateKpi } from '../domain/kpiEngine'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import type {
  DbCategoryWeight,
  DbPeriod,
  DbKpiRecord,
  DbKpiSnapshot,
  DbPerson,
  DbProject,
  TaskRole,
  SnapshotDirection,
  SnapshotScope,
} from '../lib/types'
import { CategoryHealthChart } from '../components/dashboard/CategoryHealthChart'
import { PmEfficiencyChart } from '../components/dashboard/PmEfficiencyChart'
import { ProblematicProjectsList } from '../components/dashboard/ProblematicProjectsList'
import { SpecialistFailsList } from '../components/dashboard/SpecialistFailsList'
import { SpecialistWorkloadChart } from '../components/dashboard/SpecialistWorkloadChart'
import {
  computeCategoryHealth,
  computeProblematicProjects,
  computeSpecialistFails,
  computeSpecialistWorkloadSeries,
  weightsToMap,
} from '../dashboard/analytics'

type Point = { label: string; value: number | null }
type DirectionBar = { direction: 'seo' | 'context' | 'target' | 'tiktok'; label: string; value: number }
type RankRow = { name: string; value: number }
type PmEffRow = { name: string; value: number }
type CategoryRow = { label: string; value: number }

function kpiColor(pct: number) {
  if (pct >= 76) return '#16a34a' // green-600
  if (pct <= 50) return '#dc2626' // red-600
  return '#f59e0b' // amber-500
}

function periodLabel(p: DbPeriod) {
  const mm = String(p.month).padStart(2, '0')
  return `${mm}.${p.year}`
}

export function DashboardPage() {
  const { user, profile } = useAuth()
  const [points, setPoints] = useState<Point[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periods, setPeriods] = useState<DbPeriod[]>([])
  const [people, setPeople] = useState<DbPerson[]>([])
  const [scope, setScope] = useState<SnapshotScope>('department')
  const [sliceDirection, setSliceDirection] = useState<SnapshotDirection>('all')
  const [specialistId, setSpecialistId] = useState<string>('') // people.id
  const [pmPersonId, setPmPersonId] = useState<string>('') // people.id
  const [pmOptions, setPmOptions] = useState<Array<{ id: string; name: string }>>([])
  const [slicePeriodId, setSlicePeriodId] = useState<string>('')
  const [sliceRows, setSliceRows] = useState<DbKpiSnapshot[]>([])
  const [isSliceLoading, setIsSliceLoading] = useState(false)

  const [summary, setSummary] = useState<{
    periodPct: number | null
    deltaPct: number | null
    activeProjects: number | null
  }>({ periodPct: null, deltaPct: null, activeProjects: null })
  const [directionBars, setDirectionBars] = useState<DirectionBar[]>([])
  const [ranking, setRanking] = useState<RankRow[]>([])

  const [projects, setProjects] = useState<DbProject[]>([])
  const [weights, setWeights] = useState<DbCategoryWeight[]>([])
  const [periodRecords, setPeriodRecords] = useState<
    Array<Pick<DbKpiRecord, 'period_id' | 'project_id' | 'specialist_person_id' | 'task_role' | 'score'>>
  >([])

  const [pmEfficiencyRows, setPmEfficiencyRows] = useState<PmEffRow[]>([])
  const [categoryHealthRows, setCategoryHealthRows] = useState<CategoryRow[]>([])
  const [problemProjects, setProblemProjects] = useState<
    Array<{ projectName: string; category: string; redCount: number; yellowCount: number; greenCount: number; totalCount: number }>
  >([])
  const [specialistFails, setSpecialistFails] = useState<
    Array<{ projectName: string; category: string; pmName: string | null; role: string }>
  >([])
  const [workloadPoints, setWorkloadPoints] = useState<Array<{ label: string; totalWeight: number }>>([])

  const ROLES: TaskRole[] = ['seo', 'context', 'target', 'tiktok']

  const title = useMemo(() => {
    const name = profile?.full_name ?? 'Користувач'
    return `Дашборд: ${name}`
  }, [profile?.full_name])

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!user?.id) return
      setIsLoading(true)
      setError(null)

      const { data: per, error: perErr } = await supabase
        .from('periods')
        .select('id, year, month, is_closed')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(24)

      if (!alive) return
      if (perErr) {
        setError(perErr.message)
        setIsLoading(false)
        return
      }

      const perList = ((per ?? []) as DbPeriod[]).slice().reverse()
      setPeriods(perList)
      if (perList.length) {
        setSlicePeriodId((prev) => prev || perList[perList.length - 1]!.id)
      }

      const { data: ppl } = await supabase
        .from('people')
        .select('id, full_name, person_type, is_active, directions')
        .eq('person_type', 'specialist')
        .order('full_name')
      if (!alive) return
      setPeople((ppl ?? []) as DbPerson[])

      setIsLoading(false)
    }

    void run()
    return () => {
      alive = false
    }
  }, [user?.id])

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === slicePeriodId) ?? null,
    [periods, slicePeriodId],
  )

  /** Останні до 6 періодів, що закінчуються обраним місяцем — для тренду та навантаження. */
  const trendPeriods = useMemo(() => {
    if (!periods.length) return []
    const toIdx = periods.findIndex((p) => p.id === slicePeriodId)
    if (toIdx < 0) return []
    const fromIdx = Math.max(0, toIdx - 5)
    return periods.slice(fromIdx, toIdx + 1)
  }, [periods, slicePeriodId])

  const deltaColorClass = useMemo(() => {
    if (summary.deltaPct == null) return 'text-gray-900 dark:text-white'
    if (summary.deltaPct > 0) return 'text-green-600 dark:text-green-400'
    if (summary.deltaPct < 0) return 'text-red-600 dark:text-red-400'
    return 'text-amber-600 dark:text-amber-400'
  }, [summary.deltaPct])

  const prevPeriod = useMemo(() => {
    if (!selectedPeriod) return null
    const idx = periods.findIndex((p) => p.id === selectedPeriod.id)
    if (idx <= 0) return null
    return periods[idx - 1] ?? null
  }, [periods, selectedPeriod])

  const weightsByCategory = useMemo(() => weightsToMap(weights), [weights])

  const peopleById = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])

  const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects])

  const filteredProjectIds = useMemo(() => {
    if (scope === 'pm') {
      if (!pmPersonId) return []
      return projects.filter((p) => (p.pm_person_id ?? null) === pmPersonId).map((p) => p.id)
    }
    return projects.map((p) => p.id)
  }, [projects, scope, pmPersonId])

  const recordsForScopeAndPeriod = useMemo(() => {
    let rows = periodRecords
    if (scope === 'pm') {
      const ids = new Set(filteredProjectIds)
      rows = rows.filter((r) => ids.has(r.project_id))
    }
    if (scope === 'specialist' && specialistId) {
      rows = rows.filter((r) => r.specialist_person_id === specialistId)
    }
    return rows
  }, [periodRecords, scope, filteredProjectIds, specialistId])

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!user?.id) return
      if (!slicePeriodId) return

      setIsSliceLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('kpi_snapshots')
        .select(
          'id, period_id, scope, direction, subject_kind, subject_id, subject_name, percentage, success_weight, total_weight, computed_by, computed_at',
        )
        .eq('period_id', slicePeriodId)
        .eq('direction', sliceDirection)

      if (!alive) return
      if (error) {
        setError(error.message)
        setSliceRows([])
        setIsSliceLoading(false)
        return
      }

      setSliceRows((data ?? []) as DbKpiSnapshot[])
      setIsSliceLoading(false)
    }

    void run()
    return () => {
      alive = false
    }
  }, [user?.id, slicePeriodId, sliceDirection])

  // Load projects + weights + KPI records for selected period (base for conditional widgets).
  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!user?.id) return
      if (!selectedPeriod) return
      setError(null)

      const periodId = selectedPeriod.id

      const [{ data: proj, error: projErr }, { data: cw, error: cwErr }, { data: recs, error: recErr }] =
        await Promise.all([
          supabase.from('projects').select('id, name, category, pm_id, pm_name, pm_person_id, is_active').order('name'),
          supabase.from('category_weights').select('category, weight'),
          supabase
            .from('kpi_records')
            .select('period_id, project_id, specialist_person_id, task_role, score')
            .eq('period_id', periodId),
        ])

      if (!alive) return
      if (projErr || cwErr || recErr) {
        setError(projErr?.message ?? cwErr?.message ?? recErr?.message ?? 'Помилка завантаження даних для дашборду')
        return
      }

      setProjects((proj ?? []) as DbProject[])
      setWeights((cw ?? []) as DbCategoryWeight[])
      setPeriodRecords(
        ((recs ?? []) as any[]).map((r) => ({
          period_id: r.period_id as string,
          project_id: r.project_id as string,
          specialist_person_id: (r.specialist_person_id ?? null) as string | null,
          task_role: r.task_role as TaskRole,
          score: r.score as DbKpiRecord['score'],
        })),
      )
    }
    void run()
    return () => {
      alive = false
    }
  }, [user?.id, selectedPeriod?.id])

  useEffect(() => {
    let alive = true

    const run = async () => {
      if (!user?.id) return
      if (!selectedPeriod) return

      setError(null)

      const periodId = selectedPeriod.id
      const prevId = prevPeriod?.id ?? null

      // Summary cards
      const mkSummarySnapQuery = (pid: string) => {
        const q = supabase
          .from('kpi_snapshots')
          .select('percentage, total_weight', { count: 'exact', head: false })
          .eq('period_id', pid)
          .eq('direction', 'all')
          .limit(1)

        if (scope === 'department') {
          return q.eq('scope', 'department').eq('subject_kind', 'department')
        }
        if (scope === 'pm') {
          return q.eq('scope', 'pm').eq('subject_kind', 'person').eq('subject_id', pmPersonId)
        }
        return q.eq('scope', 'specialist').eq('subject_kind', 'person').eq('subject_id', specialistId)
      }

      const curSummaryPromise =
        scope === 'pm' && !pmPersonId
          ? Promise.resolve({ data: null, error: null } as any)
          : scope === 'specialist' && !specialistId
            ? Promise.resolve({ data: null, error: null } as any)
            : mkSummarySnapQuery(periodId)

      const prevSummaryPromise =
        !prevId
          ? Promise.resolve({ data: null, error: null } as any)
          : scope === 'pm' && !pmPersonId
            ? Promise.resolve({ data: null, error: null } as any)
            : scope === 'specialist' && !specialistId
              ? Promise.resolve({ data: null, error: null } as any)
              : mkSummarySnapQuery(prevId)

      const [{ data: curSnapRows, error: curErr }, { data: prevSnapRows, error: prevErr }] = await Promise.all([
        curSummaryPromise,
        prevSummaryPromise,
      ])

      if (!alive) return
      if (curErr || prevErr) {
        setError(curErr?.message ?? prevErr?.message ?? 'Помилка завантаження дашборду')
        return
      }

      const curPct =
        curSnapRows?.[0]?.percentage != null && Number(curSnapRows?.[0]?.total_weight ?? 0) > 0
          ? Number(curSnapRows[0].percentage)
          : null
      const prevPct =
        prevSnapRows?.[0]?.percentage != null && Number(prevSnapRows?.[0]?.total_weight ?? 0) > 0
          ? Number(prevSnapRows[0].percentage)
          : null
      const delta = curPct != null && prevPct != null ? Number((curPct - prevPct).toFixed(1)) : null

      // PM options for selected period (based on all-direction snapshots)
      const { data: pmRows } = await supabase
        .from('kpi_snapshots')
        .select('subject_id, subject_name')
        .eq('period_id', periodId)
        .eq('scope', 'pm')
        .eq('direction', 'all')
        .eq('subject_kind', 'person')

      if (!alive) return
      const nextPmOptions = Array.from(
        new Map(
          ((pmRows ?? []) as Array<{ subject_id: string | null; subject_name: string }>)
            .filter((r) => !!r.subject_id)
            .map((r) => [r.subject_id as string, { id: r.subject_id as string, name: r.subject_name }]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name))
      setPmOptions(nextPmOptions)
      if (pmPersonId && !nextPmOptions.some((x) => x.id === pmPersonId)) {
        setPmPersonId('')
      }

      // Active projects for selected period + filters (direction/specialist)
      let projectIdsFilter: string[] | null = null
      if (scope === 'pm' && pmPersonId) {
        const { data: projRows, error: projErr } = await supabase
          .from('projects')
          .select('id')
          .eq('pm_person_id', pmPersonId)
        if (!alive) return
        if (projErr) {
          setError(projErr.message)
          return
        }
        projectIdsFilter = (projRows ?? []).map((r: any) => r.id)
      }

      const q = supabase.from('kpi_records').select('project_id', { count: 'exact', head: false }).eq('period_id', periodId)

      if (sliceDirection !== 'all') {
        q.eq('task_role', sliceDirection)
      }
      if (scope === 'specialist' && specialistId) {
        q.eq('specialist_person_id', specialistId)
      }
      if (projectIdsFilter) {
        if (projectIdsFilter.length === 0) {
          setSummary({ periodPct: curPct, deltaPct: delta, activeProjects: 0 })
          return
        }
        q.in('project_id', projectIdsFilter)
      }

      const { data: kpiRows, error: kpiErr } = await q
      if (!alive) return
      if (kpiErr) {
        setError(kpiErr.message)
        return
      }

      const activeProjectCount = new Set((kpiRows ?? []).map((r: any) => r.project_id)).size

      setSummary({
        periodPct: curPct,
        deltaPct: delta,
        activeProjects: activeProjectCount,
      })

      // Conditional widgets data (department / pm / specialist)
      if (scope === 'department') {
        // Efficiency by directions (department snapshots)
        const { data: dirRows, error: dirErr } = await supabase
          .from('kpi_snapshots')
          .select('direction, percentage')
          .eq('period_id', periodId)
          .eq('scope', 'department')
          .in('direction', ROLES)
          .eq('subject_kind', 'department')

        if (!alive) return
        if (dirErr) {
          setError(dirErr.message)
          return
        }

        const dirMap = new Map<string, number>()
        for (const r of (dirRows ?? []) as Array<{ direction: string; percentage: any }>) {
          dirMap.set(r.direction, Number(r.percentage))
        }
        setDirectionBars([
          { direction: 'seo', label: 'SEO', value: dirMap.get('seo') ?? 0 },
          { direction: 'context', label: 'Context', value: dirMap.get('context') ?? 0 },
          { direction: 'target', label: 'Target', value: dirMap.get('target') ?? 0 },
          { direction: 'tiktok', label: 'TikTok', value: dirMap.get('tiktok') ?? 0 },
        ])

        // Specialist leaderboard (department scope)
        const { data: specRows, error: specErr } = await supabase
          .from('kpi_snapshots')
          .select('subject_name, percentage')
          .eq('period_id', periodId)
          .eq('scope', 'specialist')
          .eq('direction', 'all')
          .eq('subject_kind', 'person')

        if (!alive) return
        if (specErr) {
          setError(specErr.message)
          return
        }

        const ranked = ((specRows ?? []) as Array<{ subject_name: string; percentage: any }>)
          .map((r) => ({ name: r.subject_name, value: Number(r.percentage) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10)
        setRanking(ranked)

        // PM efficiency widget
        const { data: pmEff, error: pmEffErr } = await supabase
          .from('kpi_snapshots')
          .select('subject_name, percentage')
          .eq('period_id', periodId)
          .eq('scope', 'pm')
          .eq('direction', 'all')
          .eq('subject_kind', 'person')

        if (!alive) return
        if (pmEffErr) {
          setError(pmEffErr.message)
          return
        }
        setPmEfficiencyRows(
          ((pmEff ?? []) as any[])
            .map((r) => ({ name: String(r.subject_name), value: Number(r.percentage) }))
            .sort((a, b) => b.value - a.value),
        )

        // Health by category (computed from kpi_records)
        const cats = computeCategoryHealth({
          projects,
          records: periodRecords.map((r) => ({ project_id: r.project_id, task_role: r.task_role, score: r.score })),
          weightsByCategory,
        })
        setCategoryHealthRows(cats.map((c) => ({ label: c.label, value: c.percentage })))

        setProblemProjects([])
        setSpecialistFails([])
        setWorkloadPoints([])
        return
      }

      if (scope === 'pm') {
        if (!pmPersonId) {
          setDirectionBars([])
          setRanking([])
          setPmEfficiencyRows([])
          setCategoryHealthRows([])
          setProblemProjects([])
          setSpecialistFails([])
          setWorkloadPoints([])
          return
        }

        // PM direction bars (snapshots)
        const { data: pmDirRows, error: pmDirErr } = await supabase
          .from('kpi_snapshots')
          .select('direction, percentage')
          .eq('period_id', periodId)
          .eq('scope', 'pm')
          .eq('subject_kind', 'person')
          .eq('subject_id', pmPersonId)
          .in('direction', ROLES)

        if (!alive) return
        if (pmDirErr) {
          setError(pmDirErr.message)
          return
        }
        const dirMap = new Map<string, number>()
        for (const r of (pmDirRows ?? []) as Array<{ direction: string; percentage: any }>) {
          dirMap.set(r.direction, Number(r.percentage))
        }
        setDirectionBars([
          { direction: 'seo', label: 'SEO', value: dirMap.get('seo') ?? 0 },
          { direction: 'context', label: 'Context', value: dirMap.get('context') ?? 0 },
          { direction: 'target', label: 'Target', value: dirMap.get('target') ?? 0 },
          { direction: 'tiktok', label: 'TikTok', value: dirMap.get('tiktok') ?? 0 },
        ])

        // My Team leaderboard (computed from records strictly on PM projects)
        const pmProjIds = new Set(projects.filter((p) => (p.pm_person_id ?? null) === pmPersonId).map((p) => p.id))
        const pmRecs = periodRecords.filter((r) => pmProjIds.has(r.project_id))
        const specialistNames = Array.from(
          new Set(
            pmRecs
              .map((r) => (r.specialist_person_id ? peopleById[r.specialist_person_id]?.full_name : null))
              .filter((x): x is string => !!x),
          ),
        )

        const pmLabel = pmOptions.find((x) => x.id === pmPersonId)?.name ?? 'PM'
        const inputProjects = Array.from(pmProjIds).map((projectId) => {
          const p = projectsById[projectId]
          const roles = Object.fromEntries(
            ROLES.map((role) => {
              const rr = pmRecs.find((x) => x.project_id === projectId && x.task_role === role)
              const specName = rr?.specialist_person_id ? peopleById[rr.specialist_person_id]?.full_name ?? '' : ''
              const result = rr?.score ?? '-'
              return [role, { specialist: specName, result }]
            }),
          ) as any
          return { name: p?.name ?? projectId, category: (p?.category ?? 'C') as any, pm: pmLabel, roles }
        })

        const res = calculateKpi({
          projects: inputProjects,
          weights: weightsByCategory as any,
          specialists: specialistNames,
          pms: [pmLabel],
          roles: ROLES,
        })
        setRanking(
          Object.entries(res.specialists)
            .map(([name, st]) => ({ name, value: st.percentage }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10),
        )

        // Problematic projects (top 3-5) in current period for this PM
        const probs = computeProblematicProjects({
          projects: projects.filter((p) => pmProjIds.has(p.id)),
          records: pmRecs.map((r) => ({ project_id: r.project_id, task_role: r.task_role, score: r.score })),
          topN: 5,
        })
        setProblemProjects(
          probs.map((p) => ({
            projectName: p.projectName,
            category: p.category,
            redCount: p.redCount,
            yellowCount: p.yellowCount,
            greenCount: p.greenCount,
            totalCount: p.totalCount,
          })),
        )

        setPmEfficiencyRows([])
        setCategoryHealthRows([])
        setSpecialistFails([])
        setWorkloadPoints([])
        return
      }

      if (scope === 'specialist') {
        if (!specialistId) {
          setDirectionBars([])
          setRanking([])
          setPmEfficiencyRows([])
          setCategoryHealthRows([])
          setProblemProjects([])
          setSpecialistFails([])
          setWorkloadPoints([])
          return
        }

        // Specialist direction bars (snapshots), hide directions with 0 total_weight
        const { data: specDirRows, error: specDirErr } = await supabase
          .from('kpi_snapshots')
          .select('direction, percentage, total_weight')
          .eq('period_id', periodId)
          .eq('scope', 'specialist')
          .eq('subject_kind', 'person')
          .eq('subject_id', specialistId)
          .in('direction', ROLES)

        if (!alive) return
        if (specDirErr) {
          setError(specDirErr.message)
          return
        }

        const bars = ((specDirRows ?? []) as any[])
          .map((r) => ({
            direction: r.direction as TaskRole,
            label: r.direction === 'seo' ? 'SEO' : r.direction === 'context' ? 'Context' : r.direction === 'target' ? 'Target' : 'TikTok',
            value: Number(r.percentage),
            total: Number(r.total_weight ?? 0),
          }))
          .filter((x) => x.total > 0)

        setDirectionBars(
          bars.map((b) => ({ direction: b.direction as any, label: b.label, value: b.value })),
        )

        // Workload series for last 6 periods ending at selected month
        const perIds = trendPeriods.map((p) => p.id)
        const { data: wr, error: wrErr } = await supabase
          .from('kpi_records')
          .select('period_id, project_id, specialist_person_id, task_role, score')
          .in('period_id', perIds)
          .eq('specialist_person_id', specialistId)

        if (!alive) return
        if (wrErr) {
          setError(wrErr.message)
          return
        }

        const workload = computeSpecialistWorkloadSeries({
          periods: trendPeriods.map((p) => ({ id: p.id, label: periodLabel(p) })),
          projects,
          records: (wr ?? []) as any,
          specialistId,
          weightsByCategory,
        })
        setWorkloadPoints(workload)

        // Fails list ("0") for selected period
        const fails = computeSpecialistFails({
          projects,
          records: recordsForScopeAndPeriod.map((r) => ({
            project_id: r.project_id,
            task_role: r.task_role,
            score: r.score,
            specialist_person_id: r.specialist_person_id ?? null,
          })),
          specialistId,
        })
        setSpecialistFails(
          fails.map((f) => ({
            projectName: f.projectName,
            category: f.category,
            pmName: f.pmName,
            role: f.role,
          })),
        )

        // Remove leaderboard in specialist view
        setRanking([])
        setPmEfficiencyRows([])
        setCategoryHealthRows([])
        setProblemProjects([])
        return
      }
    }

    void run()
    return () => {
      alive = false
    }
  }, [
    user?.id,
    selectedPeriod?.id,
    prevPeriod?.id,
    sliceDirection,
    scope,
    specialistId,
    pmPersonId,
    // data dependencies for computed widgets
    projects,
    periodRecords,
    weightsByCategory,
    periods,
    peopleById,
    projectsById,
    recordsForScopeAndPeriod,
  ])

  const sliceDepartment = useMemo(() => {
    return (
      sliceRows.find((r) => r.scope === 'department' && r.subject_kind === 'department') ?? null
    )
  }, [sliceRows])

  const sliceSpecialists = useMemo(() => {
    return sliceRows
      .filter((r) => r.scope === 'specialist')
      .slice()
      .sort((a, b) => Number(b.percentage) - Number(a.percentage))
  }, [sliceRows])

  const slicePms = useMemo(() => {
    return sliceRows
      .filter((r) => r.scope === 'pm')
      .slice()
      .sort((a, b) => Number(b.percentage) - Number(a.percentage))
  }, [sliceRows])

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!user?.id) return
      if (!periods.length) return
      setError(null)

      const perIds = trendPeriods.map((p) => p.id)

      const q = supabase
        .from('kpi_snapshots')
        .select('id, period_id, scope, direction, subject_kind, subject_id, subject_name, percentage, success_weight, total_weight, computed_by, computed_at')
        .in('period_id', perIds)
        .eq('scope', scope)
        .eq('direction', 'all')

      if (scope === 'specialist') {
        if (!specialistId) {
          setPoints([])
          return
        }
        q.eq('subject_kind', 'person').eq('subject_id', specialistId)
      } else if (scope === 'department') {
        q.eq('subject_kind', 'department')
      } else if (scope === 'pm') {
        if (!pmPersonId) {
          setPoints([])
          return
        }
        q.eq('subject_kind', 'person').eq('subject_id', pmPersonId)
      }

      // PM scope: by default show department if no specific PM filter in MVP

      const { data, error } = await q
      if (!alive) return
      if (error) {
        setError(error.message)
        setPoints([])
        return
      }

      const rows = (data ?? []) as DbKpiSnapshot[]
      const byPer = new Map<string, number>()
      for (const r of rows) {
        const total = Number((r as any).total_weight ?? 0)
        if (Number.isFinite(total) && total > 0) {
          byPer.set(r.period_id, Number(r.percentage))
        }
      }

      const pts: Point[] = trendPeriods.map((p) => ({
        label: periodLabel(p),
        value: byPer.has(p.id) ? (byPer.get(p.id) ?? null) : null,
      }))
      setPoints(pts)
    }
    void run()
    return () => {
      alive = false
    }
  }, [user?.id, periods, trendPeriods, scope, specialistId, pmPersonId])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{title}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              KPI% (збережені снапшоти)
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Дані потрапляють сюди після натискання “РОЗРАХУВАТИ” у `/kpi`.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={slicePeriodId}
              onChange={(e) => setSlicePeriodId(e.target.value)}
              title="Період для дашборду"
            >
              {periods
                .slice()
                .reverse()
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Період: {periodLabel(p)}
                    {p.is_closed ? ' (закрито)' : ''}
                  </option>
                ))}
            </select>

            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={scope}
              onChange={(e) => {
                const v = e.target.value as SnapshotScope
                setScope(v)
                if (v !== 'specialist') setSpecialistId('')
                if (v !== 'pm') setPmPersonId('')
              }}
            >
              <option value="department">Відділ загалом</option>
              <option value="specialist">Спеціаліст</option>
              <option value="pm">PM</option>
            </select>

            {/* Напрямок як фільтр застосовується лише до "Зрізу" та до картки "Активні проєкти" */}

            {scope === 'specialist' ? (
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={specialistId}
                onChange={(e) => setSpecialistId(e.target.value)}
              >
                <option value="">Спеціаліст: оберіть…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}{p.is_active ? '' : ' (не працює)'}
                  </option>
                ))}
              </select>
            ) : null}

            {scope === 'pm' ? (
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                value={pmPersonId}
                onChange={(e) => setPmPersonId(e.target.value)}
              >
                <option value="">PM: оберіть…</option>
                {pmOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">KPI за період</div>
            <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              {summary.periodPct == null ? '—' : `${summary.periodPct.toFixed(1)}%`}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {selectedPeriod ? `Період: ${periodLabel(selectedPeriod)}` : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Зміна до попереднього</div>
            <div className={['mt-2 text-3xl font-black', deltaColorClass].join(' ')}>
              {summary.deltaPct == null ? '—' : `${summary.deltaPct > 0 ? '+' : ''}${summary.deltaPct.toFixed(1)}%`}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {prevPeriod ? `Попер.: ${periodLabel(prevPeriod)}` : 'Немає попереднього періоду'}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Активні проєкти</div>
            <div className="mt-2 text-3xl font-black text-gray-900 dark:text-white">
              {summary.activeProjects == null ? '—' : summary.activeProjects}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Проєкти з KPI-даними у вибраному періоді (з урахуванням фільтрів)
            </div>
          </div>
        </div>

        <div className="mt-4 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Графік за останні 6 періодів (до обраного місяця)
        </div>
        {isLoading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Завантаження…</div>
        ) : points.length === 0 ? (
          <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div>Немає даних для графіка.</div>
            <button
              className="w-fit rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              onClick={() => window.location.assign('/kpi')}
            >
              Перейти в KPI і розрахувати
            </button>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={240}>
              <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Ефективність за напрямками (період)
          </div>
          {directionBars.length === 0 ? (
            <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div>Немає даних. Натисніть “РОЗРАХУВАТИ” у `/kpi` для цього періоду.</div>
              <button
                className="w-fit rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                onClick={() => window.location.assign('/kpi')}
              >
                Перейти в KPI і розрахувати
              </button>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={220}>
                <BarChart data={directionBars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {directionBars.map((b) => (
                      <Cell key={b.direction} fill={kpiColor(b.value)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {scope === 'department' ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Рейтинг спеціалістів (топ-10)
            </div>
            {ranking.length === 0 ? (
              <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400">
                <div>Немає даних. Натисніть “РОЗРАХУВАТИ” у `/kpi` для цього періоду.</div>
                <button
                  className="w-fit rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  onClick={() => window.location.assign('/kpi')}
                >
                  Перейти в KPI і розрахувати
                </button>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={220}>
                  <BarChart
                    data={ranking}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {ranking.map((r) => (
                        <Cell key={r.name} fill={kpiColor(r.value)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : scope === 'pm' ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Моя команда (спеціалісти на проєктах PM)
            </div>
            {ranking.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-400">Немає даних.</div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={220}>
                  <BarChart
                    data={ranking}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {ranking.map((r) => (
                        <Cell key={r.name} fill={kpiColor(r.value)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <SpecialistWorkloadChart points={workloadPoints} />
        )}
      </div>

      {scope === 'department' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PmEfficiencyChart rows={pmEfficiencyRows} />
          <CategoryHealthChart rows={categoryHealthRows} />
        </div>
      ) : null}

      {scope === 'pm' ? <ProblematicProjectsList rows={problemProjects} /> : null}

      {scope === 'specialist' ? <SpecialistFailsList rows={specialistFails} /> : null}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              Зріз за період
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Відображає збережені снапшоти по вибраному періоду і напрямку.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={sliceDirection}
              onChange={(e) => setSliceDirection(e.target.value as SnapshotDirection)}
            >
              <option value="all">Напрямок: всі</option>
              <option value="seo">SEO</option>
              <option value="context">Контекст</option>
              <option value="target">Таргет</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
        </div>

        {isSliceLoading ? (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">Завантаження…</div>
        ) : (
          <div className="mt-4 space-y-6">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                Відділ загалом
              </div>
              {sliceDepartment ? (
                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Number(sliceDepartment.success_weight).toFixed(2)} / {Number(sliceDepartment.total_weight).toFixed(2)}
                  </div>
                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    {Number(sliceDepartment.percentage).toFixed(1)}%
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Немає снапшота. Натисніть “РОЗРАХУВАТИ” для цього періоду.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Спеціалісти
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  <table className="min-w-[520px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Імʼя
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          %
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Вага (усп/заг)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {sliceSpecialists.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                          <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {r.subject_name}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                            {Number(r.percentage).toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-right text-xs font-mono text-gray-700 dark:text-gray-300">
                            {Number(r.success_weight).toFixed(2)} / {Number(r.total_weight).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {sliceSpecialists.length === 0 ? (
                        <tr>
                          <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400" colSpan={3}>
                            Немає даних.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <div className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  PM
                </div>
                {slicePms.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Немає даних по PM за вибраний період/напрямок.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                    <table className="min-w-[520px] w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Імʼя
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            %
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Вага (усп/заг)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {slicePms.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                            <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {r.subject_name}
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                              {Number(r.percentage).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-right text-xs font-mono text-gray-700 dark:text-gray-300">
                              {Number(r.success_weight).toFixed(2)} / {Number(r.total_weight).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

