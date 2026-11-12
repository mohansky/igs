// A student profile has three free-text guardian slots (name, relation,
// phone, email), not fixed mother/father fields. The students list shows
// Mother and Father columns, so this works out which slot is which.

export interface GuardianSlot {
  name: string | null
  relation: string | null
  phone: string | null
  email: string | null
}

export interface Guardian {
  name: string | null
  phone: string | null
}

// Whole word, so "GrandFather" or "Grandmother" don't count.
const FATHER = /\bfather\b/i
const MOTHER = /\bmother\b/i
// A relation naming someone other than a parent. Anything else (blank, or
// an occupation typed into the field, like "Home Maker") doesn't rule a
// slot out of the fallback below.
const OTHER_RELATIVE =
  /grand|guardian|uncle|aunt|brother|sister|sibling|cousin|relative|\bstep|in-law/i

const filled = (s: string | null | undefined) =>
  s != null && s.trim() !== '' ? s.trim() : null

const hasDetails = (g: GuardianSlot) => !!(filled(g.name) || filled(g.phone))

export function resolveParents(slots: GuardianSlot[]): {
  father: Guardian | null
  mother: Guardian | null
  email: string | null
} {
  const matches = (re: RegExp) =>
    slots.findIndex((g) => hasDetails(g) && re.test(g.relation ?? ''))

  let fatherIdx = matches(FATHER)
  let motherIdx = matches(MOTHER)

  // Fall back to the form's order (guardian 1 is usually the father,
  // guardian 2 the mother) when no slot says so, as long as that slot
  // doesn't name another relative or the other parent.
  const fallback = (idx: number, other: RegExp, taken: number) => {
    const g = slots[idx] as GuardianSlot | undefined
    if (!g || !hasDetails(g) || idx === taken) return -1
    const rel = g.relation ?? ''
    return other.test(rel) || OTHER_RELATIVE.test(rel) ? -1 : idx
  }
  if (fatherIdx === -1) fatherIdx = fallback(0, MOTHER, motherIdx)
  if (motherIdx === -1) motherIdx = fallback(1, FATHER, fatherIdx)

  const pick = (idx: number): Guardian | null =>
    idx === -1
      ? null
      : { name: filled(slots[idx].name), phone: filled(slots[idx].phone) }

  // One family email: the father's, then the mother's, then any guardian's.
  const order = [fatherIdx, motherIdx, ...slots.keys()].filter((i) => i >= 0)
  const email =
    order.map((i) => filled(slots[i].email)).find((e) => e !== null) ?? null

  return { father: pick(fatherIdx), mother: pick(motherIdx), email }
}

// "male" / "female" → "M" / "F"; anything else is shown as entered.
export function genderShort(gender: string | null | undefined): string {
  const g = filled(gender)
  if (!g) return '-'
  const lower = g.toLowerCase()
  if (lower === 'male' || lower === 'm') return 'M'
  if (lower === 'female' || lower === 'f') return 'F'
  return g
}
