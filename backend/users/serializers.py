from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserRegistrationSerializer(serializers.Serializer):
    # We use plain Serializer (not ModelSerializer) because registration is
    # write-only — we need to accept two password fields and then discard them
    # after hashing. A ModelSerializer would expose the hashed password field
    # in its output, which we never want.
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,  # never included in the serializer's output/response
        min_length=8,
        style={"input_type": "password"},  # renders as password field in browsable API
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_username(self, value: str) -> str:
        # validate_<field> methods run automatically during .is_valid().
        # Checking uniqueness here rather than relying on the DB constraint
        # gives a clear, user-facing error instead of an IntegrityError.
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate(self, data: dict) -> dict:
        # validate() (no field suffix) runs after all individual field validators.
        # Use it for cross-field checks — here, confirming both passwords match.
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data: dict) -> User:
        # Pop password_confirm — it's not a model field, just a validation aid.
        validated_data.pop("password_confirm")
        # create_user() hashes the password using Django's password hasher
        # (PBKDF2+SHA256 by default) before writing to the database.
        # Never use User.objects.create() directly — that stores plain text.
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class UserSerializer(serializers.ModelSerializer):
    """Read-only representation of a user — returned after successful registration."""

    class Meta:
        model = User
        fields = ["id", "username", "email", "date_joined"]
        read_only_fields = fields
