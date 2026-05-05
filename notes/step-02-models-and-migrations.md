# Step 2 Learning Notes — Models and Migrations

**Concepts covered:** ORM relationships and foreign keys, database normalization, migrations as version control for schema, indexing strategy

---

## How migrations work — the two-command flow

```
your models.py
    ↓  python manage.py makemigrations
migration files (Python, committed to git)
    ↓  python manage.py migrate
db.sqlite3 / Postgres (binary/server — tables actually exist here)
```

**`makemigrations`** — inspects your models, diffs against the existing migration history, and writes a Python file describing the change. Does not touch the database.

**`migrate`** — reads migration files and executes the equivalent SQL against the database. This is what actually creates/alters tables.

They are two separate commands so migration files can be reviewed, modified, committed to git, and shared with teammates. In production, your CI/CD pipeline runs `migrate` during deployment. If they were one command, schema changes could never be coordinated across a team or rolled back safely.

**`sqlmigrate entries 0001`** — prints the SQL a migration *would* run without executing it. Use this to understand what Django generated.

---

## Why Habit and HabitLog are two tables (normalization)

**Option 1 — Embed habit data in JournalEntry as JSON (denormalized):**
Can't query "all days I completed exercise" without scanning every entry's JSON blob. No relational integrity.

**Option 2 — One HabitLog table with `habit_name` as a string:**
Renaming a habit requires updating hundreds of historical rows. Fails 2nd Normal Form.

**Option 3 — Habit + HabitLog (3rd Normal Form — our choice):**
- `Habit` is the *definition*: name, category, whether it's active
- `HabitLog` is the *record*: did I do this habit on this date?
- Renaming a habit updates one row; all logs reflect the change through the FK

**Interview answer:** "I normalized to 3NF — each fact is stored once and updated in one place. I'd only denormalize if I had a proven read-performance problem that couldn't be solved with indexing."

---

## Decision Breakdown

### Patterns used

**Django app-per-domain** — `entries`, `habits`, `users` each own their models, views, migrations, tests. Analogous to bounded contexts in Domain-Driven Design.

**Soft delete on Habit (`is_active`)** — setting `is_active=False` instead of deleting preserves all HabitLog history. Hard delete with CASCADE would silently destroy months of tracking data.

**Provenance tracking on HabitLog (`source: manual / ai_detected`)** — records where each log came from. Lets you audit AI accuracy and allows users to override AI-detected completions.

**`UniqueConstraint` (modern) vs `unique_together` (legacy)** — both create the same DB constraint, but `UniqueConstraint` supports `condition=` (partial indexes) and `deferrable=`. We named ours `unique_habit_log_per_day` so it's identifiable in error messages and DB introspection.

**`settings.AUTH_USER_MODEL` not a direct import** — always reference the user model through settings (`from django.conf import settings` → `settings.AUTH_USER_MODEL`). If User ever moves apps, the settings reference still works; a direct import breaks.

**`auto_now_add=True` vs `auto_now=True`** — `auto_now_add` sets the value once at INSERT and never changes it (use for `created_at`). `auto_now` updates on every `save()` call (use for `updated_at`).

---

### What a senior engineer would push back on

- **No `updated_at` on `HabitLog`** — if a log is flipped from `completed=False` to `True`, there's no record of when that happened. Fine for v1.
- **`mood_score` has no DB-level range constraint** — nothing stops the application from saving `mood_score=99`. Serializer validation catches it at the API layer, but a `CheckConstraint(check=Q(mood_score__gte=1, mood_score__lte=5))` would make it a DB guarantee too.
- **Composite index `(user_id, date)` vs ordering `["-date", "-created_at"]`** — the index helps filtering; the `ORDER BY` on `created_at` may still require a sort step since `created_at` isn't in the index.

---

### Edge cases handled

