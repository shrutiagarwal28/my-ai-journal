from django.conf import settings
from django.db import models


class Habit(models.Model):
    CATEGORY_CHOICES = [
        ("Health", "Health"),
        ("Work", "Work"),
        ("Learning", "Learning"),
        ("Relationships", "Relationships"),
        ("Finance", "Finance"),
        ("Creativity", "Creativity"),
        ("Wellbeing", "Wellbeing"),
        ("Other", "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="habits",
    )
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="Other")

    # Soft delete pattern: deactivating a habit hides it from the UI but
    # preserves all historical HabitLog records. Hard-deleting would CASCADE
    # and destroy the user's tracking history — unacceptable for a habit tracker.
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.user_id})"


class HabitLog(models.Model):
    SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("ai_detected", "AI Detected"),
    ]

    # on_delete=CASCADE: deleting a Habit deletes all its logs.
    # This is correct — logs are meaningless without the habit definition.
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name="logs")

    date = models.DateField(db_index=True)
    completed = models.BooleanField(default=False)

    # Provenance tracking: knowing whether a log was user-entered or AI-inferred
    # lets us audit AI accuracy and lets the user override AI-detected logs.
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="manual")

    class Meta:
        # Database-level guarantee: one log per habit per day.
        # If application code tries to create a duplicate, the DB raises
        # IntegrityError before the INSERT completes. This is the final
        # safety net — application-layer checks should also exist but can have
        # race conditions; the DB constraint cannot.
        # Django automatically creates a composite index for unique_together,
        # so we don't need to add indexes manually.
        constraints = [
            models.UniqueConstraint(
                fields=["habit", "date"],
                name="unique_habit_log_per_day",
            )
        ]
        ordering = ["-date"]

    def __str__(self) -> str:
        status = "done" if self.completed else "missed"
        return f"{self.habit.name} — {self.date} ({status})"
