import hashlib
import secrets

from pwdlib import PasswordHash

password_hasher = PasswordHash.recommended()

_DUMMY_HASH = password_hasher.hash("dummy-password-for-timing")

def hash_password(password: str) -> str:
    return password_hasher.hash(password)

def verify_password(password: str, password_hash: str | None) -> tuple[bool, str | None]:
    if password_hash is None:
        password_hasher.verify(password, _DUMMY_HASH)
        return False, None
    return password_hasher.verify_and_update(password, password_hash)

def new_session_token() -> str:
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()