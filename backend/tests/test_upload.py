import pytest
import io


@pytest.mark.asyncio
async def test_upload_invalid_mime_rejected(async_client, auth_headers):
    # Attempt to upload a text file masquerading as audio
    file_content = b"This is plain text not audio"
    files = {"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
    data = {"title": "Test Text Meeting"}

    response = await async_client.post(
        "/meetings/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    assert response.status_code == 400
    assert "Unsupported audio type" in response.text
