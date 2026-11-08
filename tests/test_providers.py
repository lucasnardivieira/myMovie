import pytest

from mymovie.catalog import Movie, Provider
from mymovie.providers import canonical_name, merge_providers


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("Netflix Standard with Ads", "Netflix"),
        ("Amazon Prime Video with Ads", "Amazon Prime Video"),
        ("HBO Max Amazon Channel", "HBO Max"),
        ("Paramount+ Amazon Channel", "Paramount Plus"),
        ("Paramount Plus Premium", "Paramount Plus"),
        ("MGM+ Apple TV Channel", "MGM Plus"),
        ("Adrenalina Pura Apple TV channel", "Adrenalina Pura"),
        ("Apple TV", "Apple TV"),
        ("Globoplay", "Globoplay"),
    ],
)
def test_canonical_name(raw: str, expected: str) -> None:
    assert canonical_name(raw) == expected


def _movie(providers: list[int]) -> Movie:
    return Movie(
        id=1,
        title="x",
        original_title="x",
        year=2000,
        runtime=100,
        genres=[],
        rating=8,
        votes=1,
        score=8,
        poster=None,
        overview="",
        providers=providers,
        vibes=[],
    )


def test_merge_keeps_one_entry_per_service_preferring_the_plain_one() -> None:
    providers = {
        8: Provider(name="Netflix", logo="/nf.png"),
        1796: Provider(name="Netflix Standard with Ads", logo="/nf-ads.png"),
        1825: Provider(name="HBO Max Amazon Channel", logo="/hbo-amz.png"),
        1899: Provider(name="HBO Max", logo="/hbo.png"),
        2141: Provider(name="MGM Plus Amazon Channel"),
    }
    movie = _movie([1796, 8, 1825, 2141])
    merged = merge_providers([movie], providers)

    assert movie.providers == [8, 1899, 2141]
    assert {p.name for p in merged.values()} == {"Netflix", "HBO Max", "MGM Plus"}
    assert merged[1899].logo == "/hbo.png"
