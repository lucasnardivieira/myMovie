import type { Movie } from '../types'

export type Era = 'any' | 'classic' | '80s90s' | '2000s' | 'recent'

export interface Filters {
  vibes: string[]
  include: number[]
  exclude: number[]
  maxRuntime: number | null
  era: Era
}

export const EMPTY_FILTERS: Filters = { vibes: [], include: [], exclude: [], maxRuntime: null, era: 'any' }

export const ERAS: Record<Era, { label: string; range: [number, number] }> = {
  any: { label: 'Qualquer época', range: [0, 9999] },
  classic: { label: 'Clássicos (até 1979)', range: [0, 1979] },
  '80s90s': { label: 'Anos 80 e 90', range: [1980, 1999] },
  '2000s': { label: 'Anos 2000', range: [2000, 2009] },
  recent: { label: 'De 2010 pra cá', range: [2010, 9999] },
}

export const RUNTIMES: { label: string; value: number | null }[] = [
  { label: 'Tanto faz', value: null },
  { label: 'Até 1h40', value: 100 },
  { label: 'Até 2h', value: 120 },
  { label: 'Até 2h30', value: 150 },
]

export const DECK_SIZE = 20
const POOL_SIZE = 60

export function matchesFilters(movie: Movie, f: Filters): boolean {
  const [from, to] = ERAS[f.era].range
  return (
    (f.vibes.length === 0 || f.vibes.some((v) => movie.vibes.includes(v))) &&
    (f.include.length === 0 || f.include.some((g) => movie.genres.includes(g))) &&
    !f.exclude.some((g) => movie.genres.includes(g)) &&
    (f.maxRuntime === null || (movie.runtime !== null && movie.runtime <= f.maxRuntime)) &&
    (f.era === 'any' || (movie.year !== null && movie.year >= from && movie.year <= to))
  )
}

export function filterMovies(movies: Movie[], f: Filters, seen: ReadonlySet<number> = new Set()): Movie[] {
  return movies.filter((m) => !seen.has(m.id) && matchesFilters(m, f))
}

/** Deterministic PRNG (mulberry32) so a seed always produces the same deck. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Best-rated pool, shuffled, so each round feels fresh but stays high quality. */
export function buildDeck(movies: Movie[], seed: number, size = DECK_SIZE): Movie[] {
  const pool = [...movies].sort((a, b) => b.score - a.score).slice(0, POOL_SIZE)
  const rand = mulberry32(seed)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, size)
}

/** Movies both people liked, best-rated first. */
export function computeMatches(movies: Movie[], mine: number[], theirs: number[]): Movie[] {
  const both = new Set(mine.filter((id) => theirs.includes(id)))
  return movies.filter((m) => both.has(m.id)).sort((a, b) => b.score - a.score)
}
