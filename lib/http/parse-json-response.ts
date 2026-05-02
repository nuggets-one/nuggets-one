/**
 * Safe JSON parsing for browser fetch() callers.
 * HTML shells (login pages, Next error documents) often start with `<` and
 * would make Response.json() throw "Unexpected token '<'".
 */
export function parseJsonText<T>(text: string): T | undefined {
  const trimmed = text.trimStart()
  if (!trimmed || trimmed.startsWith('<')) return undefined
  try {
    return JSON.parse(trimmed) as T
  } catch {
    return undefined
  }
}

export async function readResponseJson<T>(res: Response): Promise<T | undefined> {
  const text = await res.text()
  return parseJsonText<T>(text)
}
