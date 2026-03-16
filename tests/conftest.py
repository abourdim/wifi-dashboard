"""Shared fixtures for WiFi Dashboard tests."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))


@pytest.fixture
def mock_broadcast():
    """Mock broadcast callback for WiFiManager."""
    return AsyncMock()


@pytest.fixture
def sample_airport_output():
    """Realistic macOS airport -s output."""
    # Column layout: SSID right-justified in 32 chars (pos 0-31),
    # space at pos 32, BSSID starts at pos 33 (17 chars), then RSSI etc.
    return (
        "                            SSID BSSID             RSSI CHANNEL HT CC SECURITY (auth/unicast/group)\n"
        "                       Home-WiFi 14:cc:20:a1:b2:c3 -65  6       Y  -- WPA2(PSK/AES/AES)\n"
        "                      Livebox-5G 30:b5:c2:d4:e5:f6 -71  44      Y  -- WPA2(PSK/AES/AES)\n"
        "                     NETGEAR_EXT a0:63:91:12:34:56 -39  1       Y  -- WPA2(PSK/AES/AES)\n"
        "                  iPhone-Hotspot 28:cf:da:78:9a:bc -28  11      Y  -- WPA2(PSK/AES/AES)\n"
        "                                 c0:25:e9:de:f0:11 -82  6       Y  -- WPA2(PSK/AES/AES)\n"
        "                        FreeWifi 50:c7:bf:22:33:44 -80  11      Y  -- NONE\n"
        "                      Old-Router 1c:3b:f3:55:66:77 -75  3       Y  -- WEP\n"
    )


@pytest.fixture
def sample_nmcli_output():
    """Realistic Linux nmcli -t output."""
    return (
        "Home-WiFi:14\\:CC\\:20\\:A1\\:B2\\:C3:85:2437 MHz:WPA2:6:54 Mbit/s\n"
        "Livebox-5G:30\\:B5\\:C2\\:D4\\:E5\\:F6:29:5220 MHz:WPA2:44:270 Mbit/s\n"
        "NETGEAR_EXT:A0\\:63\\:91\\:12\\:34\\:56:61:2412 MHz:WPA2:1:130 Mbit/s\n"
        "FreeWifi:50\\:C7\\:BF\\:22\\:33\\:44:20:2462 MHz::11:54 Mbit/s\n"
        ":C0\\:25\\:E9\\:DE\\:F0\\:11:18:2437 MHz:WPA2:6:54 Mbit/s\n"
    )


@pytest.fixture
def sample_networks():
    """Pre-built list of WiFi network dicts for testing."""
    return [
        {"ssid": "Home-WiFi", "bssid": "14:CC:20:A1:B2:C3", "rssi": -65, "channel": 6, "frequency": 2437, "band": "2.4GHz", "security": "WPA2", "bandwidth": "20MHz", "vendor": "TP-Link", "hidden": False},
        {"ssid": "Livebox-5G", "bssid": "30:B5:C2:D4:E5:F6", "rssi": -71, "channel": 44, "frequency": 5220, "band": "5GHz", "security": "WPA2", "bandwidth": "40MHz", "vendor": "TP-Link", "hidden": False},
        {"ssid": "NETGEAR_EXT", "bssid": "A0:63:91:12:34:56", "rssi": -39, "channel": 1, "frequency": 2412, "band": "2.4GHz", "security": "WPA2", "bandwidth": "20MHz", "vendor": "Netgear", "hidden": False},
        {"ssid": "iPhone-Hotspot", "bssid": "28:CF:DA:78:9A:BC", "rssi": -28, "channel": 11, "frequency": 2462, "band": "2.4GHz", "security": "WPA2", "bandwidth": "20MHz", "vendor": "Apple", "hidden": False},
        {"ssid": "[Hidden]", "bssid": "C0:25:E9:DE:F0:11", "rssi": -82, "channel": 6, "frequency": 2437, "band": "2.4GHz", "security": "WPA2", "bandwidth": "20MHz", "vendor": "TP-Link", "hidden": True},
        {"ssid": "FreeWifi", "bssid": "50:C7:BF:22:33:44", "rssi": -80, "channel": 11, "frequency": 2462, "band": "2.4GHz", "security": "Open", "bandwidth": "20MHz", "vendor": "TP-Link", "hidden": False},
        {"ssid": "Old-Router", "bssid": "1C:3B:F3:55:66:77", "rssi": -75, "channel": 3, "frequency": 2422, "band": "2.4GHz", "security": "WEP", "bandwidth": "20MHz", "vendor": "Huawei", "hidden": False},
        {"ssid": "Office-5G", "bssid": "24:05:0F:BB:CC:DD", "rssi": -55, "channel": 36, "frequency": 5180, "band": "5GHz", "security": "WPA3", "bandwidth": "80MHz", "vendor": "Cisco Meraki", "hidden": False},
        {"ssid": "Mesh-Node2", "bssid": "44:94:FC:11:22:33", "rssi": -60, "channel": 6, "frequency": 2437, "band": "2.4GHz", "security": "WPA2", "bandwidth": "40MHz", "vendor": "Ubiquiti", "hidden": False},
    ]
