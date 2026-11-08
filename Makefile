.PHONY: setup lint format test catalog tag sample dev build

setup:  ## install Python and web dependencies
	uv sync
	cd web && npm install

lint:
	uv run ruff check .
	uv run ruff format --check .
	cd web && npm run lint && npm run typecheck

format:
	uv run ruff check --fix .
	uv run ruff format .

test:
	uv run pytest
	cd web && npm test

catalog:  ## fetch TMDB → web/public/data/catalog.json (needs TMDB_API_TOKEN in .env)
	uv run --env-file .env mymovie build

tag:  ## tag new movies with Claude (needs ANTHROPIC_API_KEY in .env)
	uv run --env-file .env mymovie tag

sample:  ## regenerate the sample catalog used without a TMDB token
	uv run python scripts/make_sample_catalog.py

dev:  ## web app with hot reload at http://localhost:5173
	cd web && npm run dev

build:
	cd web && npm run build
