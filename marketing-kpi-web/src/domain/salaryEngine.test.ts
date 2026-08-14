import { describe, expect, it } from 'vitest'
import type { EmployeeInput } from './salaryEngine'
import {
  calculateEmployeeSalary,
  DEFAULT_SALARY_CONFIG,
  getPayoutMultiplier,
} from './salaryEngine'

describe('salaryEngine', () => {
  it('correctly calculates payout multiplier for KPI scores', () => {
    expect(getPayoutMultiplier('1')).toEqual({ scorePercent: 100, payoutPercent: 1.0 })
    expect(getPayoutMultiplier('ж')).toEqual({ scorePercent: 80, payoutPercent: 0.75 })
    expect(getPayoutMultiplier('0')).toEqual({ scorePercent: 0, payoutPercent: 0.0 })
    expect(getPayoutMultiplier('-')).toEqual({ scorePercent: 0, payoutPercent: 0.0 })
    expect(getPayoutMultiplier(95)).toEqual({ scorePercent: 95, payoutPercent: 1.0 })
    expect(getPayoutMultiplier(81)).toEqual({ scorePercent: 81, payoutPercent: 0.75 })
    expect(getPayoutMultiplier(60)).toEqual({ scorePercent: 60, payoutPercent: 0.5 })
    expect(getPayoutMultiplier(45)).toEqual({ scorePercent: 45, payoutPercent: 0.0 })
  })

  it('calculates salary under Option A (channel-by-channel full points)', () => {
    const employee: EmployeeInput = {
      id: 'emp-1',
      name: 'Максим Дерій',
      roleCategory: 'target',
      grade: 'Middle',
      assignments: [
        { projectId: 'p1', projectName: 'Модний доктор', category: 'VIP', taskRole: 'target', score: 95 },
        { projectId: 'p1', projectName: 'Модний доктор', category: 'VIP', taskRole: 'tiktok', score: 80 },
        { projectId: 'p2', projectName: 'stimma', category: 'A', taskRole: 'target', score: 60 },
        { projectId: 'p2', projectName: 'stimma', category: 'A', taskRole: 'tiktok', score: 45 },
        { projectId: 'p3', projectName: 'Хендівер', category: 'B', taskRole: 'target', score: 100 },
      ],
    }

    const result = calculateEmployeeSalary(employee, {
      ...DEFAULT_SALARY_CONFIG,
      discountOption: 'A',
    })

    expect(result.totalPoints).toBe(11.0)
    expect(result.loadLevel).toBe('Low')
    expect(result.baseRate).toBe(15)
    expect(result.projectBonus).toBe(5)
    expect(result.maxKpiBudget).toBe(8)
    expect(result.projectDetails).toHaveLength(5)
  })

  it('calculates salary under Option B (multichannel discount 50%)', () => {
    const employee: EmployeeInput = {
      id: 'emp-1',
      name: 'Максим Дерій',
      roleCategory: 'target',
      grade: 'Middle',
      assignments: [
        { projectId: 'p1', projectName: 'Модний доктор', category: 'VIP', taskRole: 'target', score: 95 },
        { projectId: 'p1', projectName: 'Модний доктор', category: 'VIP', taskRole: 'tiktok', score: 80 },
        { projectId: 'p2', projectName: 'stimma', category: 'A', taskRole: 'target', score: 60 },
        { projectId: 'p2', projectName: 'stimma', category: 'A', taskRole: 'tiktok', score: 45 },
        { projectId: 'p3', projectName: 'Хендівер', category: 'B', taskRole: 'target', score: 100 },
      ],
    }

    const result = calculateEmployeeSalary(employee, {
      ...DEFAULT_SALARY_CONFIG,
      discountOption: 'B',
    })

    expect(result.totalPoints).toBe(8.5)
    expect(result.loadLevel).toBe('Low')
    expect(result.projectDetails.filter((d) => d.discountApplied)).toHaveLength(2)
  })
})
