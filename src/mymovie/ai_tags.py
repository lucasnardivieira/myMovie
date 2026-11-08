"""Tag movies with vibes and a one-line PT-BR pitch using Claude (Message Batches API).

Tags are cached in ``data/ai_tags.json`` (committed), so each movie is only tagged once and
weekly rebuilds only pay for movies that are new to the catalog.
"""

import json
import logging
import time
from pathlib import Path
from typing import Any

from mymovie.catalog import AITags
from mymovie.vibes import VIBES

log = logging.getLogger(__name__)

MODEL = "claude-haiku-5-5"
MAX_VIBES = 3
PITCH_MAX_CHARS = 140

SYSTEM_PROMPT = f"""You help a couple in Brazil choose a movie for tonight.
Given a movie's metadata, return:
- "vibes": the 1 to {MAX_VIBES} moods that best describe how watching it feels,
  most fitting first.
  Allowed values and their meaning (Brazilian Portuguese labels shown to users):
{chr(10).join(f"  - {key}: {label}" for key, label in VIBES.items())}
- "pitch": one catchy sentence in Brazilian Portuguese (max {PITCH_MAX_CHARS} characters) that
  makes someone want to watch it, without spoilers and without repeating the title.
Judge the experience of watching, not just the genre: a dark comedy is not "light"."""

OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "vibes": {"type": "array", "items": {"type": "string", "enum": list(VIBES)}},
        "pitch": {"type": "string"},
    },
    "required": ["vibes", "pitch"],
    "additionalProperties": False,
}


def load_tags(path: Path) -> dict[int, AITags]:
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {int(k): AITags(vibes=v["vibes"], pitch=v["pitch"]) for k, v in raw.items()}


def save_tags(path: Path, tags: dict[int, AITags]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {str(k): {"vibes": t.vibes, "pitch": t.pitch} for k, t in sorted(tags.items())}
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def movie_prompt(movie: dict[str, Any], genre_names: dict[str, str]) -> str:
    genres = ", ".join(genre_names.get(str(g), str(g)) for g in movie.get("genres", []))
    return (
        f"Title: {movie['title']} (original: {movie.get('original_title', '')})\n"
        f"Year: {movie.get('year')}\nGenres: {genres}\n"
        f"Overview: {movie.get('overview', '')}"
    )


def build_request(movie: dict[str, Any], genre_names: dict[str, str]) -> dict[str, Any]:
    """One Message Batches request (plain dict, same shape as the SDK's ``Request``)."""
    return {
        "custom_id": f"movie-{movie['id']}",
        "params": {
            "model": MODEL,
            # Haiku 5.5 thinks by default and thinking counts toward max_tokens
            "max_tokens": 1024,
            "output_config": {
                "effort": "low",
                "format": {"type": "json_schema", "schema": OUTPUT_SCHEMA},
            },
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": movie_prompt(movie, genre_names)}],
        },
    }


def parse_output(text: str) -> AITags:
    """Validate and normalize the model's JSON (dedupe, cap vibes, trim pitch)."""
    data = json.loads(text)
    vibes: list[str] = []
    for vibe in data["vibes"]:
        if vibe in VIBES and vibe not in vibes:
            vibes.append(vibe)
    if not vibes:
        raise ValueError(f"no valid vibes in {data['vibes']!r}")
    pitch = " ".join(data["pitch"].split())
    if len(pitch) > PITCH_MAX_CHARS:
        pitch = pitch[: PITCH_MAX_CHARS - 1].rsplit(" ", 1)[0] + "…"
    return AITags(vibes=vibes[:MAX_VIBES], pitch=pitch)


def apply_tags(catalog: dict[str, Any], tags: dict[int, AITags]) -> int:
    """Overwrite vibes/pitch of catalog movies that have tags. Returns how many changed."""
    applied = 0
    for movie in catalog["movies"]:
        tag = tags.get(movie["id"])
        if tag:
            movie["vibes"], movie["pitch"] = tag.vibes, tag.pitch
            applied += 1
    return applied


def run_batch(
    client: Any, requests: list[dict[str, Any]], poll_seconds: int = 30
) -> dict[int, AITags]:
    batch = client.messages.batches.create(requests=requests)
    log.info("Created batch %s with %d requests", batch.id, len(requests))
    while batch.processing_status != "ended":
        time.sleep(poll_seconds)
        batch = client.messages.batches.retrieve(batch.id)
        log.info("Batch %s: %s", batch.id, batch.processing_status)

    tags: dict[int, AITags] = {}
    for result in client.messages.batches.results(batch.id):
        movie_id = int(result.custom_id.removeprefix("movie-"))
        if result.result.type != "succeeded":
            log.warning("movie %s: %s", movie_id, result.result.type)
            continue
        message = result.result.message
        if message.stop_reason != "end_turn":
            log.warning("movie %s: stop_reason=%s", movie_id, message.stop_reason)
            continue
        text = next((b.text for b in message.content if b.type == "text"), "")
        try:
            tags[movie_id] = parse_output(text)
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            log.warning("movie %s: invalid output (%s)", movie_id, exc)
    return tags


def tag_catalog(
    catalog_path: Path, tags_path: Path, limit: int | None = None, client: Any = None
) -> None:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    tags = load_tags(tags_path)
    pending = [m for m in catalog["movies"] if m["id"] not in tags][:limit]
    if pending:
        if client is None:
            import anthropic

            client = anthropic.Anthropic()
        requests = [build_request(m, catalog["genres"]) for m in pending]
        new = run_batch(client, requests)
        tags.update(new)
        save_tags(tags_path, tags)
        print(f"Tagged {len(new)} of {len(pending)} new movies")
    else:
        print("All movies already tagged")
    applied = apply_tags(catalog, tags)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False), encoding="utf-8")
    print(f"Applied tags to {applied} movies in {catalog_path}")
