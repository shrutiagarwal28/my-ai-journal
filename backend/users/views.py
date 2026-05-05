from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserRegistrationSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    # Override the global IsAuthenticated permission for this one endpoint.
    # Every other view inherits IsAuthenticated from REST_FRAMEWORK settings.
    # Registration must be public — a new user has no token yet.
    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Return the new user's public data (not the registration payload, which
        # contains password fields) using the read-only UserSerializer.
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    # Logout with JWT is mostly client-side — the client discards the token.
    # This endpoint exists so the frontend has a clean place to call on logout,
    # and so we can add server-side token blacklisting later without changing the URL.
    def post(self, request) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)
