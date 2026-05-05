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
