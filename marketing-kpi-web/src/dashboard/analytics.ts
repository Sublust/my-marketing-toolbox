import type { DbCategoryWeight, DbKpiRecord, DbProject, ProjectCategory, TaskRole } from '../lib/types'
import { computeProjectSuccess, isScoreSuccess } from '../domain/kpiEngine'

export type CategoryHealthRow = {
  category: ProjectCategory
  label: string
  percentage: number
  successWeight: number
  totalWeight: number
}

export type PmEfficiencyRow = { name: string; percentage: number }

export type ProblemProjectRow = {
  projectId: string
  projectName: string
  category: ProjectCategory
  pmName: string | null
  redCount: number
  greenCount: number
  yellowCount: number
  totalCount: number
  isSuccessful: boolean | null
}

export type WorkloadPoint = { label: string; totalWeight: number }

export type SpecialistFailRow = {
  projectId: string
  projectName: string
  category: ProjectCategory
  pmName: string | null
  role: TaskRole
}

export function weightsToMap(weights: DbCategoryWeight[]) {
  const map: Record<ProjectCategory, number> = { VIP: 1.5, A: 1, B: 0.75, C: 0.5 }
  for (const w of weights) map[w.category] = Number(w.weight)
  return map
}

export function computeCategoryHealth(params: {
  projects: DbProject[]
  records: Array<Pick<DbKpiRecord, 'project_id' | 'task_role' | 'score'>>
  weightsByCategory: Record<ProjectCategory, number>
}) {
  const { projects, records, weightsByCategory } = params
  const projById = new Map(projects.map((p) => [p.id, p]))

  const byProject = new Map<string, Array<Pick<DbKpiRecord, 'task_role' | 'score'>>>()
  for (const r of records) {
    if (!byProject.has(r.project_id)) byProject.set(r.project_id, [])
    byProject.get(r.project_id)!.push({ task_role: r.task_role, score: r.score })
  }

  const agg: Record<ProjectCategory, { success: number; total: number }> = {
    VIP: { success: 0, total: 0 },
    A: { success: 0, total: 0 },
    B: { success: 0, total: 0 },
    C: { success: 0, total: 0 },
  }

  for (const [projectId, rows] of byProject.entries()) {
    const proj = projById.get(projectId)
    if (!proj) continue
    const weight = weightsByCategory[proj.category] ?? 0
    if (weight <= 0) continue

    let green = 0
    let yellow = 0
    let red = 0
    for (const x of rows) {
      if (x.score === '1') green++
      else if (x.score === 'ж') yellow++
      else if (x.score === '0') red++
    }
    const success = computeProjectSuccess(green, yellow, red)
    if (success == null) continue

    agg[proj.category].total += weight
    if (success) agg[proj.category].success += weight
  }

  const order: ProjectCategory[] = ['VIP', 'A', 'B', 'C']
  const out: CategoryHealthRow[] = order.map((c) => {
    const st = agg[c]
    const pct = st.total === 0 ? 0 : Math.round((st.success / st.total) * 1000) / 10
    return {
      category: c,
      label: c,
      percentage: pct,
      successWeight: st.success,
      totalWeight: st.total,
    }
  })
  return out
}

export function computeProblematicProjects(params: {
  projects: DbProject[]
  records: Array<Pick<DbKpiRecord, 'project_id' | 'task_role' | 'score'>>
  topN?: number
}) {
  const { projects, records, topN = 5 } = params
  const projById = new Map(projects.map((p) => [p.id, p]))

  const byProject = new Map<string, Array<Pick<DbKpiRecord, 'task_role' | 'score'>>>()
  for (const r of records) {
    if (!byProject.has(r.project_id)) byProject.set(r.project_id, [])
    byProject.get(r.project_id)!.push({ task_role: r.task_role, score: r.score })
  }

  const rows: ProblemProjectRow[] = []
  for (const [projectId, rs] of byProject.entries()) {
    const p = projById.get(projectId)
    if (!p) continue
    let green = 0
    let yellow = 0
    let red = 0
    for (const x of rs) {
      if (x.score === '1') green++
      else if (x.score === 'ж') yellow++
      else if (x.score === '0') red++
    }
    const total = green + yellow + red
    if (total === 0) continue
    const success = computeProjectSuccess(green, yellow, red)

    rows.push({
      projectId,
      projectName: p.name,
      category: p.category,
      pmName: p.pm_name ?? null,
      redCount: red,
      greenCount: green,
      yellowCount: yellow,
      totalCount: total,
      isSuccessful: success,
    })
  }

  return rows
    .sort((a, b) => {
      if (b.redCount !== a.redCount) return b.redCount - a.redCount
      const aPct = a.totalCount === 0 ? 100 : ((a.greenCount + a.yellowCount) / a.totalCount) * 100
      const bPct = b.totalCount === 0 ? 100 : ((b.greenCount + b.yellowCount) / b.totalCount) * 100
      return aPct - bPct
    })
    .slice(0, topN)
}

export function computeSpecialistWorkloadSeries(params: {
  periods: Array<{ id: string; label: string }>
  projects: DbProject[]
  records: Array<Pick<DbKpiRecord, 'period_id' | 'project_id' | 'specialist_person_id' | 'task_role' | 'score'>>
  specialistId: string
  weightsByCategory: Record<ProjectCategory, number>
}) {
  const { periods, projects, records, specialistId, weightsByCategory } = params
  const projById = new Map(projects.map((p) => [p.id, p]))

  const byPeriod = new Map<string, number>()
  for (const p of periods) byPeriod.set(p.id, 0)

  for (const r of records) {
    if (r.specialist_person_id !== specialistId) continue
    if (r.score !== '1' && r.score !== 'ж' && r.score !== '0') continue
    const proj = projById.get(r.project_id)
    if (!proj) continue
    const w = weightsByCategory[proj.category] ?? 0
    if (w <= 0) continue
    byPeriod.set(r.period_id, (byPeriod.get(r.period_id) ?? 0) + w)
  }

  const out: WorkloadPoint[] = periods.map((p) => ({
    label: p.label,
    totalWeight: Math.round((byPeriod.get(p.id) ?? 0) * 100) / 100,
  }))
  return out
}

export function computeSpecialistFails(params: {
  projects: DbProject[]
  records: Array<Pick<DbKpiRecord, 'project_id' | 'task_role' | 'score' | 'specialist_person_id'>>
  specialistId: string
}) {
  const { projects, records, specialistId } = params
  const projById = new Map(projects.map((p) => [p.id, p]))
  const out: SpecialistFailRow[] = []

  for (const r of records) {
    if (r.specialist_person_id !== specialistId) continue
    if (r.score !== '0') continue
    const proj = projById.get(r.project_id)
    if (!proj) continue
    out.push({
      projectId: proj.id,
      projectName: proj.name,
      category: proj.category,
      pmName: proj.pm_name ?? null,
      role: r.task_role,
    })
  }

  out.sort((a, b) => a.projectName.localeCompare(b.projectName))
  return out
}

export function filterDirectionBarsForSpecialist(params: {
  directionBars: Array<{ direction: TaskRole; label: string; value: number; totalWeight?: number }>
}) {
  // When feeding specialist-only direction bars, caller can attach totalWeight and we hide 0-weight dirs.
  return params.directionBars.filter((d) => (d.totalWeight ?? 1) > 0)
}

export function computeSuccessLabel(score: '1' | 'ж' | '0') {
  return isScoreSuccess(score) ? 'Успіх' : 'Провал'
}

