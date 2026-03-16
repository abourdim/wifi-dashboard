"""Tests for WiFiLogger — CSV and JSONL dual logging."""

import asyncio
import csv
import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from logger import WiFiLogger, CSV_FIELDS, CSV_PATH, JSON_PATH


@pytest.fixture
def tmp_log_paths(tmp_path):
    """Override log paths to use temp directory."""
    csv_p = tmp_path / "wifi_log.csv"
    json_p = tmp_path / "wifi_log.jsonl"
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        yield csv_p, json_p


@pytest.fixture
def logger_both(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("both")
        lg._csv_path = csv_p
        lg._json_path = json_p
        yield lg


# ── CSV fields ───────────────────────────────────────────────────────────────

def test_csv_fields_exist():
    assert "timestamp" in CSV_FIELDS
    assert "direction" in CSV_FIELDS
    assert "type" in CSV_FIELDS
    assert "network" in CSV_FIELDS
    assert "bssid" in CSV_FIELDS
    assert "rssi" in CSV_FIELDS


# ── Log format switching ────────────────────────────────────────────────────

def test_set_format_csv(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        assert lg.log_format == "csv"
        lg.set_format("json")
        assert lg.log_format == "json"
        lg.set_format("both")
        assert lg.log_format == "both"


# ── Async logging ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_log_event_csv_only(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(
            direction="rx", event_type="scan",
            network="TestNet", bssid="AA:BB:CC:DD:EE:FF",
            channel="6", rssi=-55, security="WPA2",
        )
        content = csv_p.read_text()
        assert "TestNet" in content
        assert "AA:BB:CC:DD:EE:FF" in content
        # JSON file should not exist or be empty
        assert not json_p.exists() or json_p.read_text().strip() == ""


@pytest.mark.asyncio
async def test_log_event_json_only(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        await lg.log_event(
            direction="tx", event_type="command",
            network="MyWifi", bssid="11:22:33:44:55:66",
            channel="11", rssi=-70, security="Open",
        )
        content = json_p.read_text().strip()
        assert content
        obj = json.loads(content)
        assert obj["network"] == "MyWifi"
        assert obj["rssi"] == -70


@pytest.mark.asyncio
async def test_log_event_both(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("both")
        await lg.log_event(
            direction="rx", event_type="scan",
            network="DualLog", bssid="DE:AD:BE:EF:00:01",
            channel="1", rssi=-45, security="WPA3",
        )
        assert "DualLog" in csv_p.read_text()
        assert "DualLog" in json_p.read_text()


@pytest.mark.asyncio
async def test_multiple_log_entries(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("both")
        for i in range(5):
            await lg.log_event(
                direction="rx", event_type="scan",
                network=f"Net{i}", bssid=f"AA:BB:CC:DD:EE:{i:02X}",
                channel=str(i + 1), rssi=-50 - i,
            )
        # CSV should have header + 5 rows
        lines = csv_p.read_text().strip().split("\n")
        assert len(lines) == 6  # header + 5

        # JSONL should have 5 lines
        json_lines = json_p.read_text().strip().split("\n")
        assert len(json_lines) == 5


# ── Read methods ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_read_csv(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", network="ReadTest")
        content = lg.read_csv()
        assert "ReadTest" in content


@pytest.mark.asyncio
async def test_read_json(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        await lg.log_event(direction="rx", event_type="scan", network="JsonRead")
        content = lg.read_json()
        assert "JsonRead" in content
