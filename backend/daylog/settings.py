"""
Django settings for the DayLog project.

All secrets and environment-specific values are loaded from a .env file via
python-dotenv. The .env file is gitignored; .env.example is the safe template
to commit. This follows the 12-factor app config principle: config lives in the
environment, not in code.
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# BASE_DIR is the backend/ folder — one level above this settings file.
# Path(__file__) is the absolute path to settings.py itself.
# .parent gives daylog/, .parent.parent gives backend/.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the backend/ directory into os.environ.
# override=False means existing environment variables (e.g., set in CI) take precedence.
load_dotenv(BASE_DIR / ".env", override=False)

# ---------------------------------------------------------------------------
# Security settings
# ---------------------------------------------------------------------------

# SECRET_KEY signs cookies and CSRF tokens. If it leaks, attackers can forge
# session cookies and log in as any user. Never hardcode this.
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]

# DEBUG=True shows full stack traces in the browser on errors — great locally,
# catastrophic in production (leaks internal code paths to attackers).
DEBUG = os.environ.get("DJANGO_DEBUG", "False") == "True"

# ALLOWED_HOSTS is Django's first line of defense against HTTP Host header attacks.
# In production, set this to your exact domain (e.g., api.daylog.app).
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------

INSTALLED_APPS = [
    # Django built-ins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third-party packages
    "rest_framework",        # Django REST Framework — API layer
    "corsheaders",           # Adds CORS headers so React (port 5173) can call Django (port 8000)
    # Our apps
    "users",                 # Custom User model — must be listed before entries/habits that FK to it
    "entries",               # JournalEntry + AI categorization service
    "habits",                # Habit + HabitLog
    # Dev tools
    "django_extensions",     # adds manage.py show_urls and other useful commands
]

MIDDLEWARE = [
    # CorsMiddleware must be first — it needs to intercept requests before any
    # other middleware processes them, including the security middleware.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "daylog.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "daylog.wsgi.application"

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

# SQLite locally — zero config, perfect for development.
# In production we'll swap this for Postgres via DATABASE_URL (Step 2 or deploy).
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ---------------------------------------------------------------------------
# Custom User model
# ---------------------------------------------------------------------------

# This MUST be set before the first `python manage.py migrate` run.
# Django's auth system is built around a single User model; swapping it after
# the first migration requires resetting the entire database. We set it now
# even though the users app model is still empty, to avoid that pain later.
AUTH_USER_MODEL = "users.User"

# ---------------------------------------------------------------------------
# Django REST Framework defaults
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    # Every endpoint requires a valid JWT by default.
    # Individual views can loosen this with permission_classes = [AllowAny].
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    # Pagination applied globally so we never accidentally return 10,000 rows.
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# ---------------------------------------------------------------------------
# JWT configuration (djangorestframework-simplejwt)
# ---------------------------------------------------------------------------

SIMPLE_JWT = {
    # Short-lived access token: sent with every API request.
    # If stolen, it expires quickly — minimizes the damage window.
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(os.environ.get("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", 60))
    ),
    # Long-lived refresh token: used only to get a new access token.
    # Stored in localStorage on the frontend; should be rotated on use.
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(os.environ.get("JWT_REFRESH_TOKEN_LIFETIME_DAYS", 7))
    ),
    "ROTATE_REFRESH_TOKENS": True,   # Issue a new refresh token on every refresh call
    "BLACKLIST_AFTER_ROTATION": False, # Blacklisting requires the blacklist app; skip for now
    "ALGORITHM": "HS256",
    "AUTH_HEADER_TYPES": ("Bearer",),  # Clients send: Authorization: Bearer <token>
}

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------

# SECURITY: Only allow requests from our own frontend origin.
# Never set CORS_ALLOW_ALL_ORIGINS = True in production — it lets any website
# make authenticated requests to your API on behalf of your users.
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",")
]

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalisation
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True  # Store all datetimes as UTC in the DB — convert to local time in the frontend

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"

# ---------------------------------------------------------------------------
# Primary key type
# ---------------------------------------------------------------------------

# BigAutoField = 64-bit integer PKs. Default was 32-bit (AutoField) in older Django.
# 64-bit gives us ~9 quintillion IDs before overflow — effectively unlimited.
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
