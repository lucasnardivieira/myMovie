# 1. TMDB catalog + static site with link-based couple match

Date: 2026-11-08

## Status
Accepted

## Context
v1 ranked a static 2024 Kaggle dump by genre in a CLI script and enriched results through an unofficial,
community-run IMDb API that was often slow or down. v2 is an app two people use on their phones to agree
on a movie, so it needs posters, PT-BR text, a nice UI, current data, and zero hosting cost.

## Decision
- **Data:** the official TMDB API (free for non-commercial use, with attribution). It provides PT-BR titles and
  overviews, posters, runtime and Brazilian watch providers. Movies are ranked with the IMDb weighted rating
  as before.
- **AI:** Claude Haiku 5.5 tags each movie with "vibes" and a one-line pitch through the Message Batches
  API (50% cheaper, asynchronous) with structured outputs. Tags are cached in git (`data/ai_tags.json`), so
  weekly rebuilds only pay for new movies.
- **Serving:** a static catalog JSON plus a React app on GitHub Pages, rebuilt weekly by GitHub Actions. No backend.
- **Couple match without a server:** the first person's deck and likes travel in the invite link's URL hash.
  The partner swipes the same deck and the intersection is computed in the browser.

## Consequences
- \+ Free hosting, nothing to operate, and the API keys never reach the browser.
- \+ Invite links work even if the weekly catalog changes, because they carry movie ids.
- − No shared history between devices. "Already watched" lives in each phone's localStorage.
- − Natural-language requests ("something like Amélie") would need a backend; deferred.
