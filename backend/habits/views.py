from rest_framework import generics

from .models import Habit, HabitLog
from .serializers import HabitLogSerializer, HabitSerializer


class HabitListCreateView(generics.ListCreateAPIView):
    serializer_class = HabitSerializer

    def get_queryset(self):
        # Only return active habits — inactive ones are soft-deleted and
        # invisible to the user, though their HabitLogs remain in the DB.
        return Habit.objects.filter(user=self.request.user, is_active=True)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class HabitDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = HabitSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        # No is_active filter here — the user must be able to GET and PATCH
        # a habit even if they're in the process of deactivating it.
        return Habit.objects.filter(user=self.request.user)

    def perform_destroy(self, instance: Habit) -> None:
        # Soft delete: flip is_active instead of calling instance.delete().
        # This preserves all HabitLog history, which would be CASCADE-deleted
        # if we hard-deleted the Habit row.
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        # update_fields=["is_active"] tells Django to issue:
        #   UPDATE habits_habit SET is_active = False WHERE id = ?
        # instead of updating every column. Safer and faster for a single-field change.


class HabitLogListView(generics.ListAPIView):
    serializer_class = HabitLogSerializer

    def get_queryset(self):
        # habit__user is a double-underscore traversal across the FK:
        # HabitLog → Habit → User. Django translates this into a JOIN.
        qs = HabitLog.objects.filter(
            habit__user=self.request.user
        ).select_related("habit")
        # select_related("habit") tells Django to JOIN habits_habit into this
        # query so habit.name is available without a second query per log row.
        # Without this, serializing 50 logs fires 51 queries (the N+1 problem).

        # Optional date filter: GET /api/habits/logs/?date=2026-05-04
        date_param = self.request.query_params.get("date")
        if date_param:
            qs = qs.filter(date=date_param)
        return qs


class HabitLogDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = HabitLogSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return HabitLog.objects.filter(
            habit__user=self.request.user
        ).select_related("habit")
