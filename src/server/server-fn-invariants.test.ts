import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// The view-only `auditor` role is granted read access in requireRole by HTTP
// method: any GET server function is allowed, every POST is denied. That is only
// safe while GET === read and POST === write.
//
// This test pins that invariant. If someone declares a mutation as
// `createServerFn({ method: 'GET' })`, the auditor would silently gain write
// access — and this test fails instead.

const SERVER_DIR = path.resolve(import.meta.dirname)

const WRITE_CALL =
  /\b(?:db|tx)\s*\.\s*(insert|update|delete|batch|transaction)\s*\(/

type ServerFn = { name: string; method: string; body: string }

function parseServerFns(source: string): ServerFn[] {
  const fns: ServerFn[] = []
  // Matches: export const <name> = createServerFn({ method: '<METHOD>' })
  const declaration =
    /export const (\w+)\s*=\s*createServerFn\(\{\s*method:\s*['"](\w+)['"]/g

  const starts: { name: string; method: string; index: number }[] = []
  let match: RegExpExecArray | null
  while ((match = declaration.exec(source)) !== null) {
    starts.push({ name: match[1], method: match[2], index: match.index })
  }

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]
    const end = starts[i + 1]?.index ?? source.length
    fns.push({
      name: start.name,
      method: start.method,
      body: source.slice(start.index, end),
    })
  }
  return fns
}

const files = readdirSync(SERVER_DIR).filter(
  (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
)

const allFns = files.flatMap((file) => {
  const source = readFileSync(path.join(SERVER_DIR, file), 'utf8')
  return parseServerFns(source).map((fn) => ({ ...fn, file }))
})

describe('server function invariants', () => {
  it('finds the server functions (guards against the parser silently matching nothing)', () => {
    expect(allFns.length).toBeGreaterThan(30)
  })

  it('only declares GET or POST', () => {
    const odd = allFns.filter((f) => f.method !== 'GET' && f.method !== 'POST')
    expect(odd.map((f) => `${f.file}:${f.name}=${f.method}`)).toEqual([])
  })

  // The load-bearing one — see the file header.
  it('no GET server function performs a write (auditor read-only invariant)', () => {
    const violations = allFns
      .filter((f) => f.method === 'GET')
      .filter((f) => WRITE_CALL.test(f.body))
      .map((f) => `${f.file}:${f.name}`)

    expect(violations).toEqual([])
  })
})
