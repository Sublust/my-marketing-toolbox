import type { ProjectCategory, TaskRole, KpiScore } from '../lib/types'

export type EmployeeGrade = 'Junior' | 'Middle' | 'Senior'
export type EmployeeRoleCategory = 'seo' | 'context' | 'target' | 'pm'

export type LoadLevel = 'Low' | 'Medium' | 'High'

export type CategoryWeights = Record<ProjectCategory, number>

export type RoleThreshold = {
  lowMax: number  // points < lowMax => Low
  medMax: number  // points <= medMax => Medium, > medMax => High
}

export type RoleThresholds = Record<EmployeeRoleCategory, RoleThreshold>

export type GradePayoutConfig = {
  baseRate: number
  projectBonus: number
  kpiBudget: number
}

export type GradeGrid = Record<LoadLevel, GradePayoutConfig>
export type GradeGrids = Record<EmployeeGrade, GradeGrid>

export type SalaryEngineConfig = {
  categoryWeights: CategoryWeights
  roleThresholds: RoleThresholds
  gradeGrids: GradeGrids
  discountOption: 'A' | 'B'
  parentProjectMap?: Record<string, string> // Map of projectId/name -> parentProjectId/name
}

export const DEFAULT_CATEGORY_WEIGHTS: CategoryWeights = {
  VIP: 3.0,
  A: 2.0,
  B: 1.0,
  C: 0.5,
}

export const DEFAULT_ROLE_THRESHOLDS: RoleThresholds = {
  seo: { lowMax: 6, medMax: 12 },
  context: { lowMax: 30, medMax: 40 },
  target: { lowMax: 30, medMax: 40 },
  pm: { lowMax: 30, medMax: 40 },
}

export const DEFAULT_GRADE_GRIDS: GradeGrids = {
  Junior: {
    Low: { baseRate: 8, projectBonus: 4, kpiBudget: 5 },
    Medium: { baseRate: 8, projectBonus: 7, kpiBudget: 10 },
    High: { baseRate: 8, projectBonus: 10, kpiBudget: 15 },
  },
  Middle: {
    Low: { baseRate: 15, projectBonus: 5, kpiBudget: 8 },
    Medium: { baseRate: 15, projectBonus: 10, kpiBudget: 15 },
    High: { baseRate: 15, projectBonus: 15, kpiBudget: 22 },
  },
  Senior: {
    Low: { baseRate: 20, projectBonus: 8, kpiBudget: 12 },
    Medium: { baseRate: 20, projectBonus: 16, kpiBudget: 24 },
    High: { baseRate: 20, projectBonus: 24, kpiBudget: 32 },
  },
}

export const DEFAULT_SALARY_CONFIG: SalaryEngineConfig = {
  categoryWeights: DEFAULT_CATEGORY_WEIGHTS,
  roleThresholds: DEFAULT_ROLE_THRESHOLDS,
  gradeGrids: DEFAULT_GRADE_GRIDS,
  discountOption: 'A',
}

export type ProjectAssignmentInput = {
  projectId: string
  projectName: string
  clientGroup?: string // Client name for PM multi-project discount grouping
  category: ProjectCategory
  taskRole: TaskRole
  score: KpiScore | number // score symbol '1' | '0' | 'ж' | '-' OR numeric percentage (0..100)
}

export type EmployeeInput = {
  id: string
  name: string
  roleCategory: EmployeeRoleCategory
  grade: EmployeeGrade
  assignments: ProjectAssignmentInput[]
}

export type ProjectSalaryDetail = {
  projectId: string
  projectName: string
  parentProjectName?: string
  taskRole: TaskRole
  category: ProjectCategory
  baseWeight: number
  effectivePoints: number
  discountApplied: boolean
  scorePercent: number
  payoutPercent: number
  allocatedKpiBudget: number
  earnedKpiBonus: number
}

export type CalculatedEmployeeSalary = {
  id: string
  name: string
  roleCategory: EmployeeRoleCategory
  grade: EmployeeGrade
  totalPoints: number
  loadLevel: LoadLevel
  baseRate: number
  projectBonus: number
  maxKpiBudget: number
  earnedKpiBonus: number
  totalSalary: number
  projectDetails: ProjectSalaryDetail[]
}

export function getPayoutMultiplier(score: KpiScore | number): { scorePercent: number; payoutPercent: number } {
  let scorePercent = 0
  if (typeof score === 'number') {
    scorePercent = score
  } else if (score === '1') {
    scorePercent = 100
  } else if (score === 'ж') {
    scorePercent = 80
  } else {
    scorePercent = 0
  }

  let payoutPercent = 0
  if (scorePercent >= 90) {
    payoutPercent = 1.0
  } else if (scorePercent >= 75) {
    payoutPercent = 0.75
  } else if (scorePercent >= 50) {
    payoutPercent = 0.5
  } else {
    payoutPercent = 0.0
  }

  return { scorePercent, payoutPercent }
}

export function determineLoadLevel(points: number, threshold: RoleThreshold): LoadLevel {
  if (points < threshold.lowMax) return 'Low'
  if (points <= threshold.medMax) return 'Medium'
  return 'High'
}

