import { describe, expect, it } from 'vitest'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  categoryFilterNames,
  isValidCategory,
  needsDescription,
} from './transaction-categories'

describe('transaction categories', () => {
  it('drops Salaries, Supplies and Insurance from expenses', () => {
    for (const gone of ['Salaries', 'Supplies', 'Insurance']) {
      expect(isValidCategory('expense', gone)).toBe(false)
    }
  })

  it('validates against the list for the given type', () => {
    expect(isValidCategory('expense', 'Teaching Materials')).toBe(true)
    expect(isValidCategory('income', 'Teaching Materials')).toBe(false)
    expect(isValidCategory('income', 'Sale of Books & Uniforms')).toBe(true)
    expect(isValidCategory('expense', 'Sale of Books & Uniforms')).toBe(false)
    // Shared names are valid for both.
    expect(isValidCategory('expense', 'Events')).toBe(true)
    expect(isValidCategory('income', 'Events')).toBe(true)
  })

  it('has no duplicates and ends with Other', () => {
    for (const list of [EXPENSE_CATEGORIES, INCOME_CATEGORIES]) {
      expect(new Set(list).size).toBe(list.length)
      expect(list[list.length - 1]).toBe('Other')
    }
  })

  it('requires a description only for Other', () => {
    expect(needsDescription('Other')).toBe(true)
    expect(needsDescription('Maintenance')).toBe(false)
  })

  it('keeps legacy names from the data filterable', () => {
    const { current, legacy } = categoryFilterNames([
      'Supplies',
      'Maintenance',
      'Salaries',
      'Supplies',
      '',
    ])
    expect(legacy).toEqual(['Salaries', 'Supplies'])
    expect(current).toContain('Maintenance')
    expect(current.filter((c) => c === 'Events')).toHaveLength(1)
  })
})
