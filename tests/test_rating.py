import pytest

from mymovie.rating import baseline, weighted_rating


def test_weighted_rating_pulls_low_vote_movies_towards_mean() -> None:
    c, m = 6.0, 1000
    few_votes = weighted_rating(9.5, 10, c, m)
    many_votes = weighted_rating(8.5, 100_000, c, m)
    assert few_votes < many_votes
    assert few_votes == pytest.approx(6.0347, abs=1e-3)


def test_weighted_rating_equals_average_when_m_is_zero() -> None:
    assert weighted_rating(7.3, 500, c=5.0, m=0) == pytest.approx(7.3)


def test_baseline_mean_and_percentile() -> None:
    c, m = baseline([6.0, 7.0, 8.0], [100, 200, 300])
    assert c == pytest.approx(7.0)
    assert 200 <= m <= 300


def test_baseline_rejects_mismatched_inputs() -> None:
    with pytest.raises(ValueError):
        baseline([7.0], [1, 2])
