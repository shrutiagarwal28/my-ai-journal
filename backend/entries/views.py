from datetime import date, timedelta

from django.core.cache import cache
from habits.models import HabitLog
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import JournalEntry
from .serializers import JournalEntrySerializer


class JournalEntryListCreateView(generics.ListCreateAPIView):
    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        # Scoping to request.user is the multi-tenancy isolation guarantee.
        # Without this filter, any authenticated user could list every entry
        # in the database — a classic IDOR vulnerability.
        return JournalEntry.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # perform_create() is called after serializer.is_valid() passes.
        # We inject user here rather than reading it from the request body —
        # the client should never be able to specify which user owns an entry.
        # AI processing will be triggered here in Step 5, after the entry is
        # saved, so the client gets a 201 immediately without waiting for AI.
        serializer.save(user=self.request.user)


class JournalEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = JournalEntrySerializer
    # Disallow PUT (full replacement) — PATCH (partial update) only.
    # PUT requires sending every field; PATCH lets the client send only what changed.
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        # Same user-scoping as the list view. If a user requests an entry ID
        # that belongs to another user, this queryset returns empty and DRF
        # automatically returns 404 — leaking no information about the entry's existence.
        return JournalEntry.objects.filter(user=self.request.user)


class ReprocessView(APIView):
    """
    POST /api/entries/:id/reprocess/

    Manually trigger AI categorization on an entry where it previously failed.
    Uses APIView (not a generic) because this is an action, not a CRUD operation.
    """

    def post(self, request, pk: int) -> Response:
        # get_queryset() doesn't exist on plain APIView, so we query directly.
        # The user filter is still essential here — same IDOR risk applies.
        try:
            entry = JournalEntry.objects.get(pk=pk, user=request.user)
        except JournalEntry.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # AI processing will be wired in here during Step 5.
        # For now, return the current entry state so the endpoint is
        # reachable and testable before the AI service exists.
        serializer = JournalEntrySerializer(entry)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DashboardView(APIView):
    """GET /api/dashboard/ — aggregated stats for the current user."""

    def get(self, request) -> Response:
        user = request.user
        cache_key = f"dashboard_{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        today = date.today()

        # --- Streak ---
        # Fetch all entry dates in one query, calculate streak in Python.
        # One query instead of one per day — avoids N+1 as streak grows.
        entry_dates = set(
            JournalEntry.objects.filter(user=user).values_list("date", flat=True)
        )
        streak = 0
        current = today
        while current in entry_dates:
            streak += 1
            current -= timedelta(days=1)

        # --- Mood last 7 days ---
        mood_last_7_days = []
        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            entry = JournalEntry.objects.filter(user=user, date=d).first()
            mood_last_7_days.append({
                "date": d.isoformat(),
                "day": d.strftime("%a"),  # Mon, Tue, etc.
                "mood_score": entry.mood_score if entry else None,
            })

        # --- Category breakdown this month ---
        month_start = today.replace(day=1)
        entries_this_month = JournalEntry.objects.filter(
            user=user,
            date__gte=month_start,
            ai_categories__isnull=False,
        )
        category_breakdown: dict[str, int] = {}
        for entry in entries_this_month:
            for cat in (entry.ai_categories or []):
                category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

        # --- Habits this week ---
        week_start = today - timedelta(days=today.weekday())
        logs = HabitLog.objects.filter(
            habit__user=user,
            date__gte=week_start,
            date__lte=today,
        ).select_related("habit")

        habits_this_week: dict[str, dict] = {}
        days_so_far = (today - week_start).days + 1
        for log in logs:
            name = log.habit.name
            if name not in habits_this_week:
                habits_this_week[name] = {"completed": 0, "total": days_so_far}
            if log.completed:
                habits_this_week[name]["completed"] += 1

        data = {
            "streak": streak,
            "mood_last_7_days": mood_last_7_days,
            "category_breakdown": category_breakdown,
            "habits_this_week": habits_this_week,
        }

        cache.set(cache_key, data, timeout=300)  # cache for 5 minutes
        return Response(data)
