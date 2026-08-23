// Helpers for labelling a class consistently across the dashboard.
//
// A class row is scoped to an academic year (e.g. "Playgroup" exists once per
// year), so the year is what distinguishes otherwise-identical classes. In
// React contexts we render the name+section as text and the year as a separate
// badge; plain-text contexts (CSV export, combobox search values, the command
// palette) use `classLabelWithYear`, which folds the year inline.

/** Name + section only, no year. e.g. "Playgroup A" — or "Playgroup". */
export function classLabel(
  name: string | null | undefined,
  section: string | null | undefined,
): string {
  if (!name) return '-'
  return section ? `${name} ${section}` : name
}

/**
 * Name + section with the academic year folded in, for plain-text spots that
 * can't render a badge. e.g. "Playgroup A · 2026-27".
 */
export function classLabelWithYear(
  name: string | null | undefined,
  section: string | null | undefined,
  academicYear: string | null | undefined,
): string {
  const base = classLabel(name, section)
  if (base === '-' || !academicYear) return base
  return `${base} · ${academicYear}`
}
