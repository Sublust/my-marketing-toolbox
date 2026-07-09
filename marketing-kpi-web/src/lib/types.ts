export type ProjectCategory = 'VIP' | 'A' | 'B' | 'C'
export type TaskRole = 'seo' | 'context' | 'target' | 'tiktok'
export type KpiScore = '1' | '0' | 'ж' | '-'

export type DbUserProfile = {
  id: string
  full_name: string
  role: 'admin' | 'pm' | 'specialist'
}

export type DbPerson = {
  id: string
  full_name: string
  person_type: 'specialist' | 'pm' | 'admin' | 'other'
  is_active: boolean
  directions: TaskRole[]
}

export type DbProject = {
  id: string
  name: string
  category: ProjectCategory
  pm_id: string | null
  pm_name?: string | null
  pm_person_id?: string | null
  is_active: boolean
}

export type DbPeriod = {
  id: string
  year: number
  month: number
  is_closed: boolean
}

export type DbCategoryWeight = {
  category: ProjectCategory
  weight: number
}

export type SnapshotScope = 'department' | 'specialist' | 'pm'
export type SnapshotDirection = 'all' | TaskRole

export type DbKpiSnapshot = {
  id: string
  period_id: string
  scope: SnapshotScope
  direction: SnapshotDirection
  subject_kind: 'department' | 'person' | 'user' | 'name'
  subject_id: string | null
  subject_name: string
  percentage: number
  success_weight: number
  total_weight: number
  computed_by: string
  computed_at: string
}

export type DbKpiRecord = {
  id: string
  period_id: string
  project_id: string
  specialist_id: string | null
  specialist_person_id?: string | null
  task_role: TaskRole
  score: KpiScore
  comment: string | null
  created_by: string
  updated_at: string
}

