import json
from datetime import UTC, datetime
from pathlib import Path

import httpx

from mymovie.catalog import AITags, BuildConfig, build_catalog, select_candidates, to_movie
from mymovie.tmdb import TMDBClient

FIXTURES = Path(__file__).parent / "fixtures"


def _details(movie_id: int, **overrides: object) -> dict:
    base = json.loads((FIXTURES / "details_550.json").read_text())
    base.update(id=movie_id, **overrides)
    return base


def test_to_movie_maps_fields_and_brazilian_providers() -> None:
    movie, providers = to_movie(_details(550), score=8.1234)
    assert movie.title == "Clube da Luta"
    assert movie.year == 1999
    assert movie.runtime == 139
    assert movie.genres == [18, 53]
    assert movie.score == 8.123
    assert movie.providers == [8]  # only BR, not US
    assert providers[8].name == "Netflix"
    assert movie.vibes == ["tense", "emotional"]
    assert movie.pitch is None


def test_to_movie_prefers_ai_tags() -> None:
    tags = AITags(vibes=["mind_bending"], pitch="Nada é o que parece.")
    movie, _ = to_movie(_details(550), score=8.0, tags=tags)
    assert movie.vibes == ["mind_bending"]
    assert movie.pitch == "Nada é o que parece."


def test_to_movie_truncates_long_overview_on_word_boundary() -> None:
    movie, _ = to_movie(_details(1, overview="palavra " * 100), score=7.0)
    assert len(movie.overview) <= 320
    assert movie.overview.endswith("…")


def test_select_candidates_dedupes_ranks_and_caps() -> None:
    discovered = [
        {"id": 1, "vote_average": 9.0, "vote_count": 50_000},
        {"id": 2, "vote_average": 5.0, "vote_count": 50_000},
        {"id": 3, "vote_average": 8.0, "vote_count": 40_000},
        {"id": 1, "vote_average": 9.0, "vote_count": 50_000},
    ]
    kept = select_candidates(discovered, BuildConfig(min_score=6.5, max_movies=1))
    assert [m["id"] for m in kept] == [1]


def _fake_tmdb(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("/genre/movie/list"):
        return httpx.Response(200, json={"genres": [{"id": 18, "name": "Drama"}]})
    if path.endswith("/discover/movie"):
        page = int(request.url.params["page"])
        results = {
            1: [{"id": 10, "vote_average": 8.5, "vote_count": 20_000}],
            2: [{"id": 20, "vote_average": 4.0, "vote_count": 20_000}],
        }[page]
        return httpx.Response(200, json={"page": page, "total_pages": 2, "results": results})
    movie_id = int(path.rsplit("/", 1)[1])
    lang = request.url.params["language"]
    if lang == "en-US":
        return httpx.Response(200, json={"overview": "English fallback overview."})
    return httpx.Response(200, json=_details(movie_id, overview=""))


def test_build_catalog_end_to_end_with_mocked_tmdb() -> None:
    client = TMDBClient("token", transport=httpx.MockTransport(_fake_tmdb))
    catalog = build_catalog(
        client,
        BuildConfig(min_score=6.0, workers=2),
        now=lambda: datetime(2026, 11, 8, tzinfo=UTC),
    )
    assert [m.id for m in catalog.movies] == [10]
    assert catalog.movies[0].overview == "English fallback overview."
    assert catalog.genres == {18: "Drama"}
    assert 8 in catalog.providers
    assert catalog.generated_at.startswith("2026-11-08")


def test_tmdb_client_retries_on_429(monkeypatch) -> None:
    monkeypatch.setattr("mymovie.tmdb.time.sleep", lambda _: None)
    calls = {"n": 0}

    def flaky(request: httpx.Request) -> httpx.Response:
        calls["n"] += 1
        if calls["n"] == 1:
            return httpx.Response(429, headers={"Retry-After": "1"})
        return httpx.Response(200, json={"genres": []})

    client = TMDBClient("token", transport=httpx.MockTransport(flaky))
    assert client.genres() == {}
    assert calls["n"] == 2
