from django.conf import settings
from django.db import models


class JournalEntry(models.Model):
    # --- Choices declared as class-level constants ---
    # Keeping choices on the model (not in settings or a separate file) means
    # they travel with the model and are visible in the admin, serializers,
    # and migrations without extra imports.
    MOOD_ARC_CHOICES = [
        ("improving", "Improving"),
        ("declining", "Declining"),
        ("flat", "Flat"),
        ("stable", "Stable"),
    ]

    # --- Ownership ---
    # ForeignKey creates a many-to-one relationship: one User, many JournalEntries.
    # settings.AUTH_USER_MODEL (not a direct import of User) is the correct
    # reference — it works even if the User model moves to a different app later.
    # on_delete=CASCADE: deleting a user deletes all their entries (appropriate
    # for a personal app; use PROTECT if entries had independent business value).
    # related_name lets us do user.entries.all() from the User side of the relationship.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="entries",
    )

    # --- Core content ---
    body = models.TextField()  # no max_length on TextField — unlimited raw journal text

    # The date this entry is ABOUT (user-controlled, can be backdated).
    # Distinct from created_at, which is when the DB record was written.
    # db_index=True because we'll filter and order by date constantly.
    date = models.DateField(db_index=True)

    # --- AI-populated fields (all nullable — filled after the entry is saved) ---
    # blank=True allows empty lists/dicts at the form/serializer layer.
    # null=True allows NULL in the database (before AI has run).
    # We need both: null=True for the DB column, blank=True for validation.
    ai_categories = models.JSONField(
        null=True,
        blank=True,
        help_text='e.g. ["Health", "Work"]',
    )
    mood_score = models.IntegerField(
        null=True,
        blank=True,
        help_text="1 (very low) to 5 (very high), inferred by AI from entry tone",
    )
    mood_arc = models.CharField(
        max_length=20,
        choices=MOOD_ARC_CHOICES,
        null=True,
        blank=True,
        help_text="How the mood shifts within a single entry",
    )
    # habits_detected mirrors the AI response schema:
    # [{"habit_name": "exercise", "completed": true}, ...]
    habits_detected = models.JSONField(null=True, blank=True)
    people_mentioned = models.JSONField(
        null=True,
        blank=True,
        help_text='e.g. ["Alice", "Bob"]',
    )
    pattern_insight = models.TextField(
        null=True,
        blank=True,
        help_text="One AI-generated observation specific to this entry",
    )

    # --- AI processing metadata ---
    # Tracks when AI last ran — useful for "reprocess entries older than X days"
    # or for showing the user when insights were last updated.
    ai_processed_at = models.DateTimeField(null=True, blank=True)
    # Stores the exception message if AI fails, enabling the /reprocess/ endpoint
    # to surface the error and allow a manual retry without re-creating the entry.
    ai_error = models.TextField(null=True, blank=True)

    # --- System timestamps ---
    # auto_now_add=True: set once at INSERT, never updated again.
    # auto_now=True: updated on every save() call — tracks last modification.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Default ordering: newest entries first in any queryset.
        # This means JournalEntry.objects.all() is already reverse-chronological
        # without needing .order_by("-date") at every call site.
        ordering = ["-date", "-created_at"]
        # Composite index on (user, date) — our most common query pattern is
        # "entries for this user on this date". A single-column index on user
        # or date alone is less efficient than a composite that covers both.
        indexes = [
            models.Index(fields=["user", "date"], name="entry_user_date_idx"),
        ]

    def __str__(self) -> str:
        # Shown in the Django admin and in repr() — helps identify records at a glance.
        return f"Entry({self.user_id}, {self.date})"
