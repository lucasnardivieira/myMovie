import { formatRuntime } from '../lib/catalog'
import type { Catalog, Movie } from '../types'

export function MovieMeta({ movie }: { movie: Movie }) {
  const parts = [movie.year, formatRuntime(movie.runtime)].filter(Boolean)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/80">
      <span className="inline-flex items-center gap-1 font-semibold text-gold">
        <span aria-hidden>★</span>
        {movie.rating.toFixed(1)}
      </span>
      {parts.map((p) => (
        <span key={String(p)}>{p}</span>
      ))}
    </div>
  )
}

export function VibeChips({ movie, catalog }: { movie: Movie; catalog: Catalog }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {movie.vibes.slice(0, 3).map((v) => (
        <span key={v} className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur">
          {catalog.vibes[v] ?? v}
        </span>
      ))}
    </div>
  )
}

export function Providers({ movie, catalog }: { movie: Movie; catalog: Catalog }) {
  if (movie.providers.length === 0) return null
  return (
    <div className="flex items-center gap-2 text-xs text-white/70">
      <span>Onde ver:</span>
      {movie.providers.slice(0, 4).map((id) => {
        const p = catalog.providers[String(id)]
        if (!p) return null
        return p.logo ? (
          <img
            key={id}
            src={`https://image.tmdb.org/t/p/w92${p.logo}`}
            alt={p.name}
            title={p.name}
            className="h-6 w-6 rounded-md"
          />
        ) : (
          <span key={id} className="rounded bg-white/10 px-1.5 py-0.5">
            {p.name}
          </span>
        )
      })}
    </div>
  )
}
