/** Per-device conveniences. Storage can be unavailable (private mode), so never throw. */

const SEEN_KEY = 'mymovie:seen'
const NAME_KEY = 'mymovie:name'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export const loadSeen = (): Set<number> => new Set(read<number[]>(SEEN_KEY, []))
export const saveSeen = (seen: Set<number>): void => write(SEEN_KEY, [...seen])
export const loadName = (): string => read<string>(NAME_KEY, '')
export const saveName = (name: string): void => write(NAME_KEY, name)
