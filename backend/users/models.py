from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """
    Custom user model — intentionally sparse for now.

    We extend AbstractUser rather than writing from scratch so we get
    username, email, password hashing, is_active, date_joined, and
    Django's entire permission/group system for free.

    Custom fields (e.g. timezone, avatar) will be added in Step 2.
    The model must exist NOW because AUTH_USER_MODEL = "users.User"
    is declared in settings — Django validates this at startup.
    """

    pass
