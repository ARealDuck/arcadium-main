from app.models.users import User
from app.schemas.auth import UserOut


def build_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id, 
        display_name=user.display_name, 
        username=user.username, 
        avatar_url=user.avatar_url, 
        has_tachi_key=bool(user.tachi_api_key), 
        onboarded_at=user.onboarded_at, 
        email_verified=user.email_verified
    )