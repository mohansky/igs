import { describe, expect, it } from 'vitest'
import { attendanceStatusLabel, leavePolicyFor } from './leave-policy'

describe('leavePolicyFor', () => {
  it('has no allowance before the system started', () => {
    expect(leavePolicyFor(2025)).toBeNull()
  })

  it('2026-27 counts from 1 Oct 2026 with 8 casual / 6 sick', () => {
    expect(leavePolicyFor(2026)).toEqual({
      year: 2026,
      from: '2026-10-01',
      to: '2027-04-30',
      casual: 8,
      sick: 6,
    })
  })

  it('full school years from May 2027 get 12 casual / 6 sick', () => {
    expect(leavePolicyFor(2027)).toEqual({
      year: 2027,
      from: '2027-05-01',
      to: '2028-04-30',
      casual: 12,
      sick: 6,
    })
  })
})

describe('attendanceStatusLabel', () => {
  it('names the leave type', () => {
    expect(attendanceStatusLabel('leave', 'casual')).toBe('Casual leave')
    expect(attendanceStatusLabel('leave', 'sick')).toBe('Sick leave')
  })

  it('flags leave with no type', () => {
    expect(attendanceStatusLabel('leave', null)).toBe('leave (no type)')
  })

  it('leaves other statuses alone', () => {
    expect(attendanceStatusLabel('absent', 'casual')).toBe('absent')
  })
})
