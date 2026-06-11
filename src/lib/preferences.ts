export type ThemeMode = 'light' | 'dark' | 'auto'
export type Density = 'comfortable' | 'compact'
export type DateFormat =
  | 'dd-MM-yyyy'
  | 'dd/MM/yyyy'
  | 'dd-MM-yy'
  | 'dd MMM yyyy'

export const PREF_KEYS = {
  theme: 'theme',
  rows: 'prefs:rows',
  density: 'prefs:density',
  dateFormat: 'prefs:dateFormat',
  sidebarOpen: 'prefs:sidebarOpen',
  landingPath: 'prefs:landingPath',
} as const

export const LANDING_OPTIONS: { label: string; value: string }[] = [
  { label: 'Overview', value: '/dashboard' },
  { label: 'Attendance', value: '/dashboard/attendance' },
  { label: 'Fees', value: '/dashboard/fees' },
  { label: 'Students', value: '/dashboard/students' },
  { label: 'Calendar', value: '/dashboard/calendar' },
  { label: 'Profile', value: '/dashboard/profile' },
]

const PREFS_CHANGE_EVENT = 'prefs:change'

function emit() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PREFS_CHANGE_EVENT))
}

export function subscribeToPreferences(listener: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(PREFS_CHANGE_EVENT, listener)
  return () => window.removeEventListener(PREFS_CHANGE_EVENT, listener)
}

// ── Theme ─────────────────────────────────────────────────

export function getThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const v = window.localStorage.getItem(PREF_KEYS.theme)
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto'
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  root.style.colorScheme = resolved
}

export function setThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREF_KEYS.theme, mode)
  applyThemeMode(mode)
  emit()
}

// ── Rows per table ────────────────────────────────────────

export function getRowsPref(): number {
  if (typeof window === 'undefined') return 10
  const v = Number(window.localStorage.getItem(PREF_KEYS.rows))
  return Number.isFinite(v) && v > 0 ? v : 10
}

export function setRowsPref(v: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREF_KEYS.rows, String(v))
  emit()
}

// ── Density ───────────────────────────────────────────────

export function getDensity(): Density {
  if (typeof window === 'undefined') return 'comfortable'
  const v = window.localStorage.getItem(PREF_KEYS.density)
  return v === 'compact' ? 'compact' : 'comfortable'
}

export function applyDensity(v: Density) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.classList.remove('density-comfortable', 'density-compact')
  root.classList.add('density-' + v)
}

export function setDensity(v: Density) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREF_KEYS.density, v)
  applyDensity(v)
  emit()
}

// ── Date format ───────────────────────────────────────────

const DATE_FORMATS: DateFormat[] = [
  'dd-MM-yyyy',
  'dd/MM/yyyy',
  'dd-MM-yy',
  'dd MMM yyyy',
]

export function getDateFormat(): DateFormat {
  if (typeof window === 'undefined') return 'dd-MM-yyyy'
  const v = window.localStorage.getItem(PREF_KEYS.dateFormat) as DateFormat
  return DATE_FORMATS.includes(v) ? v : 'dd-MM-yyyy'
}

export function setDateFormat(v: DateFormat) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREF_KEYS.dateFormat, v)
  emit()
}

// ── Sidebar default ───────────────────────────────────────

export function getSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true
  const v = window.localStorage.getItem(PREF_KEYS.sidebarOpen)
  // Default: open
  return v === null ? true : v === 'true'
}

export function setSidebarOpen(v: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREF_KEYS.sidebarOpen, v ? 'true' : 'false')
  emit()
}

// ── Landing path ──────────────────────────────────────────

export function getLandingPath(): string {
  if (typeof window === 'undefined') return '/dashboard'
  const v = window.localStorage.getItem(PREF_KEYS.landingPath) ?? '/dashboard'
  return LANDING_OPTIONS.some((o) => o.value === v) ? v : '/dashboard'
}

export function setLandingPath(v: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PREF_KEYS.landingPath, v)
  emit()
}
