export type ProjectCategory = 'VIP' | 'A' | 'B' | 'C'
export type TaskRole = 'seo' | 'context' | 'target' | 'tiktok'
export type KpiScore = '1' | '0' | 'ж' | '-'

export type ProjectRoleInput = {
  specialist: string
  result: KpiScore
}

export type ProjectInput = {
  name: string
  category: ProjectCategory
  pm: string
  roles: Record<TaskRole, ProjectRoleInput>
}

export type Weights = Record<ProjectCategory, number>

export type PersonDetailRow = {
  projectName: string
  roleName: string
  category: ProjectCategory
  weight: number
  result: Exclude<KpiScore, '-'>
  isSuccess: boolean
  contribution: number
}

export type PeopleStats = Record<
  string,
  {
    percentage: number
    success: number
    total: number
    details: PersonDetailRow[]
  }
>

export type ProjectAnalysisRow = {
  isSuccessful: boolean
  pm: string
  weight: number
  green: number
  yellow: number
  red: number
}

export type KpiResults = {
  specialists: PeopleStats
  pms: PeopleStats
  leader: { percentage: number; success: number; total: number }
  projectAnalysis: Record<string, ProjectAnalysisRow>
}

function round1(x: number) {
  return Math.round(x * 10) / 10
}

function calcPct(success: number, total: number) {
  return total === 0 ? 0 : round1((success / total) * 100)
}

export function isScoreSuccess(score: Exclude<KpiScore, '-'>) {
  return score === '1' || score === 'ж'
}

export function computeProjectSuccess(green: number, yellow: number, red: number) {
  if (green + yellow + red === 0) return null

  let isProjectSuccess = false
  if (green + yellow >= red) {
    if (green === 0 && yellow === red) isProjectSuccess = false
    else isProjectSuccess = true
  }

  return isProjectSuccess
}

export function calculateKpi(params: {
  projects: ProjectInput[]
  weights: Weights
  specialists: string[]
  pms: string[]
  roles: TaskRole[]
}) {
  const { projects, weights, specialists, pms, roles } = params

  const specialistStats: Record<
    string,
    { successfulWeight: number; totalWeight: number; details: PersonDetailRow[] }
  > = Object.fromEntries(
    specialists.map((s) => [s, { successfulWeight: 0, totalWeight: 0, details: [] }]),
  )

  const pmStats: Record<
    string,
    { successfulWeight: number; totalWeight: number; details: PersonDetailRow[] }
  > = Object.fromEntries(
    pms.map((p) => [p, { successfulWeight: 0, totalWeight: 0, details: [] }]),
  )

  const leaderStats = { successfulWeight: 0, totalWeight: 0 }
  const projectAnalysis: Record<string, ProjectAnalysisRow> = {}

  for (const project of projects) {
    if (!project?.roles) continue

    const weight = weights[project.category] ?? 0
    if (weight === 0) continue

    let greenCount = 0
    let yellowCount = 0
    let redCount = 0

    // Specialists
    for (const role of roles) {
      const task = project.roles[role]
      if (!task) continue
      const spec = task.specialist
      const res = task.result

      if (!spec || !specialistStats[spec]) continue
      if (res !== '1' && res !== 'ж' && res !== '0') continue

      const success = isScoreSuccess(res)
      if (success) specialistStats[spec].successfulWeight += weight
      specialistStats[spec].totalWeight += weight

      specialistStats[spec].details.push({
        projectName: project.name,
        roleName:
          spec === 'Таня' || spec === 'Макс'
            ? role === 'target'
              ? 'Target'
              : role === 'tiktok'
                ? 'TikTok'
                : ''
            : '',
        category: project.category,
        weight,
        result: res,
        isSuccess: success,
        contribution: success ? weight : 0,
      })
    }

    // PM / Leader: count G/Y/R across roles
    for (const role of roles) {
      const r = project.roles[role]?.result
      if (r === '1') greenCount++
      else if (r === 'ж') yellowCount++
      else if (r === '0') redCount++
    }

    if (greenCount + yellowCount + redCount === 0) continue

    const isProjectSuccess = computeProjectSuccess(greenCount, yellowCount, redCount)
    if (isProjectSuccess === null) continue

    const pm = project.pm
    if (pm && pmStats[pm]) {
      if (isProjectSuccess) pmStats[pm].successfulWeight += weight
      pmStats[pm].totalWeight += weight
      pmStats[pm].details.push({
        projectName: project.name,
        roleName: '',
        category: project.category,
        weight,
        result: isProjectSuccess ? '1' : '0',
        isSuccess: isProjectSuccess,
        contribution: isProjectSuccess ? weight : 0,
      })
    }

    if (isProjectSuccess) leaderStats.successfulWeight += weight
    leaderStats.totalWeight += weight

    projectAnalysis[project.name] = {
      isSuccessful: isProjectSuccess,
      pm,
      weight,
      green: greenCount,
      yellow: yellowCount,
      red: redCount,
    }
  }

  const results: KpiResults = {
    specialists: {},
    pms: {},
    leader: {
      percentage: calcPct(leaderStats.successfulWeight, leaderStats.totalWeight),
      success: leaderStats.successfulWeight,
      total: leaderStats.totalWeight,
    },
    projectAnalysis,
  }

  for (const name of Object.keys(specialistStats)) {
    const st = specialistStats[name]
    results.specialists[name] = {
      percentage: calcPct(st.successfulWeight, st.totalWeight),
      success: st.successfulWeight,
      total: st.totalWeight,
      details: st.details,
    }
  }

  for (const name of Object.keys(pmStats)) {
    const st = pmStats[name]
    results.pms[name] = {
      percentage: calcPct(st.successfulWeight, st.totalWeight),
      success: st.successfulWeight,
      total: st.totalWeight,
      details: st.details,
    }
  }

  return results
}

