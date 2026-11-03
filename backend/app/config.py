from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    cookie_secure: bool = False
    session_days: int = 30
    resend_api_key: str | None = None

settings = Settings()