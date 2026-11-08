import pytest
from app.config import get_settings

settings = get_settings()


@pytest.mark.asyncio
async def test_auth_missing_token_rejected(async_client):
    response = await async_client.get("/meetings")
    assert response.status_code == 401
    assert "Missing Authorization header" in response.text


@pytest.mark.asyncio
async def test_auth_invalid_token_rejected(async_client):
    headers = {"Authorization": "Bearer totally_wrong_secret"}
    response = await async_client.get("/meetings", headers=headers)
    assert response.status_code == 401
    assert "Invalid or expired access token" in response.text


@pytest.mark.asyncio
async def test_login_endpoint(async_client):
    # Valid credentials
    response = await async_client.post(
        "/auth/login",
        json={"username": settings.API_USERNAME, "password": settings.API_PASSWORD}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] == settings.API_SECRET_TOKEN

    # Invalid credentials
    response_invalid = await async_client.post(
        "/auth/login",
        json={"username": "wrong_user", "password": "wrong_password"}
    )
    assert response_invalid.status_code == 401
