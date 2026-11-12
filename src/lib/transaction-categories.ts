// Categories for manual income/expense transactions (Expenses page). A fixed
// list in code: the picker, the table filter, the dashboard's category donut
// and the server's validation all read it from here.
//
// Not in the expense list on purpose:
// - Salaries: paid salaries come from Staff salary records and are already
//   counted in the Monthly Overview, so a manual entry would count twice.
// - Supplies: split into Teaching Materials, Stationery & Printing, Cleaning
//   & Housekeeping, Food & Refreshments and Books & Uniforms for Resale.
// - Insurance: part of Professional & Compliance.
//
// Each transaction stores its category as plain text, so renaming one here
// leaves old rows on the old name: migrate them as well.

export type TransactionCategoryType = 'income' | 'expense'

export const OTHER_CATEGORY = 'Other'

export const EXPENSE_CATEGORIES = [
  'Teaching Materials',
  'Stationery & Printing',
  'Cleaning & Housekeeping',
  'Food & Refreshments',
  'Maintenance',
  'Equipment',
  'Utilities',
  'Rent',
  'Events',
  'Marketing',
  'Transport',
  'Staff Welfare & Training',
  // CA/audit fees, registrations, bank charges, software subscriptions,
  // insurance.
  'Professional & Compliance',
  'Books & Uniforms for Resale',
  OTHER_CATEGORY,
] as const

export const INCOME_CATEGORIES = [
  'Donations',
  'Grants',
  'Rentals',
  'Events',
  'Interest',
  'Sale of Books & Uniforms',
  OTHER_CATEGORY,
] as const

export function categoriesFor(
  type: TransactionCategoryType,
): readonly string[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
}

export function isValidCategory(
  type: TransactionCategoryType,
  category: string,
): boolean {
  return categoriesFor(type).includes(category)
}

// "Other" says nothing about what the money was for, so it needs a
// description.
export function needsDescription(category: string): boolean {
  return category === OTHER_CATEGORY
}

// Options for the table's category filter: the current categories plus any
// other names found in the data (e.g. "Supplies" on older rows), so those
// stay filterable. Current ones first in list order, then the rest A–Z.
export function categoryFilterNames(dataCategories: Iterable<string>) {
  const current = [
    ...new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]),
  ]
  const known = new Set(current)
  const legacy = [...new Set(dataCategories)]
    .filter((c) => c && !known.has(c))
    .sort((a, b) => a.localeCompare(b))
  return { current, legacy }
}
