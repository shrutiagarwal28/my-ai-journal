from django.urls import path

from .views import HabitDetailView, HabitListCreateView, HabitLogDetailView, HabitLogListView

urlpatterns = [
    # GET  /api/habits/      — list your active habits
    # POST /api/habits/      — create a new habit
    path("", HabitListCreateView.as_view(), name="habit-list-create"),

    # GET    /api/habits/42/ — read one habit
    # PATCH  /api/habits/42/ — update one habit
    # DELETE /api/habits/42/ — soft-delete (sets is_active=False)
    path("<int:pk>/", HabitDetailView.as_view(), name="habit-detail"),

    # GET /api/habits/logs/?date=2026-05-04 — list habit logs, optionally filtered by date
    # logs/ must come BEFORE <int:pk>/ so Django doesn't try to match "logs" as a number
    path("logs/", HabitLogListView.as_view(), name="habitlog-list"),

    # GET   /api/habits/logs/7/ — read one log
    # PATCH /api/habits/logs/7/ — mark completed or not
    path("logs/<int:pk>/", HabitLogDetailView.as_view(), name="habitlog-detail"),
]
