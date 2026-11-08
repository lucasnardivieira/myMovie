"""Collapse TMDB watch-provider variants into one entry per streaming service.

TMDB lists ad tiers and store channels as separate providers ("Netflix Standard with Ads",
"HBO Max Amazon Channel", "MGM+ Apple TV Channel"). Users only care about the service.
"""

import re
from collections.abc import Iterable

from mymovie.catalog import Movie, Provider

_SUFFIXES = re.compile(
    r"\s+(?:standard with ads|with ads|amazon channel|apple tv channel|premium)$", re.IGNORECASE
)
_ALIASES = {"paramount+": "Paramount Plus", "mgm+": "MGM Plus", "disney+": "Disney Plus"}


def canonical_name(name: str) -> str:
    previous = None
    while previous != name:
        previous, name = name, _SUFFIXES.sub("", name).strip()
    return _ALIASES.get(name.lower(), name)


def merge_providers(movies: Iterable[Movie], providers: dict[int, Provider]) -> dict[int, Provider]:
    """Remap every movie to one provider id per service (in place) and return the merged table.

    The representative id is the provider whose own name is already canonical (the plain
    service); otherwise the lowest id.
    """
    by_name: dict[str, int] = {}
    for pid in sorted(providers):
        name = canonical_name(providers[pid].name)
        current = by_name.get(name)
        if current is None or (providers[pid].name == name and providers[current].name != name):
            by_name[name] = pid
    remap = {pid: by_name[canonical_name(p.name)] for pid, p in providers.items()}

    for movie in movies:
        movie.providers = list(dict.fromkeys(remap.get(pid, pid) for pid in movie.providers))

    return {pid: Provider(name=name, logo=providers[pid].logo) for name, pid in by_name.items()}
