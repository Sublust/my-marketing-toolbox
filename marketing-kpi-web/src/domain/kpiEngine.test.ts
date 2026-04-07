import { describe, expect, it } from 'vitest'
import { computeProjectSuccess, isScoreSuccess } from './kpiEngine'

describe('kpiEngine primitives', () => {
  it('treats 1 and ж as success', () => {
    expect(isScoreSuccess('1')).toBe(true)
    expect(isScoreSuccess('ж')).toBe(true)
    expect(isScoreSuccess('0')).toBe(false)
  })

  it('PM project success rule: (G+Y) >= R, except G==0 && Y==R -> fail', () => {
    // typical success
    expect(computeProjectSuccess(1, 0, 0)).toBe(true)
    expect(computeProjectSuccess(0, 2, 1)).toBe(true) // 2 >= 1

    // typical fail
    expect(computeProjectSuccess(0, 0, 1)).toBe(false)
    expect(computeProjectSuccess(0, 1, 2)).toBe(false) // 1 < 2

    // exception: no greens, yellows equal reds
    expect(computeProjectSuccess(0, 1, 1)).toBe(false)
    expect(computeProjectSuccess(0, 2, 2)).toBe(false)
  })
})

