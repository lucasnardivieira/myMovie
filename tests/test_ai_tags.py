import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from mymovie.ai_tags import (
    MAX_VIBES,
    OUTPUT_SCHEMA,
    build_request,
    load_tags,
    parse_output,
    save_tags,
    tag_catalog,
)
from mymovie.catalog import AITags
from mymovie.vibes import VIBES


def test_parse_output_dedupes_filters_and_caps() -> None:
    text = json.dumps(
        {"vibes": ["tense", "tense", "bogus", "scary", "epic", "funny"], "pitch": " Oi  "}
    )
    tags = parse_output(text)
    assert tags.vibes == ["tense", "scary", "epic"][:MAX_VIBES]
    assert tags.pitch == "Oi"


def test_parse_output_rejects_no_valid_vibes() -> None:
    with pytest.raises(ValueError):
        parse_output(json.dumps({"vibes": ["bogus"], "pitch": "x"}))


def test_parse_output_trims_long_pitch() -> None:
    tags = parse_output(json.dumps({"vibes": ["epic"], "pitch": "muito " * 50}))
    assert len(tags.pitch) <= 140


def test_schema_enum_matches_vibes() -> None:
    assert OUTPUT_SCHEMA["properties"]["vibes"]["items"]["enum"] == list(VIBES)


def test_build_request_shape() -> None:
    movie = {
        "id": 7,
        "title": "Filme",
        "original_title": "Movie",
        "year": 2000,
        "genres": [18],
        "overview": "x",
    }
    req = build_request(movie, {"18": "Drama"})
    assert req["custom_id"] == "movie-7"
    assert req["params"]["model"] == "claude-haiku-5-5"
    assert req["params"]["output_config"]["format"]["type"] == "json_schema"
    assert "Genres: Drama" in req["params"]["messages"][0]["content"]


def test_tags_roundtrip(tmp_path: Path) -> None:
    path = tmp_path / "tags.json"
    save_tags(path, {2: AITags(["cozy"], "b"), 1: AITags(["epic"], "a")})
    assert load_tags(path) == {1: AITags(["epic"], "a"), 2: AITags(["cozy"], "b")}
    assert load_tags(tmp_path / "missing.json") == {}


class FakeBatches:
    """Stands in for client.messages.batches with recorded-style results."""

    def __init__(self) -> None:
        self.created: list[dict] = []

    def create(self, requests: list[dict]) -> SimpleNamespace:
        self.created = requests
        return SimpleNamespace(id="batch_1", processing_status="in_progress")

    def retrieve(self, batch_id: str) -> SimpleNamespace:
        return SimpleNamespace(id=batch_id, processing_status="ended")

    def results(self, batch_id: str):
        for req in self.created:
            payload = json.dumps({"vibes": ["cozy"], "pitch": f"Pitch {req['custom_id']}"})
            message = SimpleNamespace(
                stop_reason="end_turn", content=[SimpleNamespace(type="text", text=payload)]
            )
            yield SimpleNamespace(
                custom_id=req["custom_id"],
                result=SimpleNamespace(type="succeeded", message=message),
            )


def test_tag_catalog_only_tags_new_movies_and_applies(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr("mymovie.ai_tags.time.sleep", lambda _: None)
    catalog_path = tmp_path / "catalog.json"
    tags_path = tmp_path / "tags.json"
    movies = [
        {"id": i, "title": f"M{i}", "genres": [], "vibes": ["epic"], "overview": ""} for i in (1, 2)
    ]
    catalog_path.write_text(json.dumps({"genres": {}, "movies": movies}))
    save_tags(tags_path, {1: AITags(["funny"], "já tinha")})

    batches = FakeBatches()
    client = SimpleNamespace(messages=SimpleNamespace(batches=batches))
    tag_catalog(catalog_path, tags_path, client=client)

    assert [r["custom_id"] for r in batches.created] == ["movie-2"]
    result = json.loads(catalog_path.read_text())
    assert result["movies"][0]["vibes"] == ["funny"]
    assert result["movies"][1]["pitch"] == "Pitch movie-2"
