import { describe, expect, it } from 'vitest'
import type { Movie } from '../types'
import { EMPTY_FILTERS, buildDeck, computeMatches, filterMovies, matchesFilters } from './deck'

const movie = (id: number, over: Partial<Movie> = {}): Movie => ({
  id,
  title: `Filme ${id}`,
  original_title: `Movie ${id}`,
  year: 2005,
  runtime: 110,
  genres: [18],
  rating: 8,
  votes: 10_000,
  score: 8 - id / 1000,
  poster: null,
  overview: '',
  providers: [],
  vibes: ['emotional'],
  ...over,
})

describe('filters', () => {
  it('accepts everything with empty filters', () => {
    expect(matchesFilters(movie(1), EMPTY_FILTERS)).toBe(true)
  })

  it('applies vibes, genres, runtime and era together', () => {
    const f = { vibes: ['funny'], include: [35], exclude: [27], maxRuntime: 100, era: 'recent' as const }
    expect(matchesFilters(movie(1, { vibes: ['funny'], genres: [35], runtime: 95, year: 2015 }), f)).toBe(true)
    expect(matchesFilters(movie(2, { vibes: ['funny'], genres: [35, 27], runtime: 95, year: 2015 }), f)).toBe(false)
    expect(matchesFilters(movie(3, { vibes: ['funny'], genres: [35], runtime: 130, year: 2015 }), f)).toBe(false)
    expect(matchesFilters(movie(4, { vibes: ['funny'], genres: [35], runtime: 95, year: 1999 }), f)).toBe(false)
    expect(matchesFilters(movie(5, { vibes: ['tense'], genres: [35], runtime: 95, year: 2015 }), f)).toBe(false)
  })

  it('treats unknown runtime as not fitting a runtime limit', () => {
    expect(matchesFilters(movie(1, { runtime: null }), { ...EMPTY_FILTERS, maxRuntime: 120 })).toBe(false)
  })

  it('hides movies already seen', () => {
    expect(filterMovies([movie(1), movie(2)], EMPTY_FILTERS, new Set([1])).map((m) => m.id)).toEqual([2])
  })
})

describe('buildDeck', () => {
  const movies = Array.from({ length: 100 }, (_, i) => movie(i + 1))

  it('is deterministic for a seed and varies across seeds', () => {
    const a = buildDeck(movies, 42).map((m) => m.id)
    expect(buildDeck(movies, 42).map((m) => m.id)).toEqual(a)
    expect(buildDeck(movies, 43).map((m) => m.id)).not.toEqual(a)
  })

  it('draws only from the 60 best-rated movies, without duplicates', () => {
    const deck = buildDeck(movies, 7)
    expect(deck).toHaveLength(20)
    expect(new Set(deck.map((m) => m.id)).size).toBe(20)
    expect(deck.every((m) => m.id <= 60)).toBe(true)
  })

  it('returns fewer cards when few movies match', () => {
    expect(buildDeck(movies.slice(0, 5), 1)).toHaveLength(5)
  })
})

describe('computeMatches', () => {
  it('keeps movies both liked, best score first', () => {
    const movies = [movie(1), movie(2), movie(3)]
    expect(computeMatches(movies, [3, 1, 2], [3, 1]).map((m) => m.id)).toEqual([1, 3])
    expect(computeMatches(movies, [1], [2])).toEqual([])
  })
})
