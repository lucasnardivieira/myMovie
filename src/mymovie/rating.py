"""IMDb-style weighted rating, so titles with few votes don't top the ranking."""

from collections.abc import Sequence
from statistics import fmean, quantiles


def baseline(
    averages: Sequence[float], counts: Sequence[int], percentile: int = 70
) -> tuple[float, float]:
    """Return (C, m): the mean vote across movies and the vote-count percentile threshold."""
    if not averages or len(averages) != len(counts):
        raise ValueError("averages and counts must be non-empty and the same length")
    c = fmean(averages)
    if len(counts) == 1:
        return c, float(counts[0])
    # quantiles(n=100) returns the 99 cut points; index p-1 is the p-th percentile
    m = quantiles(counts, n=100, method="inclusive")[percentile - 1]
    return c, m


def weighted_rating(average: float, count: int, c: float, m: float) -> float:
    """WR = v/(v+m)·R + m/(v+m)·C."""
    if count + m == 0:
        return c
    return count / (count + m) * average + m / (count + m) * c
