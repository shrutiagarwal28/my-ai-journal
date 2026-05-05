from datetime import date

from rest_framework import serializers

from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    # date.today (no parentheses) is a callable — evaluated fresh on each
    # request. date.today() with parens would evaluate once at class load time
    # and every request would get the same stale date.
    date = serializers.DateField(default=date.today)

    class Meta:
        model = JournalEntry
        fields = [
            "id",
            "body",
            "date",
            "ai_categories",
            "mood_score",
            "mood_arc",
            "habits_detected",
            "people_mentioned",
            "pattern_insight",
            "ai_processed_at",
            "ai_error",
            "created_at",
            "updated_at",
        ]
        # AI fields and system timestamps are set by the server, never by the
        # client. Listing them here means DRF will include them in GET responses
        # but silently ignore them if the client sends them in POST/PATCH.
        read_only_fields = [
            "id",
            "ai_categories",
            "mood_arc",
            "habits_detected",
            "people_mentioned",
            "pattern_insight",
            "ai_processed_at",
            "ai_error",
            "created_at",
            "updated_at",
        ]
        # user is not in fields at all — it's set in perform_create() from
        # request.user, so it never travels through the serializer. This
        # prevents a client from forging entries for another user's account.

    def validate_mood_score(self, value: int) -> int:
        # Application-layer range check. The DB doesn't enforce this range
        # (we discussed adding a CheckConstraint in the decision breakdown).
        # Both layers of validation are correct — the serializer gives a clear
        # error message; the DB constraint would be the final safety net.
        if value is not None and not (1 <= value <= 5):
            raise serializers.ValidationError("mood_score must be between 1 and 5.")
        return value
