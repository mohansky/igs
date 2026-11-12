// Money checks for splitting a transaction into lines, shared by the split
// dialog and the server. Amounts are compared in whole paise so floating
// point (0.1 + 0.2) can't make an exact split look wrong.

export const MIN_SPLIT_LINES = 2
export const MAX_SPLIT_LINES = 20

export function toPaise(amount: number): number {
  return Math.round(amount * 100)
}

// True when the amount has at most two decimal places.
export function isWholePaise(amount: number): boolean {
  return Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6
}

// What's left to allocate, in rupees (negative if the lines exceed the total).
export function splitRemainder(total: number, amounts: number[]): number {
  const allocated = amounts.reduce((s, a) => s + toPaise(a), 0)
  return (toPaise(total) - allocated) / 100
}

export function splitAddsUp(total: number, amounts: number[]): boolean {
  return (
    amounts.length >= MIN_SPLIT_LINES &&
    amounts.every((a) => a > 0 && isWholePaise(a)) &&
    toPaise(total) === amounts.reduce((s, a) => s + toPaise(a), 0)
  )
}
