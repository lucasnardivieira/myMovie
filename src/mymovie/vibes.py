"""Vibes: the 'mood' vocabulary the web app filters on.

Every movie gets heuristic vibes from its TMDB genres. When AI tags exist (see ``ai_tags``),
they replace the heuristic ones.
"""

VIBES: dict[str, str] = {
    "light": "Leve",
    "funny": "Engraçado",
    "feel_good": "Pra sair feliz",
    "romantic": "Romântico",
    "cozy": "Aconchegante",
    "tense": "Tenso",
    "scary": "Assustador",
    "mind_bending": "Dá nó na cabeça",
    "emotional": "Pra chorar",
    "thought_provoking": "Reflexivo",
    "epic": "Épico",
    "action_packed": "Adrenalina",
}

# TMDB movie genre ids → vibes
GENRE_VIBES: dict[int, tuple[str, ...]] = {
    28: ("action_packed",),  # Action
    12: ("epic", "action_packed"),  # Adventure
    16: ("cozy", "light"),  # Animation
    35: ("funny", "light"),  # Comedy
    80: ("tense",),  # Crime
    99: ("thought_provoking",),  # Documentary
    18: ("emotional",),  # Drama
    10751: ("cozy", "feel_good"),  # Family
    14: ("epic",),  # Fantasy
    36: ("thought_provoking",),  # History
    27: ("scary", "tense"),  # Horror
    10402: ("feel_good",),  # Music
    9648: ("mind_bending", "tense"),  # Mystery
    10749: ("romantic",),  # Romance
    878: ("mind_bending",),  # Science Fiction
    53: ("tense",),  # Thriller
    10752: ("epic", "emotional"),  # War
    37: ("epic",),  # Western
}


def heuristic_vibes(genre_ids: list[int]) -> list[str]:
    """Union of the vibes of each genre, in VIBES order."""
    found = {vibe for gid in genre_ids for vibe in GENRE_VIBES.get(gid, ())}
    return [vibe for vibe in VIBES if vibe in found]
