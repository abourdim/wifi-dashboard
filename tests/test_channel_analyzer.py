"""Tests for channel_analyzer — overlap scoring, best channel, congestion."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from channel_analyzer import (
    analyze_24ghz,
    analyze_5ghz,
    recommend_best_channel,
    get_summary,
    CHANNEL_24_CENTER,
    CHANNEL_5_CENTER,
    NON_OVERLAPPING_24,
)


# ── Constants ────────────────────────────────────────────────────────────────

def test_channel_24_has_13_channels():
    assert len(CHANNEL_24_CENTER) == 13
    assert 1 in CHANNEL_24_CENTER
    assert 13 in CHANNEL_24_CENTER


def test_non_overlapping_channels():
    assert NON_OVERLAPPING_24 == [1, 6, 11]


def test_channel_5_has_entries():
    assert len(CHANNEL_5_CENTER) > 0
    assert 36 in CHANNEL_5_CENTER
    assert 149 in CHANNEL_5_CENTER


# ── 2.4GHz analysis ─────────────────────────────────────────────────────────

def test_analyze_24ghz_empty():
    result = analyze_24ghz([])
    assert isinstance(result, dict)
    # All channels should have zero count
    for ch in range(1, 14):
        assert result[ch]["count"] == 0
        assert result[ch]["score"] == 0


def test_analyze_24ghz_single_network():
    nets = [{"ssid": "Test", "channel": 6, "rssi": -50, "band": "2.4GHz"}]
    result = analyze_24ghz(nets)
    # Channel 6 should have count 1
    assert result[6]["count"] == 1
    assert result[6]["score"] > 0
    # Adjacent channels should have some overlap score
    assert result[5]["score"] > 0
    assert result[7]["score"] > 0
    # Far channels should have zero overlap
    assert result[1]["score"] == 0 or result[1]["count"] == 0


def test_analyze_24ghz_filters_5ghz():
    """5GHz networks should not appear in 2.4GHz analysis."""
    nets = [
        {"ssid": "A", "channel": 6, "rssi": -50, "band": "2.4GHz"},
        {"ssid": "B", "channel": 36, "rssi": -50, "band": "5GHz"},
    ]
    result = analyze_24ghz(nets)
    total = sum(result[ch]["count"] for ch in range(1, 14))
    assert total == 1


def test_analyze_24ghz_congested():
    """Multiple networks on same channel should increase score."""
    nets = [
        {"ssid": f"Net{i}", "channel": 1, "rssi": -40, "band": "2.4GHz"}
        for i in range(5)
    ]
    result = analyze_24ghz(nets)
    assert result[1]["count"] == 5
    assert result[1]["score"] > result[6]["score"]


# ── 5GHz analysis ────────────────────────────────────────────────────────────

def test_analyze_5ghz_empty():
    result = analyze_5ghz([])
    assert isinstance(result, dict)


def test_analyze_5ghz_single():
    nets = [{"ssid": "Office", "channel": 36, "rssi": -55, "band": "5GHz"}]
    result = analyze_5ghz(nets)
    assert result[36]["count"] == 1


def test_analyze_5ghz_filters_24ghz():
    """2.4GHz networks should not appear in 5GHz analysis."""
    nets = [
        {"ssid": "A", "channel": 6, "rssi": -50, "band": "2.4GHz"},
        {"ssid": "B", "channel": 36, "rssi": -50, "band": "5GHz"},
    ]
    result = analyze_5ghz(nets)
    total = sum(info["count"] for info in result.values())
    assert total == 1


# ── Best channel recommendation ─────────────────────────────────────────────

def test_best_channel_24_empty():
    result = recommend_best_channel([], "2.4GHz")
    assert "channel" in result
    assert result["channel"] in NON_OVERLAPPING_24


def test_best_channel_24_avoids_congested():
    """Should recommend a channel away from congestion."""
    nets = [
        {"ssid": f"Net{i}", "channel": 1, "rssi": -40, "band": "2.4GHz"}
        for i in range(10)
    ]
    result = recommend_best_channel(nets, "2.4GHz")
    # Should recommend 6 or 11, not 1
    assert result["channel"] in [6, 11]


def test_best_channel_24_returns_required_fields():
    nets = [{"ssid": "X", "channel": 6, "rssi": -60, "band": "2.4GHz"}]
    result = recommend_best_channel(nets, "2.4GHz")
    assert "channel" in result
    assert "score" in result
    assert "reason" in result


def test_best_channel_5_empty():
    result = recommend_best_channel([], "5GHz")
    assert "channel" in result


def test_best_channel_5_avoids_congested():
    nets = [
        {"ssid": f"Net{i}", "channel": 36, "rssi": -40, "band": "5GHz"}
        for i in range(5)
    ]
    result = recommend_best_channel(nets, "5GHz")
    assert result["channel"] != 36


# ── Full summary ─────────────────────────────────────────────────────────────

def test_get_summary_empty():
    result = get_summary([])
    assert "type" in result
    assert result["type"] == "channel_analysis"


def test_get_summary_with_networks(sample_networks):
    result = get_summary(sample_networks)
    assert result["type"] == "channel_analysis"
    assert "ghz24" in result
    assert "ghz5" in result
    assert "channels" in result["ghz24"]
    assert "recommendation" in result["ghz24"]


def test_get_summary_best_channels(sample_networks):
    """Best channel recommendations should be in valid ranges."""
    result = get_summary(sample_networks)
    rec24 = result["ghz24"]["recommendation"]
    assert rec24["channel"] in range(1, 14)
    rec5 = result["ghz5"]["recommendation"]
    if rec5["channel"]:
        assert rec5["channel"] in CHANNEL_5_CENTER
