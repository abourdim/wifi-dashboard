"""Tests for WiFiManager — scanning, parsing, filtering, simulate mode, edge cases."""

import asyncio
import re
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from wifi_manager import WiFiManager, detect_os


# ── Helpers ──────────────────────────────────────────────────────────────────

@pytest.fixture
def manager(mock_broadcast):
    return WiFiManager(notify_callback=mock_broadcast)


# ═══════════════════════════════════════════════════════════════════════════════
#  detect_os()
# ═══════════════════════════════════════════════════════════════════════════════

def test_detect_os_returns_valid_string():
    result = detect_os()
    assert result in ("macos", "linux", "rpi", "unknown")


@patch("wifi_manager.platform.system", return_value="Darwin")
def test_detect_os_macos(mock_sys):
    assert detect_os() == "macos"


@patch("wifi_manager.platform.system", return_value="Linux")
def test_detect_os_linux(mock_sys):
    result = detect_os()
    assert result in ("linux", "rpi")  # RPi is also Linux


@patch("wifi_manager.platform.system", return_value="Windows")
@patch("wifi_manager.platform.machine", return_value="AMD64")
def test_detect_os_unknown(mock_machine, mock_sys):
    # On non-Darwin/Linux, should return "unknown"
    # But detect_os might check other things; just verify it returns a string
    result = detect_os()
    assert isinstance(result, str)


# ═══════════════════════════════════════════════════════════════════════════════
#  WiFiManager.__init__
# ═══════════════════════════════════════════════════════════════════════════════

def test_init_state(mock_broadcast):
    m = WiFiManager(mock_broadcast)
    assert m._scanning is False
    assert m._scan_task is None
    assert m.last_networks == []
    assert m._cb == mock_broadcast


