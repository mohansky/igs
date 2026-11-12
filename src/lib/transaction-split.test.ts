import { describe, expect, it } from 'vitest'
import { isWholePaise, splitAddsUp, splitRemainder } from './transaction-split'

describe('transaction split math', () => {
  it('accepts lines that add up exactly, despite floating point', () => {
    expect(splitAddsUp(0.3, [0.1, 0.2])).toBe(true)
    expect(splitAddsUp(295, [210, 85])).toBe(true)
    expect(splitAddsUp(97942.02, [50000.01, 47942.01])).toBe(true)
  })

  it('rejects lines that are short, over, or too few', () => {
    expect(splitAddsUp(295, [200, 85])).toBe(false)
    expect(splitAddsUp(295, [210, 86])).toBe(false)
    expect(splitAddsUp(295, [295])).toBe(false)
  })

  it('rejects zero, negative or sub-paisa lines', () => {
    expect(splitAddsUp(100, [100, 0])).toBe(false)
    expect(splitAddsUp(100, [150, -50])).toBe(false)
    expect(splitAddsUp(100, [50.005, 49.995])).toBe(false)
    expect(isWholePaise(12.34)).toBe(true)
    expect(isWholePaise(12.345)).toBe(false)
  })

  it('reports what is left to allocate', () => {
    expect(splitRemainder(759, [300, 200])).toBe(259)
    expect(splitRemainder(759, [800])).toBe(-41)
    expect(splitRemainder(0.3, [0.1, 0.2])).toBe(0)
  })
})
