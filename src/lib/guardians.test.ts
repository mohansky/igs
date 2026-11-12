import { describe, expect, it } from 'vitest'
import { genderShort, resolveParents } from './guardians'
import type { GuardianSlot } from './guardians'

const slot = (
  name: string | null,
  relation: string | null,
  phone: string | null = null,
  email: string | null = null,
): GuardianSlot => ({ name, relation, phone, email })
const empty = slot(null, null)

describe('resolveParents', () => {
  it('matches by relation regardless of slot order', () => {
    const r = resolveParents([
      slot('Asha', 'Mother', '111'),
      slot('Ravi', 'Father', '222'),
      empty,
    ])
    expect(r.mother).toEqual({ name: 'Asha', phone: '111' })
    expect(r.father).toEqual({ name: 'Ravi', phone: '222' })
  })

  it('does not treat a grandparent as a parent', () => {
    const r = resolveParents([
      slot('Ravi', 'Father'),
      slot('Asha', 'Mother'),
      slot('Gopal', 'GrandFather'),
    ])
    expect(r.father?.name).toBe('Ravi')

    const onlyGrand = resolveParents([
      slot('Gopal', 'Grandfather'),
      empty,
      empty,
    ])
    expect(onlyGrand.father).toBeNull()
  })

  it('falls back to form order when the relation is blank or an occupation', () => {
    const r = resolveParents([
      slot('Ravi', null),
      slot('Asha', 'Home Maker', '333'),
      empty,
    ])
    expect(r.father?.name).toBe('Ravi')
    expect(r.mother).toEqual({ name: 'Asha', phone: '333' })
  })

  it('does not fall back onto a slot naming another relative or parent', () => {
    const r = resolveParents([
      slot('Lakshmi', 'Guardian'),
      slot('Ravi', 'Father'),
      empty,
    ])
    expect(r.father?.name).toBe('Ravi')
    expect(r.mother).toBeNull()
  })

  it('skips empty slots', () => {
    const r = resolveParents([empty, empty, empty])
    expect(r).toEqual({ father: null, mother: null, email: null })
  })

  it("prefers the father's email, then the mother's, then anyone's", () => {
    expect(
      resolveParents([
        slot('Ravi', 'Father', null, 'f@x.in'),
        slot('Asha', 'Mother', null, 'm@x.in'),
        empty,
      ]).email,
    ).toBe('f@x.in')
    expect(
      resolveParents([
        slot('Ravi', 'Father'),
        slot('Asha', 'Mother', null, 'm@x.in'),
        empty,
      ]).email,
    ).toBe('m@x.in')
    expect(
      resolveParents([
        slot('Ravi', 'Father'),
        slot('Asha', 'Mother'),
        slot('Gopal', 'Grandfather', null, 'g@x.in'),
      ]).email,
    ).toBe('g@x.in')
  })
})

describe('genderShort', () => {
  it('abbreviates male and female', () => {
    expect(genderShort('male')).toBe('M')
    expect(genderShort('Female')).toBe('F')
    expect(genderShort(null)).toBe('-')
    expect(genderShort('other')).toBe('other')
  })
})
