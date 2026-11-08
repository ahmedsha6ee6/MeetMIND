from typing import Optional
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import get_settings

settings = get_settings()
security = HTTPBearer(auto_error=False)


async def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """
    Enforces HTTP Bearer token authentication (F1 fix).
    Validates token against configured API_SECRET_TOKEN.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Constant time comparison to prevent timing attacks
    if not secrets.compare_digest(credentials.credentials, settings.API_SECRET_TOKEN):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return credentials.credentials


def verify_login_credentials(username: str, password: str) -> bool:
    """
    Validates single-user dashboard login against configured credentials.
    """
    valid_user = secrets.compare_digest(username, settings.API_USERNAME)
    valid_pass = secrets.compare_digest(password, settings.API_PASSWORD)
    return valid_user and valid_pass
