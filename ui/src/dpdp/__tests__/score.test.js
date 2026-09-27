import { describe, test, expect } from 'vitest'
import { computeReadiness, readinessKind, countBySeverity } from '../score.js'

describe('computeReadiness', () => {
  test('returns 0 with nothing assessed when the list is empty', () => {
    const r = computeReadiness([])
    expect(r.score).toBe(0)
    expect(r.assessed).toBe(0)
    expect(r.total).toBe(0)
  })

  test('weights pass as full, warn as half, fail as none', () => {
    const r = computeReadiness([
      { id: 'a', status: 'pass', weight: 2 },
      { id: 'b', status: 'warn', weight: 2 },
      { id: 'c', status: 'fail', weight: 2 },
    ])
    // (2 + 1 + 0) / 6 = 0.5
    expect(r.score).toBe(50)
    expect(r.assessed).toBe(3)
  })

  test('excludes not-assessed controls from the denominator', () => {
    const r = computeReadiness([
      { id: 'a', status: 'pass' },
      { id: 'b', status: 'na' },
    ])
    expect(r.score).toBe(100)
    expect(r.assessed).toBe(1)
    expect(r.total).toBe(2)
  })

  test('defaults a missing or invalid weight to 1', () => {
    const r = computeReadiness([
      { id: 'a', status: 'pass' },
      { id: 'b', status: 'fail', weight: -3 },
    ])
    expect(r.score).toBe(50)
  })

  test('breaks the score down by category', () => {
    const r = computeReadiness([
      { id: 'a', status: 'pass', category: 'Rights' },
      { id: 'b', status: 'fail', category: 'Rights' },
      { id: 'c', status: 'pass', category: 'Breach' },
    ])
    expect(r.byCategory.Rights.score).toBe(50)
    expect(r.byCategory.Breach.score).toBe(100)
    expect(r.byCategory.Rights.total).toBe(2)
  })

  test('lists failing controls as critical gaps, heaviest first', () => {
    const r = computeReadiness([
      { id: 'light', status: 'fail', weight: 1 },
      { id: 'heavy', status: 'fail', weight: 3 },
      { id: 'ok',    status: 'pass', weight: 3 },
    ])
    expect(r.criticalGaps.map(c => c.id)).toEqual(['heavy', 'light'])
  })

  test('accepts a custom credit table', () => {
    const r = computeReadiness(
      [{ id: 'a', status: 'warn' }],
      { credit: { warn: 0.25 } },
    )
    expect(r.score).toBe(25)
  })

  test('does not mutate the input controls', () => {
    const input = [{ id: 'a', status: 'fail', weight: 1 }, { id: 'b', status: 'fail', weight: 2 }]
    const snapshot = JSON.stringify(input)
    computeReadiness(input)
    expect(JSON.stringify(input)).toBe(snapshot)
  })
})

describe('readinessKind', () => {
  test('bands 80 and above as pass', () => expect(readinessKind(80)).toBe('pass'))
  test('bands 55 to 79 as warning', () => expect(readinessKind(61)).toBe('warn'))
  test('bands below 55 as fail', () => expect(readinessKind(30)).toBe('fail'))
})

describe('countBySeverity', () => {
  test('counts open findings only, in fixed severity order', () => {
    const out = countBySeverity([
      { severity: 'Critical', status: 'open' },
      { severity: 'Critical', status: 'resolved' },
      { severity: 'Low',      status: 'in_progress' },
    ])
    expect(out).toEqual({ Critical: 1, High: 0, Medium: 0, Low: 1 })
  })
})
