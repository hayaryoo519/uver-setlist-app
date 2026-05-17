import { describe, it, expect } from 'vitest'
import { normalizeLive, safeDate } from '../normalizers/dataNormalizer'

describe('safeDate', () => {
  it('invalid date does not fall back to today', () => {
    const value = safeDate('invalid-date')
    expect(value).toBe('invalid-date')
  })

  it('empty date stays empty', () => {
    expect(safeDate('')).toBe('')
  })
})

describe('normalizeLive', () => {
  it('missing raw live does not synthesize today', () => {
    const live = normalizeLive(null)
    expect(live.date).toBe('')
  })
})
