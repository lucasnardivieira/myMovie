import { AnimatePresence, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import type { Catalog, Movie } from '../types'
import { MovieMeta, Providers, VibeChips } from './MovieMeta'
import { Poster } from './Poster'

export type Decision = 'like' | 'nope' | 'seen'

const SWIPE_THRESHOLD = 110

// `custom` comes from AnimatePresence, so the card flies off in the direction of the decision
const exitVariants = {
  exit: (d: Decision) => ({
    x: d === 'like' ? 520 : d === 'nope' ? -520 : 0,
    y: d === 'seen' ? -520 : 0,
    opacity: 0,
    rotate: d === 'like' ? 18 : d === 'nope' ? -18 : 0,
    transition: { duration: 0.32 },
  }),
}

interface CardProps {
  movie: Movie
  catalog: Catalog
  onDecide: (d: Decision) => void
}

function SwipeCard({ movie, catalog, onDecide }: CardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-14, 14])
  const likeOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1])
  const nopeOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0])
  const [showInfo, setShowInfo] = useState(false)

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600) onDecide('like')
    else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -600) onDecide('nope')
  }

  return (
    <motion.article
      className="absolute inset-0 cursor-grab touch-pan-y overflow-hidden rounded-3xl bg-panel shadow-2xl shadow-black/60 active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={onDragEnd}
      initial={{ scale: 0.95, y: 12, opacity: 0.6 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      variants={exitVariants}
      exit="exit"
      onTap={() => setShowInfo((s) => !s)}
      aria-label={movie.title}
    >
      <Poster movie={movie} size="w780" label="none" />

      <motion.div style={{ opacity: likeOpacity }} className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-like px-3 py-1 font-display text-3xl font-extrabold text-like">
        QUERO
      </motion.div>
      <motion.div style={{ opacity: nopeOpacity }} className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-xl border-4 border-nope px-3 py-1 font-display text-3xl font-extrabold text-nope">
        PASSO
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-black via-black/85 to-transparent p-5 pt-24">
        <h3 className="font-display text-3xl font-extrabold leading-tight">{movie.title}</h3>
        {movie.original_title && movie.original_title !== movie.title && (
          <p className="-mt-1 text-sm text-white/60">{movie.original_title}</p>
        )}
        <MovieMeta movie={movie} />
        <VibeChips movie={movie} catalog={catalog} />
        {movie.pitch && !showInfo && <p className="text-[15px] leading-snug text-white/90">{movie.pitch}</p>}
        {showInfo && <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-white/85">{movie.overview || 'Sem sinopse.'}</p>}
        <div className="flex items-center justify-between pt-1">
          <Providers movie={movie} catalog={catalog} />
          <span className="text-xs text-white/50">{showInfo ? 'toque p/ fechar' : 'toque p/ sinopse'}</span>
        </div>
      </div>
    </motion.article>
  )
}

interface DeckProps {
  deck: Movie[]
  catalog: Catalog
  onDone: (likes: number[]) => void
  onSeen: (id: number) => void
  onQuit: () => void
}

export function SwipeDeck({ deck, catalog, onDone, onSeen, onQuit }: DeckProps) {
  const [index, setIndex] = useState(0)
  const [likes, setLikes] = useState<number[]>([])
  const [lastDecision, setLastDecision] = useState<Decision>('nope')
  const current = deck[index]
  const next = deck[index + 1]

  const decide = useCallback(
    (d: Decision) => {
      if (!current) return
      setLastDecision(d)
      const newLikes = d === 'like' ? [...likes, current.id] : likes
      if (d === 'seen') onSeen(current.id)
      setLikes(newLikes)
      if (index + 1 >= deck.length) setTimeout(() => onDone(newLikes), 300)
      setIndex((i) => i + 1)
    },
    [current, likes, index, deck.length, onDone, onSeen],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide('like')
      else if (e.key === 'ArrowLeft') decide('nope')
      else if (e.key === 'ArrowUp') decide('seen')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide])

  return (
    <section className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-md items-center justify-between text-sm text-muted">
        <button className="hover:text-white" onClick={onQuit}>
          ← Filtros
        </button>
        <span>
          {Math.min(index + 1, deck.length)} / {deck.length} · <span className="text-like">{likes.length} ♥</span>
        </span>
      </div>

      <div className="mt-2 h-1 w-full max-w-md overflow-hidden rounded-full bg-line">
        <motion.div className="h-full bg-gradient-to-r from-accent to-accent-2" animate={{ width: `${(index / deck.length) * 100}%` }} />
      </div>

      <div className="relative mt-4 aspect-[2/3] w-full max-w-md max-h-[64vh] sm:max-h-[68vh]">
        {next && (
          <div className="absolute inset-0 scale-95 overflow-hidden rounded-3xl opacity-60" aria-hidden>
            <Poster movie={next} size="w500" label="none" />
          </div>
        )}
        <AnimatePresence custom={lastDecision}>
          {current && <SwipeCard key={current.id} movie={current} catalog={catalog} onDecide={decide} />}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <RoundButton label="Passo" onClick={() => decide('nope')} className="h-16 w-16 border-nope/50 text-nope">
          ✕
        </RoundButton>
        <RoundButton label="Já vi esse" onClick={() => decide('seen')} className="h-12 w-12 border-line text-sm text-muted">
          👁
        </RoundButton>
        <RoundButton label="Quero ver" onClick={() => decide('like')} className="h-16 w-16 border-like/50 text-like">
          ♥
        </RoundButton>
      </div>
      <p className="mt-3 hidden text-xs text-muted sm:block">Atalhos: ← passo · → quero · ↑ já vi</p>
    </section>
  )
}

function RoundButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex items-center justify-center rounded-full border-2 bg-panel text-2xl shadow-lg transition hover:scale-105 active:scale-90 ${className}`}
    >
      {children}
    </button>
  )
}
