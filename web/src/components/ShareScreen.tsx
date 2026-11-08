import { motion } from 'framer-motion'
import { useState } from 'react'
import { inviteUrl } from '../lib/share'
import type { Movie } from '../types'
import { Poster } from './Poster'

interface Props {
  deck: Movie[]
  likes: number[]
  initialName: string
  onNameChange: (name: string) => void
  onSolo: () => void
  onRestart: () => void
}

export function ShareScreen({ deck, likes, initialName, onNameChange, onSolo, onRestart }: Props) {
  const [name, setName] = useState(initialName)
  const [copied, setCopied] = useState(false)
  const liked = deck.filter((m) => likes.includes(m.id))

  const send = async () => {
    onNameChange(name)
    const url = inviteUrl({ name: name.trim(), deck: deck.map((m) => m.id), likes })
    const text = `${name.trim() || 'Eu'} já escolhi meus filmes. Sua vez de dar swipe! 🍿`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'myMovie', text, url })
        return
      } catch {
        /* cancelled or unsupported: fall back to copying */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt('Copie o link:', url)
    }
  }

  if (liked.length === 0) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="text-5xl">🤷</div>
        <h2 className="font-display text-3xl font-extrabold">Nenhum filme te animou</h2>
        <p className="text-muted">Tente outra vibe ou afrouxe os filtros.</p>
        <button className="btn-primary" onClick={onRestart}>
          Nova rodada
        </button>
      </section>
    )
  }

  return (
    <section className="flex flex-1 flex-col items-center gap-8 text-center">
      <div className="space-y-2">
        <h2 className="font-display text-4xl font-extrabold">
          Você curtiu <span className="text-gradient">{liked.length}</span> {liked.length === 1 ? 'filme' : 'filmes'}
        </h2>
        <p className="text-muted">Agora manda pro seu par dar swipe nos mesmos filmes.</p>
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto px-1 pb-2">
        {liked.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl"
          >
            <Poster movie={m} size="w342" label="sm" />
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3">
        <label className="block text-left text-sm text-muted" htmlFor="name">
          Seu nome (aparece no convite)
        </label>
        <input
          id="name"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Lucas"
          className="w-full rounded-full border border-line bg-panel px-5 py-3 outline-none focus:border-accent"
        />
        <button className="btn-primary w-full text-lg" onClick={send}>
          {copied ? 'Link copiado! ✓' : 'Enviar convite'}
        </button>
        <button className="btn-ghost w-full" onClick={onSolo}>
          Hoje eu decido sozinho(a)
        </button>
      </div>
    </section>
  )
}
