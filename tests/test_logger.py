"""Tests for WiFiLogger — CSV/JSONL dual logging, edge cases, error handling."""

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
def logger_csv(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        yield WiFiLogger("csv")


@pytest.fixture
def logger_json(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        yield WiFiLogger("json")


@pytest.fixture
def logger_both(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        yield WiFiLogger("both")


# ═══════════════════════════════════════════════════════════════════════════════
#  CSV_FIELDS
# ═══════════════════════════════════════════════════════════════════════════════

def test_csv_fields_exist():
    assert "timestamp" in CSV_FIELDS
    assert "direction" in CSV_FIELDS
    assert "type" in CSV_FIELDS
    assert "network" in CSV_FIELDS
    assert "bssid" in CSV_FIELDS
    assert "rssi" in CSV_FIELDS
    assert "channel" in CSV_FIELDS
    assert "security" in CSV_FIELDS
    assert "extra" in CSV_FIELDS


def test_csv_fields_is_tuple_or_list():
    assert isinstance(CSV_FIELDS, (list, tuple))
    assert len(CSV_FIELDS) >= 8


# ═══════════════════════════════════════════════════════════════════════════════
#  Initialization
# ═══════════════════════════════════════════════════════════════════════════════

def test_init_csv_format(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        assert lg.log_format == "csv"


def test_init_json_format(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        assert lg.log_format == "json"


def test_init_both_format(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("both")
        assert lg.log_format == "both"


# ═══════════════════════════════════════════════════════════════════════════════
#  Format switching
# ═══════════════════════════════════════════════════════════════════════════════

def test_set_format(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        assert lg.log_format == "csv"
        lg.set_format("json")
        assert lg.log_format == "json"
        lg.set_format("both")
        assert lg.log_format == "both"


@pytest.mark.asyncio
async def test_set_format_mid_logging(tmp_log_paths):
    """Switching format mid-session should work without losing data."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", network="BeforeSwitch")
        lg.set_format("json")
        await lg.log_event(direction="rx", event_type="scan", network="AfterSwitch")
        assert "BeforeSwitch" in csv_p.read_text()
        assert "AfterSwitch" in json_p.read_text()


# ═══════════════════════════════════════════════════════════════════════════════
#  CSV-only logging
# ═══════════════════════════════════════════════════════════════════════════════

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
        assert not json_p.exists() or json_p.read_text().strip() == ""


@pytest.mark.asyncio
async def test_csv_has_header(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", network="X")
        lines = csv_p.read_text().strip().split("\n")
        header = lines[0]
        for field in CSV_FIELDS:
            assert field in header


@pytest.mark.asyncio
async def test_csv_has_timestamp(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", network="TimestampTest")
        content = csv_p.read_text()
        # ISO 8601 timestamp pattern
        assert "202" in content  # year prefix


@pytest.mark.asyncio
async def test_csv_rssi_value(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", rssi=-73)
        assert "-73" in csv_p.read_text()


# ═══════════════════════════════════════════════════════════════════════════════
#  JSON-only logging
# ═══════════════════════════════════════════════════════════════════════════════

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
async def test_json_is_valid_jsonl(tmp_log_paths):
    """Each line should be valid JSON."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        for i in range(5):
            await lg.log_event(direction="rx", event_type="scan", network=f"Net{i}")
        for line in json_p.read_text().strip().split("\n"):
            obj = json.loads(line)
            assert "ts" in obj
            assert "network" in obj


@pytest.mark.asyncio
async def test_json_rssi_none(tmp_log_paths):
    """rssi=None should be serializable."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        await lg.log_event(direction="rx", event_type="scan", rssi=None)
        obj = json.loads(json_p.read_text().strip())
        assert obj["rssi"] is None or obj["rssi"] == ""


@pytest.mark.asyncio
async def test_json_extra_field(tmp_log_paths):
    """Extra fields should be spread into the JSON record."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        await lg.log_event(
            direction="rx", event_type="scan",
            extra={"vendor": "Apple", "bandwidth": "80MHz"}
        )
        obj = json.loads(json_p.read_text().strip())
        # Extra fields are spread into the record via **
        assert obj["vendor"] == "Apple"
        assert obj["bandwidth"] == "80MHz"


# ═══════════════════════════════════════════════════════════════════════════════
#  Both-format logging
# ═══════════════════════════════════════════════════════════════════════════════

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
        lines = csv_p.read_text().strip().split("\n")
        assert len(lines) == 6  # header + 5
        json_lines = json_p.read_text().strip().split("\n")
        assert len(json_lines) == 5


@pytest.mark.asyncio
async def test_log_many_entries(tmp_log_paths):
    """Stress test: 100 log entries."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("both")
        for i in range(100):
            await lg.log_event(
                direction="rx", event_type="scan",
                network=f"Stress{i}", rssi=-50,
            )
        csv_lines = csv_p.read_text().strip().split("\n")
        assert len(csv_lines) == 101  # header + 100
        json_lines = json_p.read_text().strip().split("\n")
        assert len(json_lines) == 100


# ═══════════════════════════════════════════════════════════════════════════════
#  Unicode / special characters
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_unicode_ssid(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("both")
        await lg.log_event(direction="rx", event_type="scan", network="WiFi-مكتب")
        assert "WiFi-مكتب" in csv_p.read_text()
        obj = json.loads(json_p.read_text().strip())
        assert obj["network"] == "WiFi-مكتب"


@pytest.mark.asyncio
async def test_csv_escaping_commas(tmp_log_paths):
    """SSID with commas should be properly CSV-escaped."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", network="Net,With,Commas")
        content = csv_p.read_text()
        assert "Net,With,Commas" in content or '"Net,With,Commas"' in content


@pytest.mark.asyncio
async def test_csv_escaping_quotes(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        await lg.log_event(direction="rx", event_type="scan", network='Net"Quotes')
        # CSV should handle it — just verify it doesn't crash
        content = csv_p.read_text()
        assert "Net" in content


# ═══════════════════════════════════════════════════════════════════════════════
#  Read methods
# ═══════════════════════════════════════════════════════════════════════════════

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


def test_read_csv_empty(tmp_log_paths):
    """Reading CSV before any writes should not crash."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")
        content = lg.read_csv()
        assert isinstance(content, str)


def test_read_json_empty(tmp_log_paths):
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")
        content = lg.read_json()
        assert isinstance(content, str)


def test_read_csv_before_any_write(tmp_log_paths):
    """read_csv() on a fresh logger should return header or empty."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("json")  # init as json-only so CSV may not exist
        content = lg.read_csv()
        assert isinstance(content, str)


def test_read_json_before_any_write(tmp_log_paths):
    """read_json() on a fresh csv-only logger should return empty."""
    csv_p, json_p = tmp_log_paths
    with patch("logger.CSV_PATH", csv_p), patch("logger.JSON_PATH", json_p):
        lg = WiFiLogger("csv")  # init as csv-only so JSON may not exist
        content = lg.read_json()
        assert isinstance(content, str)
