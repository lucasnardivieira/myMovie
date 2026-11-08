"""Command line entry point: ``uv run mymovie build --out web/public/data/catalog.json``."""

import argparse
import logging
import os
import sys
from pathlib import Path

from mymovie.catalog import BuildConfig, build_catalog
from mymovie.tmdb import TMDBClient

DEFAULT_OUT = Path("web/public/data/catalog.json")
DEFAULT_TAGS = Path("data/ai_tags.json")


def _build(args: argparse.Namespace) -> None:
    from mymovie.ai_tags import load_tags

    token = os.environ.get("TMDB_API_TOKEN")
    if not token:
        sys.exit("TMDB_API_TOKEN is not set (see .env.example)")
    cfg = BuildConfig(
        min_votes=args.min_votes, min_score=args.min_score, max_movies=args.max_movies
    )
    with TMDBClient(token) as client:
        catalog = build_catalog(client, cfg, tags=load_tags(args.tags))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(catalog.model_dump_json(exclude_none=True), encoding="utf-8")
    print(f"Wrote {len(catalog.movies):,} movies to {args.out}")


def _tag(args: argparse.Namespace) -> None:
    from mymovie.ai_tags import tag_catalog

    tag_catalog(args.catalog, args.tags, limit=args.limit)


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    parser = argparse.ArgumentParser(prog="mymovie")
    sub = parser.add_subparsers(required=True)

    build = sub.add_parser("build", help="fetch TMDB and write the catalog JSON")
    build.add_argument("--out", type=Path, default=DEFAULT_OUT)
    build.add_argument("--tags", type=Path, default=DEFAULT_TAGS, help="AI tags cache")
    build.add_argument("--min-votes", type=int, default=BuildConfig.min_votes)
    build.add_argument("--min-score", type=float, default=BuildConfig.min_score)
    build.add_argument("--max-movies", type=int, default=BuildConfig.max_movies)
    build.set_defaults(func=_build)

    tag = sub.add_parser("tag", help="tag untagged catalog movies with Claude (Batch API)")
    tag.add_argument("--catalog", type=Path, default=DEFAULT_OUT)
    tag.add_argument("--tags", type=Path, default=DEFAULT_TAGS)
    tag.add_argument("--limit", type=int, default=None, help="tag at most N movies")
    tag.set_defaults(func=_tag)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
