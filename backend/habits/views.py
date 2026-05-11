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


class HabitLogListView(generics.ListCreateAPIView):
    serializer_class = HabitLogSerializer
    # No pagination — habit logs per user are small enough (hundreds, not millions)
    # that returning them all at once is fine. The wheel chart needs the full month
    # in a single request, and paginating would require multiple round-trips.
    pagination_class = None

    def get_queryset(self):
        # habit__user is a double-underscore traversal across the FK:
        # HabitLog → Habit → User. Django translates this into a JOIN.
        qs = HabitLog.objects.filter(
            habit__user=self.request.user
        ).select_related("habit")

        date     = self.request.query_params.get("date")
        date_gte = self.request.query_params.get("date_gte")
        date_lte = self.request.query_params.get("date_lte")

        if date:
            qs = qs.filter(date=date)
        if date_gte:
            qs = qs.filter(date__gte=date_gte)
        if date_lte:
            qs = qs.filter(date__lte=date_lte)

        return qs


class HabitLogDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = HabitLogSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return HabitLog.objects.filter(
            habit__user=self.request.user
        ).select_related("habit")
