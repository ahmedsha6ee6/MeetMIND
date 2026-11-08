from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.auth import verify_login_credentials
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    if not verify_login_credentials(credentials.username, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    return LoginResponse(access_token=settings.API_SECRET_TOKEN)
