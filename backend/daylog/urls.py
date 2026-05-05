"""
Root URL configuration for the DayLog project.

Every HTTP request enters here first. Django walks this list top-to-bottom
and hands the request to the first pattern that matches the path.

We use include() to delegate to each app's own urls.py — this keeps the root
file short and each app self-contained. URLs will be wired in as we build
each app in later steps.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),

    # include() means: "if the URL starts with this prefix, hand it off
    # to that app's urls.py to finish matching"
    path("api/auth/", include("users.urls")),
    path("api/entries/", include("entries.urls")),
    path("api/habits/", include("habits.urls")),
]
