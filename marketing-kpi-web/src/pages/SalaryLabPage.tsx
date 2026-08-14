import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Database,
  DollarSign,
  FileSpreadsheet,
  GitFork,
  Layers,
  RotateCcw,
  Sliders,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { PeriodPicker } from '../components/PeriodPicker'
import type {
  CategoryWeights,
  EmployeeGrade,
  EmployeeInput,
  EmployeeRoleCategory,
  RoleThresholds,
  SalaryEngineConfig,
} from '../domain/salaryEngine'
import {
  calculateEmployeeSalary,
  DEFAULT_CATEGORY_WEIGHTS,
  DEFAULT_GRADE_GRIDS,
  DEFAULT_ROLE_THRESHOLDS,
} from '../domain/salaryEngine'
import { supabase } from '../lib/supabaseClient'
import type { DbKpiRecord, DbPeriod, DbPerson, DbProject, DbUserProfile, ProjectCategory, TaskRole } from '../lib/types'

// Mock reference data from reglament CSVs for realistic testing
const DEMO_EMPLOYEES: EmployeeInput[] = [
  {
    id: 'demo-1',
    name: 'Влад Гула',
    roleCategory: 'seo',
    grade: 'Senior',
    assignments: [
      { projectId: 'dp-1', projectName: 'Проєкт 1 (VIP)', category: 'VIP', taskRole: 'seo', score: 95 },
      { projectId: 'dp-2', projectName: 'Проєкт 2 (VIP)', category: 'VIP', taskRole: 'seo', score: 90 },
      { projectId: 'dp-3', projectName: 'Проєкт 3 (VIP)', category: 'VIP', taskRole: 'seo', score: 85 },
      { projectId: 'dp-4', projectName: 'Проєкт 4 (A)', category: 'A', taskRole: 'seo', score: 92 },
      { projectId: 'dp-5', projectName: 'Проєкт 5 (A)', category: 'A', taskRole: 'seo', score: 88 },
    ],
  },
  {
    id: 'demo-2',
    name: 'Ярослав Кишко',
    roleCategory: 'context',
    grade: 'Senior',
    assignments: [
      { projectId: 'dp-6', projectName: 'Модний доктор', category: 'VIP', taskRole: 'context', score: 95 },
      { projectId: 'dp-7', projectName: 'HealthFit', category: 'A', taskRole: 'context', score: 90 },
      { projectId: 'dp-8', projectName: 'stimma', category: 'A', taskRole: 'context', score: 82 },
      { projectId: 'dp-9', projectName: 'Хендівер', category: 'B', taskRole: 'context', score: 78 },
      { projectId: 'dp-10', projectName: 'DNS', category: 'C', taskRole: 'context', score: 65 },
    ],
  },
  {
    id: 'demo-3',
    name: 'Володимир Пліуто',
    roleCategory: 'pm',
    grade: 'Middle',
    assignments: [
      { projectId: 'dp-7', projectName: 'HealthFit', category: 'A', taskRole: 'seo', score: 90 },
      { projectId: 'dp-12', projectName: 'Соларей', category: 'C', taskRole: 'seo', score: 85 },
      { projectId: 'dp-13', projectName: 'Майнд Ші', category: 'C', taskRole: 'seo', score: 80 },
      { projectId: 'dp-10', projectName: 'DNS', category: 'C', taskRole: 'seo', score: 75 },
      { projectId: 'dp-6', projectName: 'Модний доктор', category: 'VIP', taskRole: 'seo', score: 95 },
    ],
  },
  {
    id: 'demo-4',
    name: 'Максим Дерій',
    roleCategory: 'target',
    grade: 'Middle',
    assignments: [
      { projectId: 'dp-6', projectName: 'Модний доктор (Meta)', category: 'VIP', taskRole: 'target', score: 95 },
      { projectId: 'dp-6-tt', projectName: 'Модний доктор (TikTok)', category: 'VIP', taskRole: 'tiktok', score: 80 },
      { projectId: 'dp-8', projectName: 'stimma (Meta)', category: 'A', taskRole: 'target', score: 60 },
      { projectId: 'dp-8-tt', projectName: 'stimma (TikTok)', category: 'A', taskRole: 'tiktok', score: 45 },
      { projectId: 'dp-9', projectName: 'Хендівер', category: 'B', taskRole: 'target', score: 100 },
    ],
  },
  {
    id: 'demo-5',
    name: 'Ксюша Бородій',
    roleCategory: 'pm',
    grade: 'Middle',
    assignments: [
      { projectId: 'dp-8', projectName: 'stimma', category: 'A', taskRole: 'seo', score: 90 },
      { projectId: 'dp-9', projectName: 'Хендівер', category: 'B', taskRole: 'seo', score: 85 },
      { projectId: 'dp-21', projectName: 'Проєкт Alfa', category: 'B', taskRole: 'seo', score: 70 },
    ],
  },
  {
    id: 'demo-6',
    name: 'Аня Джура',
    roleCategory: 'seo',
    grade: 'Junior',
    assignments: [
      { projectId: 'dp-22', projectName: 'Проєкт C1', category: 'C', taskRole: 'seo', score: 90 },
      { projectId: 'dp-23', projectName: 'Проєкт C2', category: 'C', taskRole: 'seo', score: 85 },
      { projectId: 'dp-24', projectName: 'Проєкт B1', category: 'B', taskRole: 'seo', score: 75 },
    ],
  },
  {
    id: 'demo-7',
    name: 'Оксана Харкава',
    roleCategory: 'context',
    grade: 'Junior',
    assignments: [
      { projectId: 'dp-25', projectName: 'Клієнт X', category: 'B', taskRole: 'context', score: 88 },
      { projectId: 'dp-26', projectName: 'Клієнт Y', category: 'C', taskRole: 'context', score: 92 },
    ],
  },
  {
    id: 'demo-8',
    name: 'Тетяна Мельник',
    roleCategory: 'target',
    grade: 'Junior',
    assignments: [
      { projectId: 'dp-27', projectName: 'Бренд A (Meta)', category: 'B', taskRole: 'target', score: 85 },
      { projectId: 'dp-27-tt', projectName: 'Бренд A (TikTok)', category: 'B', taskRole: 'tiktok', score: 70 },
    ],
  },
]

