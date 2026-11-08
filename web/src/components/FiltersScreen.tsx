import { useMemo } from 'react'
import { DECK_SIZE, ERAS, RUNTIMES, filterMovies, type Era, type Filters } from '../lib/deck'
import type { Catalog } from '../types'

interface Props {
  catalog: Catalog
  filters: Filters
  seen: ReadonlySet<number>
  onChange: (f: Filters) => void
  onStart: () => void
  onBack: () => void
}

const chip = (active: boolean, tone: 'on' | 'off' | 'neutral' = 'on') =>
  `rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${
    !active
      ? 'border-line bg-panel/60 text-white/80 hover:border-white/30'
      : tone === 'off'
        ? 'border-nope/60 bg-nope/15 text-nope line-through'
        : 'border-transparent bg-white text-ink'
  }`

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-display text-xl font-extrabold">
        {title}
        {hint && <span className="ml-2 font-sans text-xs font-normal text-muted">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

export function FiltersScreen({ catalog, filters, seen, onChange, onStart, onBack }: Props) {
  const count = useMemo(() => filterMovies(catalog.movies, filters, seen).length, [catalog, filters, seen])
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((x) => x !== value) : [...list, value])

  // genres cycle: neutral → want → don't want → neutral
  const cycleGenre = (id: number) => {
    if (filters.include.includes(id)) {
      onChange({ ...filters, include: toggle(filters.include, id), exclude: [...filters.exclude, id] })
    } else if (filters.exclude.includes(id)) {
      onChange({ ...filters, exclude: toggle(filters.exclude, id) })
    } else {
      onChange({ ...filters, include: [...filters.include, id] })
    }
  }

  const genres = Object.entries(catalog.genres).sort(([, a], [, b]) => a.localeCompare(b, 'pt-BR'))

  return (
    <section className="flex flex-1 flex-col">
      <div className="flex items-center justify-between">
        <button className="text-sm text-muted hover:text-white" onClick={onBack}>
          ← Voltar
        </button>
        <button className="text-sm text-muted hover:text-white" onClick={() => onChange({ vibes: [], include: [], exclude: [], maxRuntime: null, era: 'any' })}>
          Limpar
        </button>
      </div>

      <h2 className="mt-4 font-display text-3xl font-extrabold">O que vocês querem hoje?</h2>

      <div className="mt-6 space-y-8 pb-32">
        <Section title="Qual a vibe?" hint="escolha uma ou mais">
          {Object.entries(catalog.vibes).map(([key, label]) => (
            <button key={key} className={chip(filters.vibes.includes(key))} onClick={() => onChange({ ...filters, vibes: toggle(filters.vibes, key) })}>
              {label}
            </button>
          ))}
        </Section>

        <Section title="Gêneros" hint="1 toque: quero · 2 toques: nem pensar">
          {genres.map(([id, name]) => {
            const gid = Number(id)
            const excluded = filters.exclude.includes(gid)
            return (
              <button
                key={id}
                className={chip(filters.include.includes(gid) || excluded, excluded ? 'off' : 'on')}
                onClick={() => cycleGenre(gid)}
                aria-pressed={filters.include.includes(gid) ? 'true' : excluded ? 'mixed' : 'false'}
              >
                {name}
              </button>
            )
          })}
        </Section>

        <Section title="Quanto tempo?">
          {RUNTIMES.map((r) => (
            <button key={r.label} className={chip(filters.maxRuntime === r.value)} onClick={() => onChange({ ...filters, maxRuntime: r.value })}>
              {r.label}
            </button>
          ))}
        </Section>

        <Section title="De que época?">
          {(Object.keys(ERAS) as Era[]).map((era) => (
            <button key={era} className={chip(filters.era === era)} onClick={() => onChange({ ...filters, era })}>
              {ERAS[era].label}
            </button>
          ))}
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/85 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-semibold">{count.toLocaleString('pt-BR')} filmes</div>
            <div className="text-muted">{count === 0 ? 'Afrouxe algum filtro' : `vamos sortear ${Math.min(count, DECK_SIZE)} dos melhores`}</div>
          </div>
          <button className="btn-primary" disabled={count === 0} onClick={onStart}>
            Começar
          </button>
        </div>
      </div>
    </section>
  )
}