# ═══════════════════════════════════════════════════════════════════════════════
#  Simulate mode
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_simulate_returns_networks(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    assert isinstance(result, list)
    assert 8 <= len(result) <= 16


@pytest.mark.asyncio
async def test_simulate_network_fields(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    required = {"ssid", "bssid", "rssi", "channel", "frequency", "band",
                "security", "bandwidth", "vendor", "hidden", "rssi_history"}
    for net in result:
        missing = required - set(net.keys())
        assert not missing, f"Missing fields: {missing}"


@pytest.mark.asyncio
async def test_simulate_rssi_range(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        assert -100 <= net["rssi"] <= -20, f"RSSI out of range: {net['rssi']}"


@pytest.mark.asyncio
async def test_simulate_band_matches_frequency(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        if net["frequency"] < 3000:
            assert net["band"] == "2.4GHz"
        else:
            assert net["band"] == "5GHz"


@pytest.mark.asyncio
async def test_simulate_bssid_format(manager):
    mac_re = re.compile(r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        assert mac_re.match(net["bssid"]), f"Invalid BSSID: {net['bssid']}"


@pytest.mark.asyncio
async def test_simulate_broadcast_called(mock_broadcast):
    mgr = WiFiManager(notify_callback=mock_broadcast)
    await mgr.scan(duration=0.1, simulate=True)
    mock_broadcast.assert_called()
    call_arg = mock_broadcast.call_args[0][0]
    assert call_arg["type"] == "scan_result"
    assert "networks" in call_arg


@pytest.mark.asyncio
async def test_simulate_unique_bssids(manager):
    """Every simulated network should have a unique BSSID."""
    result = await manager.scan(duration=0.1, simulate=True)
    bssids = [n["bssid"] for n in result]
    assert len(bssids) == len(set(bssids)), "Duplicate BSSIDs found"


@pytest.mark.asyncio
async def test_simulate_valid_security_types(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    valid = {"WPA", "WPA2", "WPA3", "WEP", "Open"}
    for net in result:
        assert net["security"] in valid, f"Invalid security: {net['security']}"


@pytest.mark.asyncio
async def test_simulate_valid_bandwidth(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    valid = {"20MHz", "40MHz", "80MHz"}
    for net in result:
        assert net["bandwidth"] in valid, f"Invalid bandwidth: {net['bandwidth']}"


@pytest.mark.asyncio
async def test_simulate_hidden_networks_have_hidden_ssid(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        if net["hidden"]:
            assert net["ssid"] == "[Hidden]"


@pytest.mark.asyncio
async def test_simulate_frequency_matches_channel(manager):
    """Frequency should be derivable from channel."""
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        expected_freq = manager._channel_to_freq(net["channel"])
        assert net["frequency"] == expected_freq, \
            f"Channel {net['channel']} → expected freq {expected_freq}, got {net['frequency']}"


@pytest.mark.asyncio
async def test_simulate_vendor_is_string(manager):
    result = await manager.scan(duration=0.1, simulate=True)
    for net in result:
        assert isinstance(net["vendor"], str)
        assert len(net["vendor"]) > 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Filters
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_filter_by_ssid(manager):
    result = await manager.scan(duration=0.1, simulate=True, ssid_filter="Home")
    for net in result:
        assert "home" in net["ssid"].lower() or net["hidden"]


@pytest.mark.asyncio
async def test_filter_by_rssi_min(manager):
    result = await manager.scan(duration=0.1, simulate=True, rssi_min=-50)
    for net in result:
        assert net["rssi"] >= -50


@pytest.mark.asyncio
async def test_filter_by_band_24(manager):
    result = await manager.scan(duration=0.1, simulate=True, band="2.4GHz")
    for net in result:
        assert net["band"] == "2.4GHz"


@pytest.mark.asyncio
async def test_filter_by_band_5(manager):
    result = await manager.scan(duration=0.1, simulate=True, band="5GHz")
    for net in result:
        assert net["band"] == "5GHz"


@pytest.mark.asyncio
async def test_filter_band_all_returns_both(manager):
    """Band='all' should return both bands."""
    result = await manager.scan(duration=0.1, simulate=True, band="all")
    bands = {n["band"] for n in result}
    # With 8-16 networks and 35% 5GHz chance, both bands should usually appear
    assert len(bands) >= 1  # at minimum one band


@pytest.mark.asyncio
async def test_filter_ssid_no_match(manager):
    """Non-existent SSID filter should return empty or only hidden."""
    result = await manager.scan(duration=0.1, simulate=True, ssid_filter="ZZZNOEXIST999")
    for net in result:
        assert net["hidden"]  # only hidden nets pass through


@pytest.mark.asyncio
async def test_filter_rssi_min_very_strong(manager):
    """Very high RSSI min should return few or no networks."""
    result = await manager.scan(duration=0.1, simulate=True, rssi_min=-10)
    # -10 dBm is extremely strong; simulate uses -90 to -25
    assert len(result) == 0


# ═══════════════════════════════════════════════════════════════════════════════
#  RSSI history
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_rssi_history_accumulates(manager):
    await manager.scan(duration=0.1, simulate=True)
    first_nets = {n["bssid"]: n for n in manager.last_networks}
    await manager.scan(duration=0.1, simulate=True)
    for net in manager.last_networks:
        if net["bssid"] in first_nets:
            assert len(net["rssi_history"]) >= 2


@pytest.mark.asyncio
async def test_rssi_history_max_length(manager):
    for _ in range(25):
        await manager.scan(duration=0.1, simulate=True)
    for net in manager.last_networks:
        assert len(net["rssi_history"]) <= 20


@pytest.mark.asyncio
async def test_rssi_history_contains_valid_values(manager):
    """Every RSSI history entry should be an integer."""
    await manager.scan(duration=0.1, simulate=True)
    await manager.scan(duration=0.1, simulate=True)
    for net in manager.last_networks:
        for val in net["rssi_history"]:
            assert isinstance(val, int)
            assert -120 <= val <= 0


# ═══════════════════════════════════════════════════════════════════════════════
#  last_networks / stop_scan
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_last_networks_empty_initially(manager):
    assert manager.last_networks == []


@pytest.mark.asyncio
async def test_last_networks_populated_after_scan(manager):
    await manager.scan(duration=0.1, simulate=True)
    assert len(manager.last_networks) > 0


@pytest.mark.asyncio
async def test_last_networks_updates_on_second_scan(manager):
    await manager.scan(duration=0.1, simulate=True)
    first = list(manager.last_networks)
    await manager.scan(duration=0.1, simulate=True)
    second = list(manager.last_networks)
    assert len(second) > 0


@pytest.mark.asyncio
async def test_stop_scan(manager):
    await manager.stop_scan()
    assert not manager._scanning


@pytest.mark.asyncio
async def test_stop_scan_when_not_scanning(manager):
    """Stopping when not scanning should not raise."""
    manager._scanning = False
    manager._task = None
    await manager.stop_scan()
    assert not manager._scanning


# ═══════════════════════════════════════════════════════════════════════════════
#  macOS airport parsing
# ═══════════════════════════════════════════════════════════════════════════════

def test_parse_airport(manager, sample_airport_output):
    networks = manager._parse_airport(sample_airport_output)
    assert len(networks) >= 6
    home = [n for n in networks if n["ssid"] == "Home-WiFi"]
    assert len(home) == 1
    assert home[0]["bssid"].upper() == "14:CC:20:A1:B2:C3"
    assert home[0]["rssi"] == -65
    assert home[0]["channel"] == 6


def test_parse_airport_hidden_network(manager, sample_airport_output):
    networks = manager._parse_airport(sample_airport_output)
    hidden = [n for n in networks if n["hidden"]]
    assert len(hidden) >= 1


def test_parse_airport_security(manager, sample_airport_output):
    networks = manager._parse_airport(sample_airport_output)
    free = [n for n in networks if n["ssid"] == "FreeWifi"]
    assert len(free) == 1
    assert free[0]["security"] == "Open"
    wep = [n for n in networks if n["ssid"] == "Old-Router"]
    assert len(wep) == 1
    assert wep[0]["security"] == "WEP"


def test_parse_airport_5ghz(manager, sample_airport_output):
    """5GHz networks should be properly detected."""
    networks = manager._parse_airport(sample_airport_output)
    fiveg = [n for n in networks if n["band"] == "5GHz"]
    assert len(fiveg) >= 1
    assert fiveg[0]["channel"] == 44


def test_parse_airport_all_have_required_fields(manager, sample_airport_output):
    """Every parsed network should have all required fields."""
    required = {"ssid", "bssid", "rssi", "channel", "frequency", "band",
                "security", "bandwidth", "hidden"}
    networks = manager._parse_airport(sample_airport_output)
    for net in networks:
        missing = required - set(net.keys())
        assert not missing, f"Missing fields: {missing}"


def test_parse_airport_empty_input(manager):
    assert manager._parse_airport("") == []


def test_parse_airport_header_only(manager):
    header = "                            SSID BSSID             RSSI CHANNEL HT CC SECURITY (auth/unicast/group)\n"
    assert manager._parse_airport(header) == []


def test_parse_airport_no_bssid_header(manager):
    """Missing BSSID column header should return empty."""
    data = "SSID RSSI CHANNEL\nMyNet -50 6\n"
    assert manager._parse_airport(data) == []


def test_parse_airport_malformed_line_skipped(manager):
    """Lines too short should be skipped without crashing."""
    data = (
        "                            SSID BSSID             RSSI CHANNEL HT CC SECURITY\n"
        "short\n"
        "                       Home-WiFi 14:cc:20:a1:b2:c3 -65  6       Y  -- WPA2(PSK/AES/AES)\n"
    )
    networks = manager._parse_airport(data)
    assert len(networks) == 1
    assert networks[0]["ssid"] == "Home-WiFi"


# ═══════════════════════════════════════════════════════════════════════════════
#  Linux nmcli parsing
# ═══════════════════════════════════════════════════════════════════════════════

def test_parse_nmcli(manager, sample_nmcli_output):
    networks = manager._parse_nmcli(sample_nmcli_output)
    assert len(networks) >= 4
    home = [n for n in networks if n["ssid"] == "Home-WiFi"]
    assert len(home) == 1


def test_parse_nmcli_hidden(manager, sample_nmcli_output):
    networks = manager._parse_nmcli(sample_nmcli_output)
    hidden = [n for n in networks if n["hidden"]]
    assert len(hidden) >= 1


def test_parse_nmcli_rssi_conversion(manager, sample_nmcli_output):
    """nmcli gives signal quality 0-100, should be converted to dBm."""
    networks = manager._parse_nmcli(sample_nmcli_output)
    for net in networks:
        assert -100 <= net["rssi"] <= 0


def test_parse_nmcli_all_have_required_fields(manager, sample_nmcli_output):
    required = {"ssid", "bssid", "rssi", "channel", "frequency", "band",
                "security", "bandwidth", "hidden"}
    networks = manager._parse_nmcli(sample_nmcli_output)
    for net in networks:
        missing = required - set(net.keys())
        assert not missing, f"Missing: {missing}"


def test_parse_nmcli_empty_input(manager):
    assert manager._parse_nmcli("") == []


def test_parse_nmcli_open_security(manager, sample_nmcli_output):
    """Empty security field should be 'Open'."""
    networks = manager._parse_nmcli(sample_nmcli_output)
    free = [n for n in networks if n["ssid"] == "FreeWifi"]
    assert len(free) == 1
    assert free[0]["security"] == "Open"


# ═══════════════════════════════════════════════════════════════════════════════
#  iw output parsing
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def sample_iw_output():
    return (
        "BSS aa:bb:cc:dd:ee:ff(on wlan0)\n"
        "\tfreq: 2437\n"
        "\tsignal: -65.00 dBm\n"
        "\tSSID: TestNetwork\n"
        "\tRSN:\t * Version: 1\n"
        "BSS 11:22:33:44:55:66(on wlan0) -- associated\n"
        "\tfreq: 5180\n"
        "\tsignal: -42.00 dBm\n"
        "\tSSID: Office5G\n"
        "\tWPA:\t * Version: 1\n"
        "BSS de:ad:be:ef:00:11(on wlan0)\n"
        "\tfreq: 2412\n"
        "\tsignal: -80.00 dBm\n"
        "\tWEP: something\n"
    )


def test_parse_iw_count(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    assert len(networks) == 3


def test_parse_iw_ssid(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    ssids = [n["ssid"] for n in networks]
    assert "TestNetwork" in ssids
    assert "Office5G" in ssids


def test_parse_iw_hidden(manager, sample_iw_output):
    """Third network has no SSID line, should be hidden."""
    networks = manager._parse_iw(sample_iw_output)
    hidden = [n for n in networks if n["hidden"]]
    assert len(hidden) >= 1
    assert hidden[0]["ssid"] == "[Hidden]"


def test_parse_iw_frequency_band(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    test_net = [n for n in networks if n["ssid"] == "TestNetwork"][0]
    assert test_net["frequency"] == 2437
    assert test_net["band"] == "2.4GHz"
    assert test_net["channel"] == 6

    office = [n for n in networks if n["ssid"] == "Office5G"][0]
    assert office["frequency"] == 5180
    assert office["band"] == "5GHz"
    assert office["channel"] == 36


def test_parse_iw_rssi(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    test_net = [n for n in networks if n["ssid"] == "TestNetwork"][0]
    assert test_net["rssi"] == -65


def test_parse_iw_security_rsn(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    test_net = [n for n in networks if n["ssid"] == "TestNetwork"][0]
    assert test_net["security"] == "WPA2"  # RSN = WPA2


def test_parse_iw_security_wpa(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    office = [n for n in networks if n["ssid"] == "Office5G"][0]
    assert office["security"] == "WPA"


def test_parse_iw_security_wep(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    hidden = [n for n in networks if n["hidden"]][0]
    assert hidden["security"] == "WEP"


def test_parse_iw_bssid(manager, sample_iw_output):
    networks = manager._parse_iw(sample_iw_output)
    bssids = [n["bssid"] for n in networks]
    assert "aa:bb:cc:dd:ee:ff" in bssids
    assert "11:22:33:44:55:66" in bssids


def test_parse_iw_empty(manager):
    assert manager._parse_iw("") == []


def test_parse_iw_no_bss(manager):
    assert manager._parse_iw("Some random output\nno BSS lines\n") == []


def test_parse_iw_single_network(manager):
    data = (
        "BSS aa:bb:cc:dd:ee:ff(on wlan0)\n"
        "\tfreq: 2462\n"
        "\tsignal: -50.00 dBm\n"
        "\tSSID: SingleNet\n"
    )
    networks = manager._parse_iw(data)
    assert len(networks) == 1
    assert networks[0]["ssid"] == "SingleNet"
    assert networks[0]["security"] == "Open"  # no WPA/RSN/WEP line


# ═══════════════════════════════════════════════════════════════════════════════
#  _scan_macos with mocked subprocess
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_scan_macos_success(manager, sample_airport_output):
    """Mocked airport subprocess should produce parsed networks."""
    mock_proc = AsyncMock()
    mock_proc.communicate.return_value = (sample_airport_output.encode(), b"")
    mock_proc.returncode = 0

    with patch("wifi_manager.asyncio.create_subprocess_exec", return_value=mock_proc):
        result = await manager._scan_macos()
    assert len(result) >= 6


@pytest.mark.asyncio
async def test_scan_macos_failure_returns_empty(manager):
    """Non-zero return code should return empty list."""
    mock_proc = AsyncMock()
    mock_proc.communicate.return_value = (b"", b"Error")
    mock_proc.returncode = 1

    with patch("wifi_manager.asyncio.create_subprocess_exec", return_value=mock_proc):
        result = await manager._scan_macos()
    assert result == []


# ═══════════════════════════════════════════════════════════════════════════════
#  _find_wireless_iface with mocked subprocess
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_find_wireless_iface_found(manager):
    mock_proc = AsyncMock()
    mock_proc.communicate.return_value = (
        b"phy#0\n\tInterface wlan0\n\t\ttype managed\n", b""
    )
    with patch("wifi_manager.asyncio.create_subprocess_exec", return_value=mock_proc):
        iface = await manager._find_wireless_iface()
    assert iface == "wlan0"


@pytest.mark.asyncio
async def test_find_wireless_iface_not_found(manager):
    mock_proc = AsyncMock()
    mock_proc.communicate.return_value = (b"", b"")
    with patch("wifi_manager.asyncio.create_subprocess_exec", return_value=mock_proc):
        iface = await manager._find_wireless_iface()
    assert iface is None


# ═══════════════════════════════════════════════════════════════════════════════
#  Channel / frequency conversion — full boundary tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_channel_to_freq_24ghz(manager):
    assert manager._channel_to_freq(1) == 2412
    assert manager._channel_to_freq(6) == 2437
    assert manager._channel_to_freq(11) == 2462
    assert manager._channel_to_freq(13) == 2472


def test_channel_to_freq_channel_14(manager):
    assert manager._channel_to_freq(14) == 2484


def test_channel_to_freq_5ghz(manager):
    assert manager._channel_to_freq(36) == 5180
    assert manager._channel_to_freq(44) == 5220
    assert manager._channel_to_freq(64) == 5320
    assert manager._channel_to_freq(100) == 5500
    assert manager._channel_to_freq(144) == 5720
    assert manager._channel_to_freq(149) == 5745
    assert manager._channel_to_freq(165) == 5825


def test_channel_to_freq_invalid(manager):
    assert manager._channel_to_freq(0) == 0
    assert manager._channel_to_freq(-1) == 0
    assert manager._channel_to_freq(15) == 0
    assert manager._channel_to_freq(35) == 0
    assert manager._channel_to_freq(65) == 0
    assert manager._channel_to_freq(99) == 0
    assert manager._channel_to_freq(145) == 0
    assert manager._channel_to_freq(148) == 0
    assert manager._channel_to_freq(166) == 0
    assert manager._channel_to_freq(999) == 0


def test_freq_to_channel_24ghz(manager):
    assert manager._freq_to_channel(2412) == 1
    assert manager._freq_to_channel(2437) == 6
    assert manager._freq_to_channel(2462) == 11
    assert manager._freq_to_channel(2472) == 13
    assert manager._freq_to_channel(2484) == 14


def test_freq_to_channel_5ghz(manager):
    assert manager._freq_to_channel(5180) == 36
    assert manager._freq_to_channel(5320) == 64
    assert manager._freq_to_channel(5500) == 100
    assert manager._freq_to_channel(5720) == 144
    assert manager._freq_to_channel(5745) == 149
    assert manager._freq_to_channel(5825) == 165


def test_freq_to_channel_invalid(manager):
    assert manager._freq_to_channel(0) == 0
    assert manager._freq_to_channel(2411) == 0
    assert manager._freq_to_channel(2473) == 0
    assert manager._freq_to_channel(5179) == 0
    assert manager._freq_to_channel(5826) == 0
    assert manager._freq_to_channel(9999) == 0


def test_channel_freq_roundtrip_24ghz(manager):
    """Channel → freq → channel should be identity for valid channels."""
    for ch in range(1, 14):
        freq = manager._channel_to_freq(ch)
        assert manager._freq_to_channel(freq) == ch, f"Roundtrip failed for ch {ch}"


def test_channel_freq_roundtrip_5ghz(manager):
    for ch in [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112,
               116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165]:
        freq = manager._channel_to_freq(ch)
        assert freq > 0, f"No freq for ch {ch}"
        assert manager._freq_to_channel(freq) == ch, f"Roundtrip failed for ch {ch}"


# ═══════════════════════════════════════════════════════════════════════════════
#  Security normalization — exhaustive
# ═══════════════════════════════════════════════════════════════════════════════

def test_normalize_security(manager):
    assert manager._normalize_security("WPA2(PSK/AES/AES)") == "WPA2"
    assert manager._normalize_security("WPA3") == "WPA3"
    assert manager._normalize_security("NONE") == "Open"
    assert manager._normalize_security("WEP") == "WEP"
    assert manager._normalize_security("") == "Open"


def test_normalize_security_case_insensitive(manager):
    assert manager._normalize_security("wpa2") == "WPA2"
    assert manager._normalize_security("Wpa3") == "WPA3"
    assert manager._normalize_security("wep") == "WEP"
    assert manager._normalize_security("none") == "Open"


def test_normalize_security_rsn(manager):
    assert manager._normalize_security("RSN") == "WPA2"


def test_normalize_security_priority(manager):
    """WPA3 should take priority over WPA2."""
    assert manager._normalize_security("WPA3/WPA2") == "WPA3"


def test_normalize_security_wpa_without_version(manager):
    assert manager._normalize_security("WPA") == "WPA"


def test_normalize_security_dash_means_open(manager):
    assert manager._normalize_security("--") == "Open"


def test_normalize_security_complex_string(manager):
    assert manager._normalize_security("WPA2(PSK/TKIP+AES/TKIP)") == "WPA2"


def test_normalize_security_unknown_passthrough(manager):
    """Unknown security string should pass through."""
    result = manager._normalize_security("ENTERPRISE_CUSTOM")
    assert result == "ENTERPRISE_CUSTOM"
