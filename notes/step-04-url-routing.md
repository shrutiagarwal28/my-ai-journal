# Step 4 Learning Notes — URL Routing

**Concepts covered:** URL dispatcher, REST resource design, include(), URL parameters

---

## The big picture

Django is like a post office. When a request comes in, Django looks at the URL (the address) and finds which view (piece of code) should handle it.

The URL patterns are the routing table — the list of addresses and who handles each one.

---

## How `include()` works

The root `daylog/urls.py` is the front door. It doesn't handle requests itself — it just forwards them to the right app.

```
Request: GET /api/entries/42/
  ↓
daylog/urls.py sees "api/entries/" → forwards to entries/urls.py
  ↓
entries/urls.py sees "42/" → matches <int:pk>/ → calls JournalEntryDetailView
```

`include()` = call forwarding. The prefix gets stripped, and the rest of the URL is passed to the included file.

---

## All registered URLs

| URL | Method(s) | What it does |
|-----|-----------|--------------|
| `/api/auth/register/` | POST | Create new account |
| `/api/auth/login/` | POST | Get JWT tokens |
| `/api/auth/refresh/` | POST | Get new access token |
| `/api/auth/logout/` | POST | Client discards token |
| `/api/entries/` | GET, POST | List or create entries |
| `/api/entries/<id>/` | GET, PATCH, DELETE | Read, update, delete one entry |
| `/api/entries/<id>/reprocess/` | POST | Retry AI analysis |
| `/api/habits/` | GET, POST | List or create habits |
| `/api/habits/<id>/` | GET, PATCH, DELETE | Read, update, soft-delete one habit |
| `/api/habits/logs/` | GET | List habit logs (filter by ?date=) |
| `/api/habits/logs/<id>/` | GET, PATCH | Read or update one log |

---

## REST design — the two rules

**Rule 1 — URLs are nouns (things), not verbs (actions)**
- ❌ `/api/createEntry/`
- ✅ `/api/entries/`

**Rule 2 — HTTP method = the action**
- GET = read
- POST = create
- PATCH = partial update
- DELETE = remove

---

## Decision Breakdown

**`logs/` before `<int:pk>/` in habits/urls.py**
Django matches top-to-bottom. `<int:pk>` only matches integers, so `logs/` would never match it anyway — but ordering it first makes the intent obvious to readers.

**`name=` on every pattern**
Lets you reference URLs by name (`reverse("entry-detail", args=[42])`) instead of hardcoding `/api/entries/42/` everywhere. If the URL path ever changes, you update one place.

**Logout returns 204**
JWT tokens are stateless — the server has no record of them. Real logout happens client-side (React discards the token). The endpoint exists as a clean hook for the frontend and for adding server-side blacklisting later without changing the URL.

**`TokenObtainPairView` and `TokenRefreshView` are library code**
The simplejwt library provides these views — we don't write them. They handle login (username + password → JWT tokens) and token refresh automatically.

---

## What to Google Later

- `"Django URL dispatcher"` — how Django walks the pattern list, what happens when nothing matches
- `"Django reverse() and URL names"` — why naming URLs matters and how to use them in tests
- `"REST API design nouns vs verbs"` — the full argument for URL design
- `"HTTP methods idempotency"` — which methods are idempotent (GET, PUT, DELETE) vs not (POST)
- `"JWT stateless logout"` — why server-side logout is hard with JWT and common solutions
