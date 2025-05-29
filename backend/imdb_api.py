import http.client
import json


def get_imdb_info(imdb_id):
    """
    Consulta o campo 'short' da API IMDb fake.

    Args:
        imdb_id (str): ID do filme no IMDb (ex.: 'tt0120338').

    Returns:
        str: Descrição curta do filme ou None se falhar.
    """

    conn = http.client.HTTPSConnection("imdb.iamidiotareyoutoo.com")

    try:
        endpoint = f"/search?tt={imdb_id}"
        conn.request("GET", endpoint)
        res = conn.getresponse()

        if res.status != 200:
            print(f"Erro na requisição: {res.status} {res.reason}")
            return None

        data = res.read()
        decoded = data.decode("utf-8")
        parsed = json.loads(decoded)

        # 🏹 Extrair o campo 'short' se existir
        short_description = parsed.get('short')

        if short_description is None:
            print(f"Campo 'short' não encontrado para {imdb_id}")
            return None

        return short_description

    except Exception as e:
        print(f"Erro na API IMDb: {e}")
        return None

    finally:
        conn.close()
