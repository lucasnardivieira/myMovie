import { motion } from 'framer-motion'
import type { Catalog, Movie } from '../types'
import { MovieMeta, Providers, VibeChips } from './MovieMeta'
import { Poster } from './Poster'

interface Props {
  catalog: Catalog
  /** movies to show, best first */
  movies: Movie[]
  mode: 'match' | 'solo' | 'fallback'
  partnerName?: string
  onWatched: (id: number) => void
  onRestart: () => void
}

const HEADLINES = {
  match: { emoji: '💞', title: 'Deu match!', sub: (n?: string) => `Você e ${n || 'seu par'} querem ver:` },
  solo: { emoji: '🎬', title: 'Seu filme de hoje', sub: () => 'O mais bem avaliado entre os que você curtiu:' },
  fallback: {
    emoji: '🤝',
    title: 'Sem match… mas quase',
    sub: () => 'Ninguém concordou, então aqui vai o mais bem avaliado entre os likes de vocês:',
  },
}

export function MatchScreen({ catalog, movies, mode, partnerName, onWatched, onRestart }: Props) {
  const [top, ...rest] = movies
  const h = HEADLINES[mode]

  if (!top) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-5xl">😅</div>
        <h2 className="font-display text-3xl font-extrabold">Ninguém curtiu nada</h2>
        <p className="text-muted">Bora outra rodada com outra vibe?</p>
        <button className="btn-primary" onClick={onRestart}>
          Nova rodada
        </button>
      </section>
    )
  }

  return (
    <section className="flex flex-1 flex-col items-center gap-6">
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-center">
        <div className="text-6xl">{h.emoji}</div>
        <h2 className="mt-2 font-display text-4xl font-extrabold">
          <span className="text-gradient">{h.title}</span>
        </h2>
        <p className="mt-1 text-muted">{h.sub(partnerName)}</p>
      </motion.div>

      <motion.article
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="grid w-full max-w-2xl overflow-hidden rounded-3xl border border-line bg-panel sm:grid-cols-[220px_1fr]"
      >
        <div className="h-72 sm:h-auto">
          <Poster movie={top} size="w500" label="none" className="object-top" />
        </div>
        <div className="space-y-3 p-5">
          <h3 className="font-display text-3xl font-extrabold leading-tight">{top.title}</h3>
          <MovieMeta movie={top} />
          <VibeChips movie={top} catalog={catalog} />
          {top.pitch && <p className="font-medium text-white/90">{top.pitch}</p>}
          <p className="text-sm leading-relaxed text-white/75">{top.overview}</p>
          <Providers movie={top} catalog={catalog} />
          <div className="flex flex-wrap gap-2 pt-2">
            <a className="btn-ghost text-sm" href={`https://www.themoviedb.org/movie/${top.id}`} target="_blank" rel="noreferrer">
              Ver no TMDB ↗
            </a>
            <button className="btn-ghost text-sm" onClick={() => onWatched(top.id)}>
              ✓ Vamos ver esse
            </button>
          </div>
        </div>
      </motion.article>

      {rest.length > 0 && (
        <div className="w-full max-w-2xl">
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Outras opções</h4>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {rest.map((m) => (
              <li key={m.id} className="space-y-1">
                <div className="aspect-[2/3] overflow-hidden rounded-xl">
                  <Poster movie={m} size="w342" label="sm" />
                </div>
                <div className="truncate text-xs font-medium">{m.title}</div>
                <div className="text-xs text-gold">★ {m.rating.toFixed(1)}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn-primary" onClick={onRestart}>
        Nova rodada
      </button>
    </section>
  )
}
