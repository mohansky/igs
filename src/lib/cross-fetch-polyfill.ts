// Polyfill for cross-fetch that uses native globals
// Needed because @libsql/hrana-client imports Request/Headers from cross-fetch
// which are incompatible with Cloudflare Workers' native fetch
export default globalThis.fetch
export const fetch = globalThis.fetch
export const Request = globalThis.Request
export const Headers = globalThis.Headers
export const Response = globalThis.Response
