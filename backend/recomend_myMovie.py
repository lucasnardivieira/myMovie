import pandas as pd
import os
print("Diretório atual:", os.getcwd())

script_dir = os.path.dirname(os.path.abspath(__file__))
movieDataset = "C:\\Users\\lucas\\Documents\\myMovie\\dataset\\movies-V1.0.csv"

# Carrega o dataset
df = pd.read_csv(movieDataset)

# Converter genres para listas, se estiverem como string
# df['genres'] = df['genres'].apply(eval)

# Cálculo dos parâmetros globais
C = df['vote_average'].mean()
m = df['vote_count'].quantile(0.70)  # Top 30% mais votados

def weighted_rating(x, m=m, C=C):
    v = x['vote_count']
    R = x['vote_average']
    return (v / (v + m) * R) + (m / (v + m) * C)

# Função de recomendação com filtro positivo e negativo
def recomendar_filmes(generos_incluir, generos_excluir=None, top_n=10):
    if generos_excluir is None:
        generos_excluir = []

    # Filtrar pelos gêneros que o usuário quer incluir
    filtrados = df[df['genres'].apply(lambda x: any(genre in x for genre in generos_incluir))]
    
    # Remover filmes que contenham gêneros indesejados
    if generos_excluir:
        filtrados = filtrados[~filtrados['genres'].apply(lambda x: any(genre in x for genre in generos_excluir))]
    
    # Calcular o score ponderado
    filtrados = filtrados.copy()
    filtrados['score'] = filtrados.apply(weighted_rating, axis=1)
    
    # Ordenar pelo score e retornar os top_n
    recomendados = filtrados.sort_values(by='score', ascending=False).head(top_n)
    
    return recomendados[['title', 'vote_average', 'vote_count', 'genres', 'score']]

# ✅ Exemplo de uso
generos_incluir = ['Action', 'Science Fiction']
generos_excluir = ['Horror', 'Romance', 'Fantasy']

print(recomendar_filmes(generos_incluir, generos_excluir, top_n=20))