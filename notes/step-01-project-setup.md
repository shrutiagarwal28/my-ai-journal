# Step 1 Learning Notes — Django Project Setup

**Concepts covered:** Dependency isolation, Django project vs app structure, environment-driven config, AUTH_USER_MODEL, migrations

---

## Decision Breakdown

### Patterns used

**Django app-per-domain**
Analogous to bounded contexts in Domain-Driven Design. Each app (`entries`, `habits`, `users`) owns its own models, views, migrations, and tests. The project (`daylog/`) is pure router + config. This separation means you can open `entries/` and understand that domain completely without reading anything else.

**Environment-driven config (12-factor app)**
`settings.py` has zero hardcoded values. Every deployment environment (local, staging, production) provides its own `.env`. The same codebase runs everywhere without modification. If you ever need to rotate the secret key or switch databases, you change one environment variable — no code change, no redeploy.

**AUTH_USER_MODEL declared at project creation**
This is a temporal constraint, not a design choice. Django's migration system builds a dependency graph; once `auth`'s migrations reference your user table, you can never change which table that is without resetting the DB. Setting it on day one costs nothing. Changing it on day 100 costs everything.

---

### What a senior engineer would push back on

- **"Your ALLOWED_HOSTS is hardcoded."** — `["localhost", "127.0.0.1"]` is fine locally, but in production you want this driven from an env var too (e.g. `ALLOWED_HOSTS=api.daylog.app`). Fix at deploy time.

- **"You're using SQLite."** — Fine for dev, but SQLite doesn't support concurrent writes. A single request that writes while another writes will cause `OperationalError: database is locked`. For a multi-user app in production, this matters. Switch to Postgres before deploy.

- **"`BLACKLIST_AFTER_ROTATION = False` in JWT config"** — Turned off because it requires an extra installed app and a DB table. Acceptable for a portfolio project. In production, enable it so stolen refresh tokens can be invalidated server-side.

---

### Edge cases this setup handles

- **CORS misconfiguration:** `CORS_ALLOWED_ORIGINS` is parsed from a comma-separated env var, so you can add multiple origins in production without a code change.
- **JWT lifetimes:** Driven by env vars with sane defaults (60 min / 7 days) — configurable per environment.

### Edge cases it doesn't handle yet

- `ALLOWED_HOSTS` in production (hardcoded for now)
- `DATABASES` in production (SQLite only — will add `dj-database-url` at deploy time)

---

## Testing Strategy

No business logic to unit test yet, but here's what you'd write in a production project:

- **`test_settings_loads_from_env`** — patch `os.environ` with test values and assert `settings.SECRET_KEY` equals what you set. Verifies `load_dotenv` is wired correctly.
- **`test_cors_origins_parsed_correctly`** — set `CORS_ALLOWED_ORIGINS=http://a.com,http://b.com` in env and assert `settings.CORS_ALLOWED_ORIGINS` is a list of two items. Tests the split/strip logic.
- **`test_custom_user_model_is_active`** — `from django.contrib.auth import get_user_model; assert get_user_model().__name__ == "User"`. Verifies `AUTH_USER_MODEL` resolves to our class.

---

## What to Google Later

- `"Django project vs app"` — understand the two-level structure at a deeper level
- `"Python virtualenv vs venv vs conda"` — trade-offs and when you'd reach for each
- `"Django settings splitting (base/local/production)"` — pattern for managing separate settings files per environment
- `"CORS and the Same-Origin Policy"` — why the browser enforces this and what CORS actually allows
- `"AUTH_USER_MODEL Django custom user model"` — the official docs explanation of why this must be set before first migration
- `"12-factor app config"` — the philosophy behind environment-variable-driven config; comes up in DevOps interviews

---

## Useful Commands

```bash
cd /Users/shruti/IdeaProjects/my-ai-journal/backend
source .venv/bin/activate

python manage.py runserver          # start dev server at http://127.0.0.1:8000
python manage.py check              # validate config without starting the server
python manage.py makemigrations     # generate migration files from model changes
python manage.py migrate            # apply pending migrations to the database
```
