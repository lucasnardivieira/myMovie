from mymovie.vibes import VIBES, heuristic_vibes


def test_heuristic_vibes_union_in_canonical_order() -> None:
    # Comedy + Romance
    assert heuristic_vibes([10749, 35]) == ["light", "funny", "romantic"]


def test_unknown_genre_yields_no_vibes() -> None:
    assert heuristic_vibes([999999]) == []


def test_every_vibe_has_a_portuguese_label() -> None:
    assert all(label.strip() for label in VIBES.values())