- **AI failure:** `ai_error` stores the exception message, `ai_processed_at` stays null → the frontend can distinguish "AI hasn't run yet" from "AI failed"
- **Duplicate habit logs:** `UniqueConstraint` is the DB-level guarantee — even if application code has a race condition, the DB rejects the duplicate INSERT

### Edge cases not handled yet

- `mood_score` has no DB-level range constraint (serializer-only for now)
- No `updated_at` on `HabitLog`

---

## Key SQL Django generated (from `sqlmigrate entries 0001`)

```sql
-- JSONField in SQLite becomes TEXT + a JSON_VALID() check constraint
"ai_categories" text NULL CHECK ((JSON_VALID("ai_categories") OR "ai_categories" IS NULL))

-- ForeignKey creates a REFERENCES constraint (integrity)
"user_id" bigint NOT NULL REFERENCES "users_user" ("id") DEFERRABLE INITIALLY DEFERRED

-- Three indexes on JournalEntry:
CREATE INDEX "entries_journalentry_date_cd5b3c34" ON "entries_journalentry" ("date");       -- db_index=True
CREATE INDEX "entries_journalentry_user_id_0e9f80b0" ON "entries_journalentry" ("user_id"); -- Django auto-adds for all FKs
CREATE INDEX "entry_user_date_idx" ON "entries_journalentry" ("user_id", "date");           -- our composite index
```

**Note:** In Postgres (production), `JSONField` becomes a native `jsonb` column — supports real JSON operators and GIN indexes for querying inside the JSON structure.

---

## ForeignKey — what it actually does

A ForeignKey maps to two SQL concepts:
1. **`REFERENCES` constraint** — the DB enforces that `user_id` must exist in `users_user.id`. Invalid foreign keys are rejected at the DB level.
2. **JOIN** — when Django traverses `entry.user` or `log.habit.user`, it issues a SQL JOIN to fetch the related row. The ORM hides the JOIN behind Python attribute access.

`entry.user` — Python attribute, triggers a JOIN (or uses a cached result if already loaded)
`entry.user_id` — raw integer column, no extra query needed

---

## Indexing strategy

| Index | Type | Why |
|-------|------|-----|
| `user_id` on JournalEntry | Single-column (auto) | Django adds for every FK |
| `date` on JournalEntry | Single-column | `db_index=True`; we filter by date constantly |
| `(user_id, date)` on JournalEntry | Composite | Covers `WHERE user_id=? AND date=?` in one lookup |
| `(habit, date)` on HabitLog | Composite unique | Auto-created by `UniqueConstraint` |

**Interview answer for "when do you add an index?":** On any column you filter or ORDER BY in hot query paths. Composite indexes cover multi-column WHERE clauses more efficiently than two single-column indexes.

---

## Testing Strategy

**`JournalEntry`**
- `test_entry_requires_user_and_body_and_date` — missing fields raise `IntegrityError`
- `test_ai_fields_are_nullable` — entry saves with no AI fields set
- `test_ordering_is_newest_first` — two entries on different dates; `.all()[0]` is the newer one
- `test_user_deletion_cascades_to_entries` — delete user; assert entries gone

**`Habit` and `HabitLog`**
- `test_habit_soft_delete` — `is_active=False`; habit still exists in DB
- `test_unique_habit_log_per_day` — second log for same habit+date raises `IntegrityError`
- `test_habit_deletion_cascades_to_logs` — delete habit; assert logs are gone
- `test_source_choices` — `source="invalid"` fails validation

---

## What to Google Later

- `"Django select_related vs prefetch_related"` — N+1 query optimization; comes up constantly in interviews
- `"Database normalization 1NF 2NF 3NF"` — the theory behind why Habit and HabitLog are separate tables
- `"Postgres jsonb vs json column types"` — why jsonb is almost always correct in production
- `"Django UniqueConstraint vs unique_together"` — why the modern form is preferred
- `"Database index types B-tree GIN"` — B-tree is what we created; GIN indexes inside JSON
- `"Django CheckConstraint"` — DB-level range validation (relevant for mood_score 1-5)
