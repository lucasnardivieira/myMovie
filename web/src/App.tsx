import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiltersScreen } from './components/FiltersScreen'
import { Home } from './components/Home'
import { MatchScreen } from './components/MatchScreen'
import { ShareScreen } from './components/ShareScreen'
import { SwipeDeck } from './components/SwipeDeck'
import { loadCatalog } from './lib/catalog'
import { EMPTY_FILTERS, buildDeck, computeMatches, filterMovies, type Filters } from './lib/deck'
import { readInviteFromHash, type Invite } from './lib/share'
import { loadName, loadSeen, saveName, saveSeen } from './lib/storage'
import type { Catalog, Movie } from './types'

type Stage =
  | { name: 'home' }
  | { name: 'filters' }
  | { name: 'swipe'; deck: Movie[] }
  | { name: 'share'; deck: Movie[]; likes: number[] }
  | { name: 'result'; movies: Movie[]; mode: 'match' | 'solo' | 'fallback' }

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>({ name: 'home' })
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [seen, setSeen] = useState<Set<number>>(loadSeen)
  const [invite, setInvite] = useState<Invite | null>(() => readInviteFromHash())

  useEffect(() => {
    loadCatalog().then(setCatalog, (e: Error) => setError(e.message))
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [stage.name])

  const byId = useMemo(() => new Map(catalog?.movies.map((m) => [m.id, m])), [catalog])

  const markSeen = useCallback((id: number) => {
    setSeen((prev) => {
      const next = new Set(prev).add(id)
      saveSeen(next)
      return next
    })
  }, [])

  const restart = () => {
    setInvite(null)
    history.replaceState(null, '', location.pathname + location.search)
    setStage({ name: 'filters' })
  }

  const start = () => {
    if (!catalog) return
    if (invite) {
      const deck = invite.deck.map((id) => byId.get(id)).filter((m): m is Movie => Boolean(m))
      setStage({ name: 'swipe', deck })
    } else {
      setStage({ name: 'filters' })
    }
  }

  const onSwipeDone = (deck: Movie[], likes: number[]) => {
    if (!invite) return setStage({ name: 'share', deck, likes })
    const matches = computeMatches(deck, likes, invite.likes)
    if (matches.length > 0) return setStage({ name: 'result', movies: matches, mode: 'match' })
    const either = new Set([...likes, ...invite.likes])
    const union = deck.filter((m) => either.has(m.id)).sort((a, b) => b.score - a.score)
    setStage({ name: 'result', movies: union, mode: 'fallback' })
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between py-2">
        <button className="font-display text-xl font-extrabold tracking-tight" onClick={() => setStage({ name: 'home' })}>
          my<span className="text-gradient">Movie</span>
        </button>
        {seen.size > 0 && <span className="text-xs text-muted">{seen.size} já vistos ocultos</span>}
      </header>

      <main className="flex flex-1 flex-col py-4">
        {error && <p className="m-auto text-center text-nope">{error}</p>}
        {!catalog && !error && <div className="m-auto h-10 w-10 animate-spin rounded-full border-4 border-line border-t-accent" aria-label="Carregando" />}

        {catalog && stage.name === 'home' && <Home movieCount={catalog.movies.length} invite={invite} onStart={start} />}

        {catalog && stage.name === 'filters' && (
          <FiltersScreen
            catalog={catalog}
            filters={filters}
            seen={seen}
            onChange={setFilters}
            onBack={() => setStage({ name: 'home' })}
            onStart={() => {
              const deck = buildDeck(filterMovies(catalog.movies, filters, seen), Date.now())
              setStage({ name: 'swipe', deck })
            }}
          />
        )}

        {catalog && stage.name === 'swipe' && (
          <SwipeDeck
            key={stage.deck.map((m) => m.id).join()}
            deck={stage.deck}
            catalog={catalog}
            onSeen={markSeen}
            onDone={(likes) => onSwipeDone(stage.deck, likes)}
            onQuit={() => (invite ? setStage({ name: 'home' }) : setStage({ name: 'filters' }))}
          />
        )}

        {catalog && stage.name === 'share' && (
          <ShareScreen
            deck={stage.deck}
            likes={stage.likes}
            initialName={loadName()}
            onNameChange={saveName}
            onRestart={restart}
            onSolo={() =>
              setStage({
                name: 'result',
                mode: 'solo',
                movies: stage.deck.filter((m) => stage.likes.includes(m.id)).sort((a, b) => b.score - a.score),
              })
            }
          />
        )}

        {catalog && stage.name === 'result' && (
          <MatchScreen catalog={catalog} movies={stage.movies} mode={stage.mode} partnerName={invite?.name} onWatched={markSeen} onRestart={restart} />
        )}
      </main>

      <footer className="flex flex-col items-center gap-1 pt-6 text-center text-[11px] text-muted/80">
        <span>
          Dados e imagens:{' '}
          <a className="underline" href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            TMDB
          </a>
          . {catalog?.attribution ?? 'This product uses the TMDB API but is not endorsed or certified by TMDB.'}
        </span>
        <a className="underline" href="https://github.com/lucasnardivieira/myMovie" target="_blank" rel="noreferrer">
          código no GitHub
        </a>
      </footer>
    </div>
  )
}