export function calculateEmployeeSalary(
  employee: EmployeeInput,
  config: SalaryEngineConfig = DEFAULT_SALARY_CONFIG,
): CalculatedEmployeeSalary {
  const { categoryWeights, roleThresholds, gradeGrids, discountOption, parentProjectMap = {} } = config

  let projectDetails: ProjectSalaryDetail[] = []

  if (discountOption === 'A') {
    // Option A: Full points for every assignment / channel
    projectDetails = employee.assignments.map((ast) => {
      const baseWeight = categoryWeights[ast.category] ?? 0
      const { scorePercent, payoutPercent } = getPayoutMultiplier(ast.score)
      const parentName = parentProjectMap[ast.projectId] || parentProjectMap[ast.projectName]

      return {
        projectId: ast.projectId,
        projectName: ast.projectName,
        parentProjectName: parentName,
        taskRole: ast.taskRole,
        category: ast.category,
        baseWeight,
        effectivePoints: baseWeight,
        discountApplied: false,
        scorePercent,
        payoutPercent,
        allocatedKpiBudget: 0,
        earnedKpiBonus: 0,
      }
    })
  } else {
    // Option B: Multichannel / Multi-project discount (50% discount on secondary projects/channels of same parent)
    const grouped: Record<string, ProjectAssignmentInput[]> = {}

    for (const ast of employee.assignments) {
      // Determine group key: explicit parent project mapping -> clientGroup -> projectId/name
      const parentKey =
        parentProjectMap[ast.projectId] ||
        parentProjectMap[ast.projectName] ||
        ast.clientGroup?.trim() ||
        ast.projectId ||
        ast.projectName

      if (!grouped[parentKey]) grouped[parentKey] = []
      grouped[parentKey].push(ast)
    }

    for (const parentKey in grouped) {
      const groupAssignments = grouped[parentKey]
      // Sort assignments: primary project (matching parentKey) or highest base weight first
      const sorted = [...groupAssignments].sort((a, b) => {
        const isAParent = a.projectId === parentKey || a.projectName === parentKey
        const isBParent = b.projectId === parentKey || b.projectName === parentKey
        if (isAParent && !isBParent) return -1
        if (!isAParent && isBParent) return 1
        return (categoryWeights[b.category] ?? 0) - (categoryWeights[a.category] ?? 0)
      })

      sorted.forEach((ast, index) => {
        const baseWeight = categoryWeights[ast.category] ?? 0
        const discountApplied = index > 0
        const effectivePoints = discountApplied ? baseWeight * 0.5 : baseWeight
        const { scorePercent, payoutPercent } = getPayoutMultiplier(ast.score)
        const parentName = parentProjectMap[ast.projectId] || parentProjectMap[ast.projectName] || parentKey

        projectDetails.push({
          projectId: ast.projectId,
          projectName: ast.projectName,
          parentProjectName: parentName !== ast.projectName ? parentName : undefined,
          taskRole: ast.taskRole,
          category: ast.category,
          baseWeight,
          effectivePoints,
          discountApplied,
          scorePercent,
          payoutPercent,
          allocatedKpiBudget: 0,
          earnedKpiBonus: 0,
        })
      })
    }
  }

  // Sum total points
  const totalPoints = projectDetails.reduce((sum, d) => sum + d.effectivePoints, 0)

  // Determine Load Level & Grade payouts
  const threshold = roleThresholds[employee.roleCategory] ?? { lowMax: 30, medMax: 40 }
  const loadLevel = determineLoadLevel(totalPoints, threshold)

  const gradeGrid = gradeGrids[employee.grade] ?? DEFAULT_GRADE_GRIDS[employee.grade]
  const payoutConfig = gradeGrid[loadLevel]

  const { baseRate, projectBonus, kpiBudget: maxKpiBudget } = payoutConfig

  // Allocate KPI Budget per project & calculate earned KPI bonus
  let totalEarnedKpiBonus = 0
  if (totalPoints > 0) {
    projectDetails = projectDetails.map((detail) => {
      const allocatedKpiBudget = maxKpiBudget * (detail.effectivePoints / totalPoints)
      const earnedKpiBonus = allocatedKpiBudget * detail.payoutPercent
      totalEarnedKpiBonus += earnedKpiBonus

      return {
        ...detail,
        allocatedKpiBudget: Math.round(allocatedKpiBudget * 100) / 100,
        earnedKpiBonus: Math.round(earnedKpiBonus * 100) / 100,
      }
    })
  }

  const roundedEarnedKpi = Math.round(totalEarnedKpiBonus * 100) / 100
  const totalSalary = Math.round((baseRate + projectBonus + roundedEarnedKpi) * 100) / 100

  return {
    id: employee.id,
    name: employee.name,
    roleCategory: employee.roleCategory,
    grade: employee.grade,
    totalPoints: Math.round(totalPoints * 100) / 100,
    loadLevel,
    baseRate,
    projectBonus,
    maxKpiBudget,
    earnedKpiBonus: roundedEarnedKpi,
    totalSalary,
    projectDetails,
  }
}
