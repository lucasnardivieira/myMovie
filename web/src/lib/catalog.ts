import type { Catalog } from '../types'

const base = import.meta.env.BASE_URL

/** Real catalog from the pipeline; falls back to the bundled sample during development. */
export async function loadCatalog(): Promise<Catalog> {
  for (const file of ['data/catalog.json', 'data/catalog.sample.json']) {
    const res = await fetch(`${base}${file}`)
    if (res.ok && res.headers.get('content-type')?.includes('json')) return res.json()
  }
  throw new Error('Catálogo não encontrado')
}

export const posterUrl = (path: string | null, size: 'w342' | 'w500' | 'w780' = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null

export const formatRuntime = (minutes: number | null) => {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m}min`
}
