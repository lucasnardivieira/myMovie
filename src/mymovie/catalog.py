"""Build the static catalog consumed by the web app."""

import logging
from collections.abc import Callable, Mapping
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel, Field

from mymovie.rating import baseline, weighted_rating
from mymovie.tmdb import TMDBClient
from mymovie.vibes import VIBES, heuristic_vibes

log = logging.getLogger(__name__)

OVERVIEW_MAX_CHARS = 320
WATCH_REGION = "BR"


class Provider(BaseModel):
    name: str
    logo: str | None = None


class Movie(BaseModel):
    id: int
    title: str
    original_title: str
    year: int | None
    runtime: int | None = Field(description="minutes")
    genres: list[int]
    rating: float = Field(description="TMDB vote average, 0–10")
    votes: int
    score: float = Field(description="weighted rating used for ranking")
    poster: str | None = Field(description="TMDB image path, e.g. /abc.jpg")
    overview: str
    providers: list[int] = Field(description="flatrate (subscription) providers in Brazil")
    vibes: list[str]
    pitch: str | None = None
    imdb_id: str | None = None


class Catalog(BaseModel):
    generated_at: str
    attribution: str = "This product uses the TMDB API but is not endorsed or certified by TMDB."
    genres: dict[int, str]
    vibes: dict[str, str]
    providers: dict[int, Provider]
    movies: list[Movie]


@dataclass(frozen=True)
class AITags:
    vibes: list[str]
    pitch: str


@dataclass(frozen=True)
class BuildConfig:
    min_votes: int = 500
    min_score: float = 6.5
    max_movies: int = 2000
    workers: int = 8


def select_candidates(discovered: list[dict[str, Any]], cfg: BuildConfig) -> list[dict[str, Any]]:
    """Dedupe, score with the weighted rating and keep the best ``cfg.max_movies``."""
    unique = list({m["id"]: m for m in discovered}.values())
    if not unique:
        return []
    c, m = baseline([x["vote_average"] for x in unique], [x["vote_count"] for x in unique])
    for movie in unique:
        movie["_score"] = weighted_rating(movie["vote_average"], movie["vote_count"], c, m)
    kept = [x for x in unique if x["_score"] >= cfg.min_score]
    kept.sort(key=lambda x: x["_score"], reverse=True)
    log.info("C=%.2f m=%.0f — kept %d of %d", c, m, min(len(kept), cfg.max_movies), len(unique))
    return kept[: cfg.max_movies]


def _year(release_date: str | None) -> int | None:
    return int(release_date[:4]) if release_date and release_date[:4].isdigit() else None


def _truncate(text: str, limit: int = OVERVIEW_MAX_CHARS) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rsplit(" ", 1)[0].rstrip(",.;:") + "…"


def to_movie(
    details: dict[str, Any], score: float, tags: AITags | None = None
) -> tuple[Movie, dict[int, Provider]]:
    """Map a TMDB details payload (with appended watch/providers) to a catalog movie."""
    region = details.get("watch/providers", {}).get("results", {}).get(WATCH_REGION, {})
    flatrate = region.get("flatrate", [])
    providers = {
        p["provider_id"]: Provider(name=p["provider_name"], logo=p.get("logo_path"))
        for p in flatrate
    }
    genre_ids = [g["id"] for g in details.get("genres", [])]
    movie = Movie(
        id=details["id"],
        title=details.get("title") or details.get("original_title") or "",
        original_title=details.get("original_title") or "",
        year=_year(details.get("release_date")),
        runtime=details.get("runtime") or None,
        genres=genre_ids,
        rating=round(details.get("vote_average", 0.0), 1),
        votes=details.get("vote_count", 0),
        score=round(score, 3),
        poster=details.get("poster_path"),
        overview=_truncate(details.get("overview") or ""),
        providers=list(providers),
        vibes=tags.vibes if tags else heuristic_vibes(genre_ids),
        pitch=tags.pitch if tags else None,
        imdb_id=details.get("imdb_id") or None,
    )
    return movie, providers


def build_catalog(
    client: TMDBClient,
    cfg: BuildConfig | None = None,
    tags: Mapping[int, AITags] | None = None,
    now: Callable[[], datetime] = lambda: datetime.now(UTC),
) -> Catalog:
    cfg = cfg or BuildConfig()
    tags = tags or {}
    genres = client.genres()
    candidates = select_candidates(client.discover_all(cfg.min_votes), cfg)

    def fetch(candidate: dict[str, Any]) -> dict[str, Any]:
        details = client.details(candidate["id"])
        if not details.get("overview"):
            details["overview"] = client.overview(candidate["id"], "en-US")
        return details

    with ThreadPoolExecutor(max_workers=cfg.workers) as pool:
        all_details = list(pool.map(fetch, candidates))

    movies: list[Movie] = []
    providers: dict[int, Provider] = {}
    for candidate, details in zip(candidates, all_details, strict=True):
        movie, found = to_movie(details, candidate["_score"], tags.get(candidate["id"]))
        movies.append(movie)
        providers.update(found)

    return Catalog(
        generated_at=now().isoformat(timespec="seconds"),
        genres=genres,
        vibes=VIBES,
        providers=providers,
        movies=movies,
    )
