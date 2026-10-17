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
  it('公開APIの空タグと確認済み追加情報を保持する', () => {
    const metadata = { country: { code: 'KR', status: 'confirmed' }, members: { ids: ['takuya'], status: 'confirmed' } }
    const live = normalizeLive({ id: 1, date: '2020-12-21', title: '男祭り', tags: [], metadata })
    expect(live.tags).toEqual([])
    expect(live.metadata).toEqual(metadata)
  })

  it('missing raw live does not synthesize today', () => {
    const live = normalizeLive(null)
    expect(live.date).toBe('')
  })
})