// Default parent project relationships mapping
const DEFAULT_PARENT_PROJECT_MAP: Record<string, string> = {
  'Соларей': 'HealthFit',
  'Майнд Ші': 'HealthFit',
  'DNS': 'HealthFit',
  'Модний доктор (TikTok)': 'Модний доктор (Meta)',
  'stimma (TikTok)': 'stimma (Meta)',
  'Бренд A (TikTok)': 'Бренд A (Meta)',
}

export function SalaryLabPage() {
  const [period, setPeriod] = useState<DbPeriod | null>(null)
  const [useDemoData, setUseDemoData] = useState<boolean>(false)

  // Real DB state
  const [projects, setProjects] = useState<DbProject[]>([])
  const [people, setPeople] = useState<DbPerson[]>([])
  const [users, setUsers] = useState<DbUserProfile[]>([])
  const [kpiRecords, setKpiRecords] = useState<DbKpiRecord[]>([])
  const [allKpiRecords, setAllKpiRecords] = useState<DbKpiRecord[]>([])

  // Dynamic configuration controls
  const [categoryWeights, setCategoryWeights] = useState<CategoryWeights>(DEFAULT_CATEGORY_WEIGHTS)
  const [roleThresholds, setRoleThresholds] = useState<RoleThresholds>(DEFAULT_ROLE_THRESHOLDS)
  const [parentProjectMap, setParentProjectMap] = useState<Record<string, string>>(DEFAULT_PARENT_PROJECT_MAP)
  const [employeeGrades, setEmployeeGrades] = useState<Record<string, EmployeeGrade>>({})
  const [activeViewOption, setActiveViewOption] = useState<'A' | 'B' | 'compare'>('compare')
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(true)
  const [showParentMappingPanel, setShowParentMappingPanel] = useState<boolean>(false)
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null)

  // Load all projects, people, users, and overall kpi_records on initial mount
  useEffect(() => {
    async function initDbData() {
      try {
        const [projRes, peopleRes, usersRes, allRecsRes] = await Promise.all([
          supabase.from('projects').select('*').order('name'),
          supabase.from('people').select('*').order('full_name'),
          supabase.from('users').select('*'),
          supabase.from('kpi_records').select('*'),
        ])
        if (projRes.data) setProjects(projRes.data)
        if (peopleRes.data) setPeople(peopleRes.data)
        if (usersRes.data) setUsers(usersRes.data as DbUserProfile[])
        if (allRecsRes.data) setAllKpiRecords(allRecsRes.data as DbKpiRecord[])
      } catch (err) {
        console.error('Error initializing database projects/people/users:', err)
      }
    }

    initDbData()
  }, [])

  // Auto-initialize latest period if period is null
  useEffect(() => {
    async function initLatestPeriod() {
      if (period) return
      try {
        const { data: openP } = await supabase
          .from('periods')
          .select('*')
          .eq('is_closed', false)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1)

        const { data: anyP } = !openP?.length
          ? await supabase
              .from('periods')
              .select('*')
              .order('year', { ascending: false })
              .order('month', { ascending: false })
              .limit(1)
          : { data: null }

        const latest = (openP?.[0] ?? anyP?.[0]) as DbPeriod | undefined
        if (latest) setPeriod(latest)
      } catch (err) {
        console.error('Error fetching latest period for Salary Lab:', err)
      }
    }

    initLatestPeriod()
  }, [period])

  // Load database KPI records for selected period
  useEffect(() => {
    async function loadPeriodData() {
      if (!period?.id || useDemoData) return
      try {
        const recRes = await supabase.from('kpi_records').select('*').eq('period_id', period.id)
        if (recRes.data) setKpiRecords(recRes.data as DbKpiRecord[])
      } catch (err) {
        console.error('Error loading KPI records for period:', err)
      }
    }

    loadPeriodData()
  }, [period, useDemoData])

  // Build employee list from DB (STRICTLY ACTIVE WORKING EMPLOYEES) or fallback to Demo Data
  const employees: EmployeeInput[] = useMemo(() => {
    if (useDemoData) {
      return DEMO_EMPLOYEES.map((emp) => ({
        ...emp,
        grade: employeeGrades[emp.id] || emp.grade,
      }))
    }

    if (projects.length === 0 && people.length === 0) {
      return DEMO_EMPLOYEES
    }

    // Filter STRICTLY ACTIVE employees (is_active !== false)
    const activePeople = people.filter((p) => p.is_active !== false)
    const peopleById = Object.fromEntries(activePeople.map((p) => [p.id, p]))
    const usersById = Object.fromEntries(users.map((u) => [u.id, u]))

    // Include ALL projects (active & historical for the period)
    const projectsById = Object.fromEntries(projects.map((pr) => [pr.id, pr]))
    const activeProjects = projects.filter((p) => p.is_active !== false)

    const empMap = new Map<string, EmployeeInput>()

    // Helper for flexible name matching (e.g. 'Аня' vs 'Аня Джура', 'Макс' vs 'Максим Дерій')
    const matchNames = (nameA: string, nameB: string): boolean => {
      const a = nameA.trim().toLowerCase()
      const b = nameB.trim().toLowerCase()
      if (a === b) return true
      const firstA = a.split(' ')[0]
      const firstB = b.split(' ')[0]
      if (firstA && firstB) {
        if (firstA === firstB) return true
        if (a.includes(firstB) || b.includes(firstA)) return true
        if (firstA.slice(0, 3) === firstB.slice(0, 3)) return true
      }
      return false
    }

    // Helper to resolve specialist person from kpi_record via ID or fuzzy name lookup
    const findSpecialistPerson = (rec: DbKpiRecord): DbPerson | null => {
      if (rec.specialist_person_id && peopleById[rec.specialist_person_id]) {
        return peopleById[rec.specialist_person_id]
      }
      if (rec.specialist_id) {
        if (peopleById[rec.specialist_id]) return peopleById[rec.specialist_id]
        const userObj = usersById[rec.specialist_id]
        if (userObj?.full_name) {
          const matched = activePeople.find((p) => matchNames(p.full_name, userObj.full_name))
          if (matched) return matched
        }
      }
      return null
    }

    // Helper to find matching ACTIVE PM person in people list
    const findPmPerson = (proj: DbProject): DbPerson | null => {
      if (proj.pm_person_id && peopleById[proj.pm_person_id]) return peopleById[proj.pm_person_id]
      if (proj.pm_id && peopleById[proj.pm_id]) return peopleById[proj.pm_id]
      if (proj.pm_name) {
        const normPm = proj.pm_name.trim()
        const matched = activePeople.find((p) => matchNames(p.full_name, normPm))
        if (matched) return matched
      }
      return null
    }

    // Helper to calculate PM project KPI score from records in this period
    const getPmProjectKpiScore = (projectId: string): number => {
      const projRecords = kpiRecords.filter((r) => r.project_id === projectId)
      if (projRecords.length === 0) return 100

      let green = 0
      let yellow = 0
      let red = 0
      for (const r of projRecords) {
        if (r.score === '1') green++
        else if (r.score === 'ж') yellow++
        else if (r.score === '0') red++
      }

      if (green + yellow + red === 0) return 100
      if (red > 0 && green === 0 && yellow === 0) return 0
      if (red > green + yellow) return 0
      if (yellow > 0 && green === 0) return 80
      if (green > 0) return 100
      return 50
    }

    // A) Process PM assignments across ALL active projects in database
    for (const proj of activeProjects) {
      const pmPerson = findPmPerson(proj)
      if (!pmPerson) continue

      if (!empMap.has(pmPerson.id)) {
        let defaultGrade: EmployeeGrade = 'Middle'
        if (employeeGrades[pmPerson.id]) defaultGrade = employeeGrades[pmPerson.id]

        empMap.set(pmPerson.id, {
          id: pmPerson.id,
          name: pmPerson.full_name,
          roleCategory: 'pm',
          grade: defaultGrade,
          assignments: [],
        })
      }

      const pmEmp = empMap.get(pmPerson.id)!
      const exists = pmEmp.assignments.some((a) => a.projectId === proj.id)
      if (!exists) {
        const pmKpiScore = getPmProjectKpiScore(proj.id)
        pmEmp.assignments.push({
          projectId: proj.id,
          projectName: proj.name,
          clientGroup: proj.name.split(' ')[0],
          category: proj.category as ProjectCategory,
          taskRole: 'seo',
          score: pmKpiScore,
        })
      }
    }

    // B) Process specialist assignments from period kpiRecords OR fallback to allKpiRecords
    const targetRecords = kpiRecords.length > 0 ? kpiRecords : allKpiRecords

    for (const rec of targetRecords) {
      const person = findSpecialistPerson(rec)
      const proj = projectsById[rec.project_id]
      if (!person || !proj) continue

      if (!empMap.has(person.id)) {
        let roleCategory: EmployeeRoleCategory = 'seo'
        if (rec.task_role === 'target' || rec.task_role === 'tiktok') roleCategory = 'target'
        else if (rec.task_role === 'context') roleCategory = 'context'
        else if (person.person_type === 'pm') roleCategory = 'pm'

        let defaultGrade: EmployeeGrade = 'Middle'
        if (employeeGrades[person.id]) {
          defaultGrade = employeeGrades[person.id]
        } else {
          const normName = person.full_name.toLowerCase()
          if (normName.includes('джура') || normName.includes('харкава') || normName.includes('мельник')) {
            defaultGrade = 'Junior'
          } else if (normName.includes('гула') || normName.includes('кишко')) {
            defaultGrade = 'Senior'
          }
        }

        empMap.set(person.id, {
          id: person.id,
          name: person.full_name,
          roleCategory,
          grade: defaultGrade,
          assignments: [],
        })
      }

      const emp = empMap.get(person.id)!
      const exists = emp.assignments.some((a) => a.projectId === proj.id && a.taskRole === rec.task_role)
      if (!exists) {
        // If Period kpiRecords has this record, use its score; otherwise default score
        const scoreVal = kpiRecords.length > 0 ? rec.score : '1'
        emp.assignments.push({
          projectId: proj.id,
          projectName: proj.name,
          category: proj.category as ProjectCategory,
          taskRole: rec.task_role as TaskRole,
          score: scoreVal,
        })
      }
    }

    // C) Also ensure all active specialists from people table are listed
    for (const person of activePeople) {
      if (person.person_type === 'specialist' && !empMap.has(person.id)) {
        let roleCategory: EmployeeRoleCategory = 'seo'
        if (person.directions?.includes('target') || person.directions?.includes('tiktok')) roleCategory = 'target'
        else if (person.directions?.includes('context')) roleCategory = 'context'

        let defaultGrade: EmployeeGrade = 'Middle'
        if (employeeGrades[person.id]) {
          defaultGrade = employeeGrades[person.id]
        } else {
          const normName = person.full_name.toLowerCase()
          if (normName.includes('джура') || normName.includes('харкава') || normName.includes('мельник')) {
            defaultGrade = 'Junior'
          } else if (normName.includes('гула') || normName.includes('кишко')) {
            defaultGrade = 'Senior'
          }
        }

        empMap.set(person.id, {
          id: person.id,
          name: person.full_name,
          roleCategory,
          grade: defaultGrade,
          assignments: [],
        })
      }
    }

    return Array.from(empMap.values())
  }, [useDemoData, kpiRecords, allKpiRecords, people, projects, users, employeeGrades])

  // Collect ALL unique active projects in database (or demo projects)
  const allUniqueProjects = useMemo(() => {
    if (!useDemoData && projects.length > 0) {
      return projects
        .filter((p) => p.is_active !== false)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: (p.category ?? 'B') as ProjectCategory,
        }))
    }

    const map = new Map<string, { id: string; name: string; category: ProjectCategory }>()
    for (const emp of employees) {
      for (const ast of emp.assignments) {
        const key = ast.projectId || ast.projectName
        if (!map.has(key)) {
          map.set(key, { id: key, name: ast.projectName, category: ast.category })
        }
      }
    }
    return Array.from(map.values())
  }, [useDemoData, projects, employees])

  // Calculate results for Option A & Option B under current config
  const calculatedData = useMemo(() => {
    const configA: SalaryEngineConfig = {
      categoryWeights,
      roleThresholds,
      gradeGrids: DEFAULT_GRADE_GRIDS,
      discountOption: 'A',
      parentProjectMap,
    }

    const configB: SalaryEngineConfig = {
      categoryWeights,
      roleThresholds,
      gradeGrids: DEFAULT_GRADE_GRIDS,
      discountOption: 'B',
      parentProjectMap,
    }

    const resultsA = employees.map((emp) => calculateEmployeeSalary(emp, configA))
    const resultsB = employees.map((emp) => calculateEmployeeSalary(emp, configB))

    const totalSalaryA = Math.round(resultsA.reduce((sum, e) => sum + e.totalSalary, 0) * 100) / 100
    const totalSalaryB = Math.round(resultsB.reduce((sum, e) => sum + e.totalSalary, 0) * 100) / 100

    const diffTotal = Math.round((totalSalaryB - totalSalaryA) * 100) / 100
    const diffPct = totalSalaryA > 0 ? Math.round((diffTotal / totalSalaryA) * 1000) / 10 : 0

    return {
      resultsA,
      resultsB,
      totalSalaryA,
      totalSalaryB,
      diffTotal,
      diffPct,
    }
  }, [employees, categoryWeights, roleThresholds, parentProjectMap])

  const resetConfig = () => {
    setCategoryWeights(DEFAULT_CATEGORY_WEIGHTS)
    setRoleThresholds(DEFAULT_ROLE_THRESHOLDS)
    setParentProjectMap(DEFAULT_PARENT_PROJECT_MAP)
    setEmployeeGrades({})
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-indigo-950/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-bold text-white">
                Admin Exclusive
              </span>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                Експериментальна Лабораторія ЗП (Salary Lab)
              </h1>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Моделювання та випробування нових регламентів нарахування заробітної плати для діючих працівників з можливості ручного коригування грейдів, коефіцієнтів та меж навантаження.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PeriodPicker value={period} onChange={setPeriod} />

            <button
              onClick={() => setUseDemoData(!useDemoData)}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-colors ${
                useDemoData
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
              }`}
              title="Перемкнути між даними регламенту та реальними проєктами з бази"
            >
              {useDemoData ? <FileSpreadsheet className="h-4 w-4" /> : <Database className="h-4 w-4" />}
              {useDemoData ? 'Тестовий регламент' : `Реальні дані БД (${employees.length} працюючих)`}
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Configuration Panel */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div
          className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800 cursor-pointer"
          onClick={() => setShowConfigPanel(!showConfigPanel)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Параметри симуляції та коефіцієнти
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Зміна вагових коефіцієнтів проєктів та меж навантаження по ролях
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                resetConfig()
              }}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Скинути
            </button>
            {showConfigPanel ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
          </div>
        </div>

        {showConfigPanel && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Weights Editor */}
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/40 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Коефіцієнти категорій проєктів (Бали)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['VIP', 'A', 'B', 'C'] as ProjectCategory[]).map((cat) => (
                    <div key={cat} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Категорія {cat}</span>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={categoryWeights[cat]}
                        onChange={(e) =>
                          setCategoryWeights({
                            ...categoryWeights,
                            [cat]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-16 rounded border border-gray-300 px-2 py-1 text-right text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Load Thresholds Editor */}
              <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/40 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-emerald-500" />
                  Межі навантаження за ролями (Low | Med | High)
                </h3>
                <div className="space-y-2">
                  {(
                    [
                      { role: 'pm', label: 'ПМ (Project Manager)' },
                      { role: 'seo', label: 'SEO-спеціалісти' },
                      { role: 'target', label: 'Таргетологи' },
                      { role: 'context', label: 'Google Ads' },
                    ] as const
                  ).map(({ role, label }) => (
                    <div key={role} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-gray-900">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span>Low &lt;</span>
                        <input
                          type="number"
                          value={roleThresholds[role].lowMax}
                          onChange={(e) =>
                            setRoleThresholds({
                              ...roleThresholds,
                              [role]: { ...roleThresholds[role], lowMax: parseInt(e.target.value) || 0 },
                            })
                          }
                          className="w-12 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        />
                        <span>| Med ≤</span>
                        <input
                          type="number"
                          value={roleThresholds[role].medMax}
                          onChange={(e) =>
                            setRoleThresholds({
                              ...roleThresholds,
                              [role]: { ...roleThresholds[role], medMax: parseInt(e.target.value) || 0 },
                            })
                          }
                          className="w-12 rounded border border-gray-300 px-1.5 py-0.5 text-center text-xs font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Formula Variant Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Режим перегляду:</span>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-950">
                  <button
                    onClick={() => setActiveViewOption('A')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      activeViewOption === 'A'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Варіант А (Поканальний)
                  </button>
                  <button
                    onClick={() => setActiveViewOption('B')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      activeViewOption === 'B'
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-50'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Варіант B (Дисконт 50%)
                  </button>
                  <button
                    onClick={() => setActiveViewOption('compare')}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                      activeViewOption === 'compare'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    Порівняльний режим (A vs B)
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowParentMappingPanel(!showParentMappingPanel)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300 transition-colors"
              >
                <GitFork className="h-4 w-4" />
                {showParentMappingPanel ? 'Сховати зв\'язки проєктів' : `Налаштувати материнські проєкти (${allUniqueProjects.length})`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Parent Project Relationships Panel */}
      {showParentMappingPanel && (
        <div className="rounded-xl border border-purple-200 bg-white p-6 shadow-sm dark:border-purple-900/40 dark:bg-gray-900 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <GitFork className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Зв'язки проєктів та материнські проєкти (Всього {allUniqueProjects.length} проєктів)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Вкажіть материнський/головний проєкт або клієнтську групу для кожного напрямку чи додаткового проєкту одного клієнта.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Проєкт / Напрямок</th>
                  <th className="px-3 py-2.5">Категорія</th>
                  <th className="px-4 py-2.5">Материнський / Головний проєкт</th>
                  <th className="px-4 py-2.5 text-center">Статус у Варіанті B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {allUniqueProjects.map((p) => {
                  const parentVal = parentProjectMap[p.id] || parentProjectMap[p.name] || ''

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                        {p.name}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={parentVal}
                          onChange={(e) => {
                            const newParent = e.target.value
                            setParentProjectMap((prev) => {
                              const updated = { ...prev }
                              if (!newParent) {
                                delete updated[p.id]
                                delete updated[p.name]
                              } else {
                                updated[p.id] = newParent
                                updated[p.name] = newParent
                              }
                              return updated
                            })
                          }}
                          className="w-full max-w-xs rounded border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                        >
                          <option value="">— Головний проєкт (Самостійний, 100% балів) —</option>
                          {allUniqueProjects
                            .filter((item) => item.name !== p.name && item.id !== p.id)
                            .map((item) => (
                              <option key={item.id} value={item.name}>
                                {item.name} ({item.category})
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {parentVal ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            Дочірній (-50% дисконт)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Головний (100% балів)
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Salary Budget Option A */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ФОП (Варіант А)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {calculatedData.totalSalaryA} <span className="text-xs font-normal text-gray-500">тис. грн</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Поканальний підрахунок балів</p>
        </div>

        {/* Card 2: Total Salary Budget Option B */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ФОП (Варіант B)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {calculatedData.totalSalaryB} <span className="text-xs font-normal text-gray-500">тис. грн</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">З дисконтом 50% на материнські/дочірні проєкти</p>
        </div>

        {/* Card 3: Difference A vs B */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Різниця ФОП (B - A)</span>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              calculatedData.diffTotal < 0
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {calculatedData.diffTotal < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
            </div>
          </div>
          <div className={`mt-2 text-2xl font-bold ${
            calculatedData.diffTotal < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-50'
          }`}>
            {calculatedData.diffTotal > 0 ? `+${calculatedData.diffTotal}` : calculatedData.diffTotal}{' '}
            <span className="text-xs font-normal text-gray-500">({calculatedData.diffPct}%)</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Економія / Приріст за Варіантом B</p>
        </div>

        {/* Card 4: Total Employees */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Всього працюючих</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-50">
            {employees.length} <span className="text-xs font-normal text-gray-500">осіб</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Активні співробітники</p>
        </div>
      </div>

      {/* Main Employee Salary Breakdown Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Детальний розрахунок по працюючих працівниках ({employees.length} осіб)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Оберіть Грейд працівника (Junior/Middle/Senior) або натисніть на рядок, щоб розгорнути деталізацію
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[760px]">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left w-48">Співробітник</th>
                <th className="px-3 py-3 text-left w-44">Грейд / Роль</th>
                <th className="px-3 py-3 text-center w-32">Бали навантаження</th>
                <th className="px-3 py-3 text-center w-24">Рівень</th>
                <th className="px-3 py-3 text-right w-20">Ставка</th>
                <th className="px-3 py-3 text-right w-24">Проєктна ч.</th>
                <th className="px-3 py-3 text-right w-24">KPI Бонус</th>
                <th className="px-4 py-3 text-right w-28 font-bold">Разом ЗП</th>
                {activeViewOption === 'compare' && <th className="px-4 py-3 text-right w-32">Різниця (B - A)</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {calculatedData.resultsA.map((empA, idx) => {
                const empB = calculatedData.resultsB[idx]
                const isExpanded = expandedEmployeeId === empA.id
                const activeEmp = activeViewOption === 'B' ? empB : empA
                const diffVal = Math.round((empB.totalSalary - empA.totalSalary) * 100) / 100

                return (
                  <Fragment key={empA.id}>
                    <tr
                      onClick={() => setExpandedEmployeeId(isExpanded ? null : empA.id)}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2 truncate">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        )}
                        <span className="truncate">{empA.name}</span>
                      </td>

                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={empA.grade}
                            onChange={(e) => {
                              const newGrade = e.target.value as EmployeeGrade
                              setEmployeeGrades((prev) => ({
                                ...prev,
                                [empA.id]: newGrade,
                              }))
                            }}
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-bold shadow-sm transition-colors cursor-pointer dark:bg-gray-900 ${
                              empA.grade === 'Senior'
                                ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:text-purple-300'
                                : empA.grade === 'Middle'
                                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:text-blue-300'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300'
                            }`}
                          >
                            <option value="Junior">Junior</option>
                            <option value="Middle">Middle</option>
                            <option value="Senior">Senior</option>
                          </select>
                          <span className="text-[11px] text-gray-500 uppercase">{empA.roleCategory}</span>
                        </div>
                      </td>

                      <td className="px-3 py-3.5 text-center font-mono font-semibold">
                        {activeViewOption === 'compare' ? (
                          <span className="flex items-center justify-center gap-1">
                            <span>{empA.totalPoints}</span>
                            <span className="text-gray-400">→</span>
                            <span className={empB.totalPoints < empA.totalPoints ? 'text-purple-600 font-bold' : ''}>
                              {empB.totalPoints}
                            </span>
                          </span>
                        ) : (
                          activeEmp.totalPoints
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-center">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          activeEmp.loadLevel === 'High'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : activeEmp.loadLevel === 'Medium'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {activeEmp.loadLevel}
                        </span>
                      </td>

                      <td className="px-3 py-3.5 text-right font-mono">{activeEmp.baseRate}</td>
                      <td className="px-3 py-3.5 text-right font-mono">{activeEmp.projectBonus}</td>
                      <td className="px-3 py-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {activeEmp.earnedKpiBonus}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900 dark:text-gray-50 text-sm">
                        {activeViewOption === 'compare' ? (
                          <span>{empB.totalSalary} <span className="text-xs text-gray-400 font-normal">(vs {empA.totalSalary})</span></span>
                        ) : (
                          activeEmp.totalSalary
                        )}
                      </td>

                      {activeViewOption === 'compare' && (
                        <td className={`px-4 py-3.5 text-right font-mono font-bold ${
                          diffVal < 0
                            ? 'text-purple-600 dark:text-purple-400'
                            : diffVal > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-400'
                        }`}>
                          {diffVal > 0 ? `+${diffVal}` : diffVal}
                        </td>
                      )}
                    </tr>

                    {/* Expandable Project Breakdown Details */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={activeViewOption === 'compare' ? 9 : 8} className="bg-gray-50/80 p-4 dark:bg-gray-950/60">
                          <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-inner dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                              <span>Закріплені проєкти та розрахований KPI бонус ({activeEmp.name}) — всього {activeEmp.projectDetails.length} проєктів</span>
                              <span className="text-gray-400">Максимальний KPI бюджет: {activeEmp.maxKpiBudget} грн</span>
                            </div>

                            <table className="w-full text-left text-[11px]">
                              <thead className="border-b border-gray-200 text-gray-500 dark:border-gray-800 font-semibold">
                                <tr>
                                  <th className="py-2">Проєкт</th>
                                  <th className="py-2">Материнський проєкти</th>
                                  <th className="py-2">Категорія</th>
                                  <th className="py-2 text-center">Базова вага</th>
                                  <th className="py-2 text-center">Дисконт 50%</th>
                                  <th className="py-2 text-center">Ефективні бали</th>
                                  <th className="py-2 text-center">Виконання KPI</th>
                                  <th className="py-2 text-right">Виділений KPI бюджет</th>
                                  <th className="py-2 text-right font-bold">Нарахований KPI бонус</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                                {activeEmp.projectDetails.map((det, dIdx) => (
                                  <tr key={dIdx}>
                                    <td className="py-2 font-medium text-gray-900 dark:text-gray-100">
                                      {det.projectName}
                                      {det.taskRole && <span className="ml-2 text-[10px] text-gray-400">({det.taskRole})</span>}
                                    </td>
                                    <td className="py-2 text-gray-500 dark:text-gray-400">
                                      {det.parentProjectName ? (
                                        <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                                          <GitFork className="h-3 w-3" />
                                          {det.parentProjectName}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">— (Головний)</span>
                                      )}
                                    </td>
                                    <td className="py-2">
                                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                        {det.category}
                                      </span>
                                    </td>
                                    <td className="py-2 text-center font-mono">{det.baseWeight}</td>
                                    <td className="py-2 text-center">
                                      {det.discountApplied ? (
                                        <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                          Так (-50%)
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="py-2 text-center font-mono font-bold">{det.effectivePoints}</td>
                                    <td className="py-2 text-center font-mono">
                                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        det.payoutPercent === 1
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                          : det.payoutPercent > 0
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                      }`}>
                                        {det.scorePercent}% ({det.payoutPercent * 100}% виплати)
                                      </span>
                                    </td>
                                    <td className="py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                                      {det.allocatedKpiBudget}
                                    </td>
                                    <td className="py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      {det.earnedKpiBonus}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
