"""Tests for FastAPI WebSocket + REST endpoints — all message types, edge cases."""

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from main import app


# ═══════════════════════════════════════════════════════════════════════════════
#  REST API
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_api_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/status")
    assert r.status_code == 200
    data = r.json()
    assert "scanning" in data
    assert "version" in data
    assert "log_format" in data


@pytest.mark.asyncio
async def test_api_status_version():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/status")
    assert r.json()["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_api_status_scanning_false():
    """Should not be scanning initially."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/status")
    assert r.json()["scanning"] is False


@pytest.mark.asyncio
async def test_api_logs_csv():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/logs/csv")
    assert r.status_code == 200
    assert isinstance(r.text, str)


@pytest.mark.asyncio
async def test_api_logs_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.get("/api/logs/json")
    assert r.status_code == 200
    assert isinstance(r.text, str)


@pytest.mark.asyncio
async def test_set_log_format_csv():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/csv")
    assert r.status_code == 200
    assert r.json()["log_format"] == "csv"


@pytest.mark.asyncio
async def test_set_log_format_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/json")
    assert r.status_code == 200
    assert r.json()["log_format"] == "json"


@pytest.mark.asyncio
async def test_set_log_format_both():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/both")
    assert r.status_code == 200
    assert r.json()["log_format"] == "both"


@pytest.mark.asyncio
async def test_set_log_format_invalid():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/xml")
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_set_log_format_invalid_html():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.post("/api/log_format/html")
    assert r.status_code == 400
    assert "error" in r.json()


@pytest.mark.asyncio
async def test_delete_logs():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        r = await ac.delete("/api/logs")
    assert r.status_code == 200
    assert r.json()["status"] == "cleared"


@pytest.mark.asyncio
async def test_delete_logs_idempotent():
    """Deleting logs twice should still succeed."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        await ac.delete("/api/logs")
        r = await ac.delete("/api/logs")
    assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — hello handshake
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_hello():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "hello"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "hello_ack"
        assert data["server"] == "WiFi Dashboard"
        assert "version" in data


def test_ws_hello_version():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "hello"}))
        data = json.loads(ws.receive_text())
        assert data["version"] == "1.0.0"


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — error handling
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_invalid_json():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text("not-json")
        data = json.loads(ws.receive_text())
        assert data["type"] == "error"
        assert "JSON" in data["message"] or "json" in data["message"].lower()


def test_ws_empty_string():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text("")
        data = json.loads(ws.receive_text())
        assert data["type"] == "error"


def test_ws_unknown_type():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "nonexistent"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "error"
        assert "nonexistent" in data.get("message", "").lower() or "unknown" in data.get("message", "").lower()


def test_ws_missing_type():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"data": "no type field"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "error"


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — scan (simulate)
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_scan_simulate():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan",
            "simulate": True,
            "duration": 0.1,
        }))
        data = json.loads(ws.receive_text())
        assert data["type"] == "scan_result"
        assert "networks" in data
        assert len(data["networks"]) > 0


def test_ws_scan_simulate_has_required_fields():
    """Each network in scan result should have required fields."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
        }))
        data = json.loads(ws.receive_text())
        required = {"ssid", "bssid", "rssi", "channel", "frequency", "band",
                    "security", "bandwidth", "hidden"}
        for net in data["networks"]:
            missing = required - set(net.keys())
            assert not missing, f"Missing: {missing}"


def test_ws_scan_with_band_filter():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
            "band": "2.4GHz",
        }))
        data = json.loads(ws.receive_text())
        for net in data["networks"]:
            assert net["band"] == "2.4GHz"


def test_ws_scan_with_rssi_filter():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
            "rssi_min": -50,
        }))
        data = json.loads(ws.receive_text())
        for net in data["networks"]:
            assert net["rssi"] >= -50


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — scan_stop
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_scan_stop():
    """scan_stop should not crash even if no scan is running."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        # First ensure wifi_manager exists
        ws.send_text(json.dumps({"type": "hello"}))
        ws.receive_text()
        # Now stop
        ws.send_text(json.dumps({"type": "scan_stop"}))
        # No response expected; just verify no crash by sending another message
        ws.send_text(json.dumps({"type": "hello"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "hello_ack"


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — channel_analysis
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_channel_analysis():
    """channel_analysis should return analysis even with no prior scan."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        # Need to trigger a scan first so wifi_manager exists
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
        }))
        ws.receive_text()  # scan_result
        ws.send_text(json.dumps({"type": "channel_analysis"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "channel_analysis"
        assert "ghz24" in data
        assert "ghz5" in data


def test_ws_channel_analysis_has_channels():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
        }))
        ws.receive_text()
        ws.send_text(json.dumps({"type": "channel_analysis"}))
        data = json.loads(ws.receive_text())
        assert "channels" in data["ghz24"]
        assert "recommendation" in data["ghz24"]


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — best_channel
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_best_channel_24():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
        }))
        ws.receive_text()
        ws.send_text(json.dumps({"type": "best_channel", "band": "2.4GHz"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "best_channel"
        assert "channel" in data
        assert data["channel"] in range(1, 14)


def test_ws_best_channel_5():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
        }))
        ws.receive_text()
        ws.send_text(json.dumps({"type": "best_channel", "band": "5GHz"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "best_channel"
        assert "channel" in data
        assert "reason" in data


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — set_log_format
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_set_log_format():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "set_log_format", "format": "csv"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "log_format_ok"
        assert data["format"] == "csv"


def test_ws_set_log_format_json():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "set_log_format", "format": "json"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "log_format_ok"
        assert data["format"] == "json"


def test_ws_set_log_format_both():
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        ws.send_text(json.dumps({"type": "set_log_format", "format": "both"}))
        data = json.loads(ws.receive_text())
        assert data["type"] == "log_format_ok"
        assert data["format"] == "both"


# ═══════════════════════════════════════════════════════════════════════════════
#  WebSocket — multiple messages in sequence
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_full_session():
    """Simulate a full client session: hello → scan → channel_analysis → best_channel."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        # 1. Hello
        ws.send_text(json.dumps({"type": "hello"}))
        ack = json.loads(ws.receive_text())
        assert ack["type"] == "hello_ack"

        # 2. Scan
        ws.send_text(json.dumps({
            "type": "scan", "simulate": True, "duration": 0.1,
        }))
        scan = json.loads(ws.receive_text())
        assert scan["type"] == "scan_result"
        assert len(scan["networks"]) > 0

        # 3. Channel analysis
        ws.send_text(json.dumps({"type": "channel_analysis"}))
        analysis = json.loads(ws.receive_text())
        assert analysis["type"] == "channel_analysis"

        # 4. Best channel
        ws.send_text(json.dumps({"type": "best_channel", "band": "2.4GHz"}))
        best = json.loads(ws.receive_text())
        assert best["type"] == "best_channel"

        # 5. Set log format
        ws.send_text(json.dumps({"type": "set_log_format", "format": "json"}))
        fmt = json.loads(ws.receive_text())
        assert fmt["type"] == "log_format_ok"


def test_ws_multiple_scans():
    """Multiple consecutive scans should all return results."""
    from starlette.testclient import TestClient
    client = TestClient(app)
    with client.websocket_connect("/ws") as ws:
        for _ in range(3):
            ws.send_text(json.dumps({
                "type": "scan", "simulate": True, "duration": 0.1,
            }))
            data = json.loads(ws.receive_text())
            assert data["type"] == "scan_result"
            assert len(data["networks"]) > 0
