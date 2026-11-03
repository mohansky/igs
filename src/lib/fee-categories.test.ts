import { describe, expect, it } from 'vitest'
import { DEFAULT_FEE_CATEGORIES, suggestFeeCategoryKey } from './fee-categories'

describe('suggestFeeCategoryKey', () => {
  it('matches the keywords, case-insensitively', () => {
    expect(suggestFeeCategoryKey('Admission Fee 2026')).toBe('admission')
    expect(suggestFeeCategoryKey('TUITION FEE - April 2026')).toBe('tuition')
    expect(suggestFeeCategoryKey('Tution fee')).toBe('tuition')
    expect(suggestFeeCategoryKey('Books & stationery')).toBe('books')
    expect(suggestFeeCategoryKey('Summer uniform')).toBe('uniform')
  })

  it('suggests nothing when no keyword matches', () => {
    expect(suggestFeeCategoryKey('Annual day costume')).toBeNull()
    expect(suggestFeeCategoryKey(null)).toBeNull()
  })
})

describe('DEFAULT_FEE_CATEGORIES', () => {
  it('only books and uniform are pass-through', () => {
    expect(
      DEFAULT_FEE_CATEGORIES.filter((c) => c.isPassThrough).map((c) => c.key),
    ).toEqual(['books', 'uniform'])
  })
})
