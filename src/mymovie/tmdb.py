"""Minimal TMDB v3 client (https://developer.themoviedb.org/reference)."""

import time
from typing import Any

import httpx

BASE_URL = "https://api.themoviedb.org/3"
RETRY_STATUSES = {429, 500, 502, 503, 504}


class TMDBClient:
    def __init__(
        self,
        token: str,
        *,
        language: str = "pt-BR",
        transport: httpx.BaseTransport | None = None,
        max_retries: int = 4,
    ) -> None:
        self.language = language
        self.max_retries = max_retries
        self._http = httpx.Client(
            base_url=BASE_URL,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=20,
            transport=transport,
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "TMDBClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def _get(self, path: str, **params: Any) -> dict[str, Any]:
        for attempt in range(self.max_retries + 1):
            resp = self._http.get(path, params=params)
            if resp.status_code not in RETRY_STATUSES or attempt == self.max_retries:
                resp.raise_for_status()
                return resp.json()
            wait = float(resp.headers.get("Retry-After", 2**attempt))
            time.sleep(min(wait, 30))
        raise RuntimeError("unreachable")

    def genres(self) -> dict[int, str]:
        data = self._get("/genre/movie/list", language=self.language)
        return {g["id"]: g["name"] for g in data["genres"]}

    def discover_page(self, page: int, min_votes: int) -> dict[str, Any]:
        return self._get(
            "/discover/movie",
            language=self.language,
            sort_by="vote_count.desc",
            include_adult="false",
            include_video="false",
            **{"vote_count.gte": min_votes},
            page=page,
        )

    def discover_all(self, min_votes: int, max_pages: int = 500) -> list[dict[str, Any]]:
        """All movies with at least ``min_votes`` votes (TMDB caps discover at 500 pages)."""
        first = self.discover_page(1, min_votes)
        results = list(first["results"])
        last = min(first.get("total_pages", 1), max_pages)
        for page in range(2, last + 1):
            results.extend(self.discover_page(page, min_votes)["results"])
        return results

    def details(self, movie_id: int) -> dict[str, Any]:
        """Movie details plus Brazilian watch providers and keywords."""
        return self._get(
            f"/movie/{movie_id}",
            language=self.language,
            append_to_response="watch/providers,keywords",
        )

    def overview(self, movie_id: int, language: str) -> str:
        return self._get(f"/movie/{movie_id}", language=language).get("overview") or ""
