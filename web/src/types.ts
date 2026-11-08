/** Mirrors the Python `Catalog` model (src/mymovie/catalog.py). */
export interface Movie {
  id: number
  title: string
  original_title: string
  year: number | null
  runtime: number | null
  genres: number[]
  rating: number
  votes: number
  score: number
  poster: string | null
  overview: string
  providers: number[]
  vibes: string[]
  pitch?: string
  imdb_id?: string
}

export interface Provider {
  name: string
  logo?: string | null
}

export interface Catalog {
  generated_at: string
  attribution: string
  sample?: boolean
  genres: Record<string, string>
  vibes: Record<string, string>
  providers: Record<string, Provider>
  movies: Movie[]
}
