import { useState } from 'react'
import { posterUrl } from '../lib/catalog'
import type { Movie } from '../types'

const GRADIENTS = [
  'from-rose-500/70 to-indigo-900',
  'from-amber-500/70 to-rose-900',
  'from-emerald-500/60 to-slate-900',
  'from-sky-500/60 to-purple-900',
  'from-fuchsia-500/60 to-slate-900',
]

/** TMDB poster with a typographic fallback when there is no image (or it fails to load). */
interface PosterProps {
  movie: Movie
  size?: 'w342' | 'w500' | 'w780'
  /** fallback title size: hidden when the title is already shown next to the poster */
  label?: 'lg' | 'sm' | 'none'
  className?: string
}

export function Poster({ movie, size = 'w500', label = 'lg', className = '' }: PosterProps) {
  const [failed, setFailed] = useState(false)
  const src = posterUrl(movie.poster, size)
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`Pôster de ${movie.title}`}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  const gradient = GRADIENTS[movie.id % GRADIENTS.length]
  return (
    <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} p-3 ${className}`}>
      {label !== 'none' && (
        <span
          className={`line-clamp-4 break-words text-center font-display font-extrabold leading-tight text-white/90 drop-shadow ${
            label === 'sm' ? 'text-sm' : 'text-3xl'
          }`}
        >
          {movie.title}
        </span>
      )}
    </div>
  )
}
