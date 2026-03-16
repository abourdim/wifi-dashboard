"""Tests for WiFiManager — scanning, parsing, filtering, simulate mode."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from wifi_manager import WiFiManager


# ── Helpers ──────────────────────────────────────────────────────────────────

@pytest.fixture
def manager(mock_broadcast):
    return WiFiManager(notify_callback=mock_broadcast)


# ── Simulate mode ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_simulate_returns_networks(manager):
    """Simulate scan should return 8-16 networks."""
    result = await manager.scan(duration=0.1, simulate=True)
    assert isinstance(result, list)
    assert 8 <= len(result) <= 16


@pytest.mark.asyncio
async def test_simulate_network_fields(manager):
    """Every simulated network must have all required fields."""
    result = await manager.scan(duration=0.1, simulate=True)
    required = {"ssid", "bssid", "rssi", "channel", "frequency", "band",
                "security", "bandwidth", "vendor", "hidden", "rssi_history"}
    for net in result:
        missing = required - set(net.keys())
        assert not missing, f"Missing fields: {missing}"


@pytest.mark.asyncio
async def test_simulate_rssi_range(manager):
    """RSSI values should be in realistic range."""
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        assert -100 <= net["rssi"] <= -20, f"RSSI out of range: {net['rssi']}"


@pytest.mark.asyncio
async def test_simulate_band_matches_frequency(manager):
    """Band field must match the frequency."""
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        if net["frequency"] < 3000:
            assert net["band"] == "2.4GHz"
        else:
            assert net["band"] == "5GHz"


@pytest.mark.asyncio
async def test_simulate_bssid_format(manager):
    """BSSID should be a valid MAC address format."""
    import re
    result = await manager.scan(duration=0.1, simulate=True)
    mac_re = re.compile(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
    for net in result:
        assert mac_re.match(net["bssid"]), f"Invalid BSSID: {net['bssid']}"


@pytest.mark.asyncio
async def test_simulate_broadcast_called(mock_broadcast):
    """Simulate should trigger the broadcast callback."""
    mgr = WiFiManager(notify_callback=mock_broadcast)
    await mgr.scan(duration=0.1, simulate=True)
    mock_broadcast.assert_called()
    call_arg = mock_broadcast.call_args[0][0]
    assert call_arg["type"] == "scan_result"
    assert "networks" in call_arg


# ── Filters ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_filter_by_ssid(manager):
    """SSID filter should only return matching networks."""
    result = await manager.scan(duration=0.1, simulate=True, ssid_filter="Home")
    # All returned networks should contain "Home" (case-insensitive) or be empty
    for net in result:
        assert "home" in net["ssid"].lower() or net["hidden"]


@pytest.mark.asyncio
async def test_filter_by_rssi_min(manager):
    """RSSI min filter should exclude weak signals."""
    result = await manager.scan(duration=0.1, simulate=True, rssi_min=-50)
    for net in result:
        assert net["rssi"] >= -50


@pytest.mark.asyncio
async def test_filter_by_band_24(manager):
    """Band filter '2.4GHz' should only return 2.4GHz networks."""
    result = await manager.scan(duration=0.1, simulate=True, band="2.4GHz")
    for net in result:
        assert net["band"] == "2.4GHz"


@pytest.mark.asyncio
async def test_filter_by_band_5(manager):
    """Band filter '5GHz' should only return 5GHz networks."""
    result = await manager.scan(duration=0.1, simulate=True, band="5GHz")
    for net in result:
        assert net["band"] == "5GHz"


# ── RSSI history ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rssi_history_accumulates(manager):
    """Multiple scans should build up RSSI history."""
    await manager.scan(duration=0.1, simulate=True)
    first_nets = {n["bssid"]: n for n in manager.last_networks}
    await manager.scan(duration=0.1, simulate=True)
    for net in manager.last_networks:
        if net["bssid"] in first_nets:
            assert len(net["rssi_history"]) >= 2


@pytest.mark.asyncio
async def test_rssi_history_max_length(manager):
    """RSSI history should not exceed 20 entries."""
    for _ in range(25):
        await manager.scan(duration=0.1, simulate=True)
    for net in manager.last_networks:
        assert len(net["rssi_history"]) <= 20


# ── last_networks property ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_last_networks_empty_initially(manager):
    assert manager.last_networks == []


@pytest.mark.asyncio
async def test_last_networks_populated_after_scan(manager):
    await manager.scan(duration=0.1, simulate=True)
    assert len(manager.last_networks) > 0


# ── stop_scan ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stop_scan(manager):
    """stop_scan should set _scanning to False."""
    await manager.stop_scan()
    assert not manager._scanning


# ── macOS airport parsing ────────────────────────────────────────────────────

def test_parse_airport(manager, sample_airport_output):
    """Parse macOS airport -s output correctly."""
    networks = manager._parse_airport(sample_airport_output)
    assert len(networks) >= 6
    # Check first non-hidden network
    home = [n for n in networks if n["ssid"] == "Home-WiFi"]
    assert len(home) == 1
    assert home[0]["bssid"].upper() == "14:CC:20:A1:B2:C3"
    assert home[0]["rssi"] == -65
    assert home[0]["channel"] == 6


def test_parse_airport_hidden_network(manager, sample_airport_output):
    """Hidden networks (empty SSID) should be detected."""
    networks = manager._parse_airport(sample_airport_output)
    hidden = [n for n in networks if n["hidden"]]
    assert len(hidden) >= 1


def test_parse_airport_security(manager, sample_airport_output):
    """Security type should be normalized."""
    networks = manager._parse_airport(sample_airport_output)
    free = [n for n in networks if n["ssid"] == "FreeWifi"]
    assert len(free) == 1
    assert free[0]["security"] == "Open"
    wep = [n for n in networks if n["ssid"] == "Old-Router"]
    assert len(wep) == 1
    assert wep[0]["security"] == "WEP"


# ── Linux nmcli parsing ─────────────────────────────────────────────────────

def test_parse_nmcli(manager, sample_nmcli_output):
    """Parse Linux nmcli -t output correctly."""
    networks = manager._parse_nmcli(sample_nmcli_output)
    assert len(networks) >= 4
    home = [n for n in networks if n["ssid"] == "Home-WiFi"]
    assert len(home) == 1


def test_parse_nmcli_hidden(manager, sample_nmcli_output):
    """Hidden networks in nmcli output should be detected."""
    networks = manager._parse_nmcli(sample_nmcli_output)
    hidden = [n for n in networks if n["hidden"]]
    assert len(hidden) >= 1


# ── Channel / frequency conversion ──────────────────────────────────────────

def test_channel_to_freq_24ghz(manager):
    assert manager._channel_to_freq(1) == 2412
    assert manager._channel_to_freq(6) == 2437
    assert manager._channel_to_freq(11) == 2462
    assert manager._channel_to_freq(13) == 2472


def test_channel_to_freq_5ghz(manager):
    assert manager._channel_to_freq(36) == 5180
    assert manager._channel_to_freq(44) == 5220
    assert manager._channel_to_freq(149) == 5745


def test_freq_to_channel(manager):
    assert manager._freq_to_channel(2412) == 1
    assert manager._freq_to_channel(2437) == 6
    assert manager._freq_to_channel(5180) == 36


# ── Security normalization ───────────────────────────────────────────────────

def test_normalize_security(manager):
    assert manager._normalize_security("WPA2(PSK/AES/AES)") == "WPA2"
    assert manager._normalize_security("WPA3") == "WPA3"
    assert manager._normalize_security("NONE") == "Open"
    assert manager._normalize_security("WEP") == "WEP"
    assert manager._normalize_security("") == "Open"
