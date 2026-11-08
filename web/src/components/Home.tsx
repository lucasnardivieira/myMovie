import { motion } from 'framer-motion'
import type { Invite } from '../lib/share'

const STEPS = [
  { icon: '🎯', title: 'Escolham a vibe', text: 'Leve, tenso, pra chorar… e quanto tempo vocês têm.' },
  { icon: '👆', title: 'Deem swipe', text: 'Cada um no seu celular, nos mesmos 20 filmes bem avaliados.' },
  { icon: '💞', title: 'Vejam o match', text: 'O filme que os dois curtiram, sem discussão.' },
]

interface Props {
  movieCount: number
  invite: Invite | null
  onStart: () => void
}

export function Home({ movieCount, invite, onStart }: Props) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="text-5xl sm:text-6xl" aria-hidden>
          🍿
        </div>
        {invite ? (
          <>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl">
              <span className="text-gradient">{invite.name || 'Alguém'}</span> te chamou
              <br />
              pra escolher um filme
            </h1>
            <p className="mx-auto max-w-sm text-muted">
              São {invite.deck.length} filmes. Dê swipe do seu jeito e no final aparece o que vocês dois curtiram.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl">
              Chega de passar
              <br />
              <span className="text-gradient">40 minutos</span> escolhendo
            </h1>
            <p className="mx-auto max-w-sm text-muted">
              Só filmes bem avaliados — {movieCount.toLocaleString('pt-BR')} no catálogo. Vocês escolhem a vibe, o
              myMovie encontra o match.
            </p>
          </>
        )}
      </motion.div>

      <button className="btn-primary text-lg" onClick={onStart}>
        {invite ? 'Bora dar swipe' : 'Escolher um filme agora'}
      </button>

      {!invite && (
        <ol className="grid w-full max-w-2xl grid-cols-3 gap-2 sm:gap-3">
          {STEPS.map((s, i) => (
            <motion.li
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="rounded-2xl border border-line bg-panel/70 p-3 text-left sm:p-4"
            >
              <div className="text-2xl" aria-hidden>
                {s.icon}
              </div>
              <div className="mt-1 text-sm font-semibold sm:mt-2 sm:text-base">{s.title}</div>
              <div className="hidden text-sm text-muted sm:block">{s.text}</div>
            </motion.li>
          ))}
        </ol>
      )}

    </section>
  )
}
