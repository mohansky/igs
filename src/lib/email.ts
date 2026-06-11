const PLACEHOLDER_DOMAIN = 'local.invalid'

export function placeholderEmail(userId: string): string {
  return `noemail+${userId}@${PLACEHOLDER_DOMAIN}`
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`)
}

export function displayEmail(email: string | null | undefined): string {
  if (!email || isPlaceholderEmail(email)) return ''
  return email
}
