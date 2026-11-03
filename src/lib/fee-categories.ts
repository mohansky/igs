// Fee categories shared by server and client.

export type FeeCategoryKey =
  | 'admission'
  | 'tuition'
  | 'books'
  | 'uniform'
  | 'other'

// Seeded by src/db/seed-fee-categories.ts, in this order. Books and uniform
// are pass-through: cost recovery, not fee income.
export const DEFAULT_FEE_CATEGORIES: {
  key: FeeCategoryKey
  name: string
  isPassThrough: boolean
}[] = [
  { key: 'admission', name: 'Admission Fee', isPassThrough: false },
  { key: 'tuition', name: 'Tuition Fee', isPassThrough: false },
  { key: 'books', name: 'Books', isPassThrough: true },
  { key: 'uniform', name: 'Uniform', isPassThrough: true },
  { key: 'other', name: 'Other', isPassThrough: false },
]

// Bulk fees default to it, and concession (open) fees are always tuition.
export const TUITION_KEY: FeeCategoryKey = 'tuition'

export const UNCATEGORISED_LABEL = 'Uncategorised'

// Suggest a category for an old, uncategorised fee from its description.
// Only a suggestion: the backfill screen applies nothing without the admin
// confirming. null when no keyword matches.
export function suggestFeeCategoryKey(
  description: string | null | undefined,
): FeeCategoryKey | null {
  const d = (description ?? '').toLowerCase()
  if (/admission/.test(d)) return 'admission'
  if (/tuition|tution/.test(d)) return 'tuition'
  if (/book/.test(d)) return 'books'
  if (/uniform/.test(d)) return 'uniform'
  return null
}
