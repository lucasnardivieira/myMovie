from imdb_api import get_imdb_info
import pandas as pd

# ===============================
# Carregar dataset e recomendações
# ===============================
movieDataset = "C:\\Users\\lucas\\Documents\\myMovie\\dataset\\movies-V1.0.csv"
df = pd.read_csv(movieDataset)

C = df['vote_average'].mean()
m = df['vote_count'].quantile(0.70)


def weighted_rating(x, m=m, C=C):
    v = x['vote_count']
    R = x['vote_average']
    return (v / (v + m) * R) + (m / (v + m) * C)


def recomendar_filmes(generos_incluir, generos_excluir=None, top_n=10):
    if generos_excluir is None:
        generos_excluir = []

    filtrados = df[df['genres'].apply(lambda x: any(genre in x for genre in generos_incluir))]

    if generos_excluir:
        filtrados = filtrados[~filtrados['genres'].apply(lambda x: any(genre in x for genre in generos_excluir))]

    filtrados = filtrados.copy()
    filtrados['score'] = filtrados.apply(weighted_rating, axis=1)

    recomendados = filtrados.sort_values(by='score', ascending=False).head(top_n)

    return recomendados[['title', 'vote_average', 'vote_count', 'genres', 'imdb_id', 'score']]


# ===============================
# Buscar informações adicionais
# ===============================
generos_incluir = ['Action', 'Science Fiction']
generos_excluir = ['Horror', 'Romance', 'Fantasy']

recomendados = recomendar_filmes(generos_incluir, generos_excluir, top_n=3)

for _, row in recomendados.iterrows():
    print(" - - - - - - - - - - - - - - - - - - -")
    imdb_id = row['imdb_id']
    info = get_imdb_info(imdb_id)
    print(f"\nFilme: {row['title']}")
    print(f"Informações da API: {info}")
