from rest_framework import serializers

from .models import Habit, HabitLog


class HabitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Habit
        fields = ["id", "name", "category", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]
        # user is injected in perform_create(), same pattern as JournalEntry.


class HabitLogSerializer(serializers.ModelSerializer):
    # habit_name is a read-only derived field pulled from the related Habit.
    # Without this, the frontend only gets habit_id (an integer) and would need
    # a second request to display the habit's name — wasteful.
    # source="habit.name" tells DRF to traverse the FK and read the name field.
    habit_name = serializers.CharField(source="habit.name", read_only=True)

    class Meta:
        model = HabitLog
        fields = ["id", "habit", "habit_name", "date", "completed", "source"]
        read_only_fields = [
            "id",
            "habit_name",
            # source is set by the system (manual vs ai_detected) — the client
            # toggles completion but doesn't choose the provenance label.
            "source",
        ]
