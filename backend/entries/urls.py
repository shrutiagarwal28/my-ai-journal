from django.urls import path

from .views import JournalEntryDetailView, JournalEntryListCreateView, ReprocessView

urlpatterns = [
    # GET  /api/entries/      — list your entries (paginated, 20 at a time)
    # POST /api/entries/      — create a new entry
    path("", JournalEntryListCreateView.as_view(), name="entry-list-create"),

    # GET    /api/entries/42/ — read one entry
    # PATCH  /api/entries/42/ — update one entry
    # DELETE /api/entries/42/ — delete one entry
    # <int:pk> captures the number from the URL and passes it to the view
    path("<int:pk>/", JournalEntryDetailView.as_view(), name="entry-detail"),

    # POST /api/entries/42/reprocess/ — retry AI analysis if it failed
    path("<int:pk>/reprocess/", ReprocessView.as_view(), name="entry-reprocess"),
]
