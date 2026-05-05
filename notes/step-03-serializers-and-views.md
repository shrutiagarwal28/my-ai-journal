# Step 3 Learning Notes — Serializers and Views

**Concepts covered:** Serialization (Python ↔ JSON translation), the DRF view layer, multi-tenancy isolation (IDOR prevention), N+1 query prevention with select_related

---

## How the three layers fit together

```
HTTP Request
    ↓
View         — authenticates, routes, calls queryset and serializer
    ↓
Serializer   — validates input, converts Python ↔ JSON
    ↓
Model/ORM    — reads and writes the database
    ↓
HTTP Response
```

Each layer has one job. Views don't touch raw SQL. Serializers don't know about HTTP. Models don't know about JSON.

---

## Decision Breakdown

### Patterns used

**Generic class-based views (`ListCreateAPIView`, `RetrieveUpdateDestroyAPIView`)**
Each class handles exactly the HTTP methods its name says. Override one or two methods to customize. Alternative: ViewSets+Routers hide the HTTP→action mapping behind convention — less transparent when debugging.

**Multi-tenancy isolation in `get_queryset()`**
Every queryset scopes to `request.user`. Overriding `get_queryset()` on a generic view protects all actions (list, retrieve, update, destroy) automatically — you can't forget to add it per-method.

**`perform_create()` injects `user`**
The client never sends `user` in the request body. The view injects it from the authenticated session. Prevents any client from forging ownership of another user's resource.

**Soft delete via `perform_destroy()` override**
`instance.is_active = False` + `save(update_fields=["is_active"])` instead of `instance.delete()`. Preserves all HabitLog history that would be CASCADE-deleted on a hard delete.

**`select_related("habit")` on HabitLog querysets**
One SQL JOIN instead of N+1 queries when the serializer reads `habit.name` for each log row.

**`date.today` (callable) not `date.today()` (value)**
As a serializer field default, the callable is evaluated fresh per request. The value would be evaluated once at class load time — every request would get the same stale date.

**Plain `Serializer` for registration (not `ModelSerializer`)**
Registration is write-only and needs cross-field validation (password confirmation). `ModelSerializer` would expose the hashed password field in output — never acceptable.

---

### What a senior engineer would push back on

- **`ReprocessView` returns the current entry state without triggering AI yet.** True — it's a stub. The AI call drops in during Step 5 without restructuring the view.
- **No pagination filtering on the entries list.** The global `PAGE_SIZE=20` applies, but there's no date-range filter on `GET /api/entries/`. For a power user with 500 entries, the client can only paginate forward — no "show me entries from March" query. Fix: add `?date_from=` and `?date_to=` query params in the view.
- **`HabitLogListView` trusts the raw `date` query param without validation.** If the client sends `?date=not-a-date`, Django's ORM will raise a `ValueError`. Fix: validate with `serializers.DateField().run_validation(date_param)` before using it in the filter.

---

### Edge cases handled
- IDOR: `get_queryset()` scoped to `request.user` — unknown entry IDs return 404, not 403, so existence is not leaked
- Duplicate habit logs: `UniqueConstraint` in the DB catches any race condition the serializer misses
- AI field tampering: AI fields are `read_only_fields` — ignored if sent in POST/PATCH body

### Edge cases not handled yet
- `?date=invalid` query param on HabitLogListView (raises ValueError instead of 400)
- Rate limiting — any authenticated user can hammer the entries endpoint

---

## Security Notes

**IDOR (Insecure Direct Object Reference)** — OWASP A01
Filtering by `request.user` in `get_queryset()` is the fix. Without it, any authenticated user can access any resource by guessing its ID.

**Password hashing**
Always use `User.objects.create_user()`, never `User.objects.create()`. The former hashes the password; the latter stores plain text.

**`AllowAny` on RegisterView only**
Every other view inherits `IsAuthenticated` from `REST_FRAMEWORK` settings. RegisterView is the only public endpoint. Be explicit — never rely on "I forgot to add a permission class so it defaults to open".

---

## Testing Strategy

**`users/serializers.py`**
- `test_registration_hashes_password` — register a user, assert `user.password` does not equal the raw string
- `test_passwords_must_match` — send mismatched passwords, assert 400 with `password_confirm` error
- `test_duplicate_username_rejected` — register twice with the same username, assert second returns 400

**`entries/views.py`**
- `test_user_cannot_see_other_users_entries` — create two users, assert user A cannot retrieve user B's entry ID
- `test_create_entry_sets_user_from_token` — POST without `user` in body, assert the entry is owned by the authenticated user
- `test_mood_score_out_of_range_rejected` — send `mood_score=6`, assert 400

**`habits/views.py`**
- `test_delete_habit_soft_deletes` — DELETE a habit, assert it still exists in DB with `is_active=False`
- `test_inactive_habit_not_in_list` — soft-delete a habit, assert it doesn't appear in GET /api/habits/
- `test_habit_log_select_related` — assert the HabitLog list view fires exactly 1 query (use `django.test.utils.override_settings` + `assertNumQueries`)

---

## What to Google Later

- `"Django select_related vs prefetch_related"` — when to use each; select_related = JOIN, prefetch_related = separate IN query
- `"DRF perform_create perform_update"` — the hook methods generic views give you for customising saves
- `"IDOR OWASP"` — the full definition and common bypass patterns
- `"DRF get_queryset vs queryset attribute"` — why overriding the method (not the attribute) is required for per-request filtering
- `"Django update_fields"` — how to issue a partial UPDATE and why it's safer than saving all columns
- `"DRF read_only_fields vs extra_kwargs"` — two ways to mark fields read-only, and when each is appropriate
