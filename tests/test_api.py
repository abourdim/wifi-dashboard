"""Tests for FastAPI WebSocket + REST endpoints."""

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from main import app


# ── REST API ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert "scanning" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_api_logs_csv():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/logs/csv")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_api_logs_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/logs/json")
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_set_log_format_valid():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/csv")
    assert r.status_code == 200
    assert r.json()["log_format"] == "csv"


@pytest.mark.asyncio
async def test_set_log_format_invalid():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/xml")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_delete_logs():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.delete("/api/logs")
    assert r.status_code == 200
    assert r.json()["status"] == "cleared"


# ── WebSocket ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ws_hello():
    """WebSocket hello handshake."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "hello"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "hello_ack"
        assert data["server"] == "WiFi Dashboard"


@pytest.mark.asyncio
async def test_ws_invalid_json():
    """WebSocket should handle invalid JSON gracefully."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text("not-json")
        data = json.loads(ws.receive_text())
        assert data["type"] == "error"


@pytest.mark.asyncio
async def test_ws_unknown_type():
    """WebSocket should return error for unknown message types."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "nonexistent"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "error"


@pytest.mark.asyncio
async def test_ws_scan_simulate():
    """WebSocket scan with simulate=True should return networks."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan",
            "simulate": True,
            "duration": 0.1,
        }))
        # Should receive scan_result
        data = json.loads(ws.receive_text())
        assert data["type"] == "scan_result"
        assert "networks" in data
        assert len(data["networks"]) > 0
