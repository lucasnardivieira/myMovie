"""Download the TMDB movies dataset from Kaggle and build dataset/movies-V1.0.csv.

Reproduces the cleaning steps of dataset/exploring_dataset.ipynb so the
42 MB CSV doesn't need to live in git.

Usage:
    uv run --env-file .env python scripts/prepare_dataset.py
    uv run python scripts/prepare_dataset.py --source path/to/TMDB_movie_dataset_v11.csv
"""

import argparse
import re
from pathlib import Path

import pandas as pd

KAGGLE_DATASET = "asaniczka/tmdb-movies-dataset-2023-930k-movies"
RAW_GLOB = "TMDB_movie_dataset_v*.csv"
OUTPUT = Path(__file__).resolve().parent.parent / "dataset" / "movies-V1.0.csv"

COLUMNS = ["title", "vote_average", "vote_count", "release_date", "imdb_id", "genres", "keywords"]


def download_raw() -> Path:
    import kagglehub

    folder = Path(kagglehub.dataset_download(KAGGLE_DATASET))
    matches = sorted(folder.glob(RAW_GLOB))
    if not matches:
        raise FileNotFoundError(f"No {RAW_GLOB} in {folder}")
    return matches[-1]


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df[COLUMNS].dropna(subset=["title", "genres"])
    df = df.sort_values(by="title", ascending=True)
    df = df[df["imdb_id"].notnull()].copy()
    df["title"] = df["title"].apply(
        lambda x: re.sub(r"[^a-zA-Z0-9 ]", "", x).lower() if isinstance(x, str) else x
    )
    df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce")
    df["genres"] = df["genres"].fillna("").apply(lambda x: x.split(",") if x else [])
    df["keywords"] = df["keywords"].fillna("").apply(lambda x: x.split(",") if x else [])
    df["imdb_id"] = df["imdb_id"].fillna("")
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, help="local raw CSV (skips the Kaggle download)")
    args = parser.parse_args()

    raw = args.source or download_raw()
    print(f"Reading {raw}")
    movies = clean(pd.read_csv(raw, low_memory=False))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    movies.to_csv(OUTPUT, index=False)
    print(f"Wrote {len(movies):,} movies to {OUTPUT}")


if __name__ == "__main__":
    main()
