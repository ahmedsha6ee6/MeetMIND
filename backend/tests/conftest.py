import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config import get_settings

settings = get_settings()


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {settings.API_SECRET_TOKEN}"}


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
