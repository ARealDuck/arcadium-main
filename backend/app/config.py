from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    cookie_secure: bool = False
    session_days: int = 30
    resend_api_key: str | None = None
    frontend_url: str = "http://localhost:5173"
    media_dir: str = "/media"
    invites_required: bool = True
    admin_user_ids: list[int] = []
    email_from: str = "Arcadium <noreply@arcadium.ac>"

settings = Settings() # pyright: ignore[reportCallIssue]