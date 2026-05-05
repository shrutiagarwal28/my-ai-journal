from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import LogoutView, RegisterView

urlpatterns = [
    # POST /api/auth/register/ — create a new account
    path("register/", RegisterView.as_view(), name="register"),

    # POST /api/auth/login/ — send username + password, get back JWT tokens
    # TokenObtainPairView is provided by the simplejwt library — no code needed from us
    path("login/", TokenObtainPairView.as_view(), name="login"),

    # POST /api/auth/refresh/ — send a refresh token, get back a new access token
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # POST /api/auth/logout/ — client calls this, then discards its token
    path("logout/", LogoutView.as_view(), name="logout"),
]
