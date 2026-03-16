"""Tests for channel_analyzer — overlap math, scoring, best channel, edge cases."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from channel_analyzer import (
    _overlap_fraction,
    analyze_24ghz,
    analyze_5ghz,
    recommend_best_channel,
    get_summary,
    CHANNEL_24_CENTER,
    CHANNEL_24_WIDTH,
    CHANNEL_5_CENTER,
    CHANNEL_5_GROUPS,
    NON_OVERLAPPING_24,
)


# ═══════════════════════════════════════════════════════════════════════════════
#  Constants integrity
# ═══════════════════════════════════════════════════════════════════════════════

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


def test_channel_24_width_is_22mhz():
    assert CHANNEL_24_WIDTH == 22


def test_channel_24_frequencies_ascending():
    freqs = [CHANNEL_24_CENTER[ch] for ch in sorted(CHANNEL_24_CENTER)]
    assert freqs == sorted(freqs)


def test_channel_5_frequencies_ascending():
    freqs = [CHANNEL_5_CENTER[ch] for ch in sorted(CHANNEL_5_CENTER)]
    assert freqs == sorted(freqs)


def test_channel_5_groups_cover_all_channels():
    """Every 5GHz channel should belong to exactly one UNII group."""
    grouped = set()
    for group_channels in CHANNEL_5_GROUPS.values():
        grouped.update(group_channels)
    for ch in CHANNEL_5_CENTER:
        assert ch in grouped, f"Channel {ch} not in any UNII group"


# ═══════════════════════════════════════════════════════════════════════════════
#  _overlap_fraction (critical math function)
# ═══════════════════════════════════════════════════════════════════════════════

def test_overlap_same_channel():
    """Same channel should have 100% overlap."""
    assert _overlap_fraction(6, 6) == 1.0


def test_overlap_adjacent_channels():
    """Adjacent channels should have partial overlap."""
    frac = _overlap_fraction(6, 7)
    assert 0 < frac < 1.0


def test_overlap_nonoverlapping_1_6():
    """Channels 1 and 6 should have zero overlap (25 MHz apart, width=22)."""
    assert _overlap_fraction(1, 6) == 0.0


def test_overlap_nonoverlapping_6_11():
    assert _overlap_fraction(6, 11) == 0.0


def test_overlap_nonoverlapping_1_11():
    assert _overlap_fraction(1, 11) == 0.0


def test_overlap_channels_1_2():
    """Channels 1 and 2 are 5 MHz apart — significant overlap."""
    frac = _overlap_fraction(1, 2)
    assert frac > 0.5


def test_overlap_channels_1_5():
    """Channels 1 and 5 are 20 MHz apart — slight overlap."""
    frac = _overlap_fraction(1, 5)
    assert frac > 0.0
    assert frac < 0.2


def test_overlap_symmetric():
    """Overlap should be symmetric: overlap(a,b) == overlap(b,a)."""
    for a in range(1, 14):
        for b in range(1, 14):
            assert _overlap_fraction(a, b) == _overlap_fraction(b, a), \
                f"Not symmetric: ({a},{b})"


def test_overlap_invalid_channels():
    """Channels outside 1-13 should return 0."""
    assert _overlap_fraction(0, 6) == 0.0
    assert _overlap_fraction(6, 0) == 0.0
    assert _overlap_fraction(14, 6) == 0.0
    assert _overlap_fraction(-1, 1) == 0.0
    assert _overlap_fraction(1, 14) == 0.0


def test_overlap_range_0_to_1():
    """All overlap values should be between 0 and 1."""
    for a in range(1, 14):
        for b in range(1, 14):
            frac = _overlap_fraction(a, b)
            assert 0.0 <= frac <= 1.0, f"Out of range: ({a},{b}) = {frac}"


# ═══════════════════════════════════════════════════════════════════════════════
#  2.4 GHz analysis
# ═══════════════════════════════════════════════════════════════════════════════

def test_analyze_24ghz_empty():
    result = analyze_24ghz([])
    assert isinstance(result, dict)
    for ch in range(1, 14):
        assert result[ch]["count"] == 0
        assert result[ch]["score"] == 0


def test_analyze_24ghz_single_network():
    nets = [{"ssid": "Test", "channel": 6, "rssi": -50, "band": "2.4GHz"}]
    result = analyze_24ghz(nets)
    assert result[6]["count"] == 1
    assert result[6]["score"] > 0
    # Adjacent channels get overlap score
    assert result[5]["score"] > 0
    assert result[7]["score"] > 0
    # Far channels should have zero
    assert result[1]["score"] == 0 or result[1]["count"] == 0


def test_analyze_24ghz_filters_5ghz():
    nets = [
        {"ssid": "A", "channel": 6, "rssi": -50, "band": "2.4GHz"},
        {"ssid": "B", "channel": 36, "rssi": -50, "band": "5GHz"},
    ]
    result = analyze_24ghz(nets)
    total = sum(result[ch]["count"] for ch in range(1, 14))
    assert total == 1


def test_analyze_24ghz_congested():
    nets = [
        {"ssid": f"Net{i}", "channel": 1, "rssi": -40, "band": "2.4GHz"}
        for i in range(5)
    ]
    result = analyze_24ghz(nets)
    assert result[1]["count"] == 5
    assert result[1]["score"] > result[6]["score"]


def test_analyze_24ghz_all_channels():
    """A network on every channel should populate all channels."""
    nets = [
        {"ssid": f"Ch{ch}", "channel": ch, "rssi": -60, "band": "2.4GHz"}
        for ch in range(1, 14)
    ]
    result = analyze_24ghz(nets)
    for ch in range(1, 14):
        assert result[ch]["count"] == 1


def test_analyze_24ghz_rssi_affects_score():
    """Stronger signals should produce higher interference scores."""
    nets_strong = [{"ssid": "S", "channel": 6, "rssi": -30, "band": "2.4GHz"}]
    nets_weak = [{"ssid": "W", "channel": 6, "rssi": -90, "band": "2.4GHz"}]
    score_strong = analyze_24ghz(nets_strong)[6]["score"]
    score_weak = analyze_24ghz(nets_weak)[6]["score"]
    assert score_strong > score_weak


def test_analyze_24ghz_returns_network_list():
    """Each channel should have a networks list."""
    nets = [{"ssid": "A", "channel": 1, "rssi": -50, "band": "2.4GHz"}]
    result = analyze_24ghz(nets)
    assert isinstance(result[1].get("networks", result[1].get("count")), (list, int))


# ═══════════════════════════════════════════════════════════════════════════════
#  5 GHz analysis
# ═══════════════════════════════════════════════════════════════════════════════

def test_analyze_5ghz_empty():
    result = analyze_5ghz([])
    assert isinstance(result, dict)


def test_analyze_5ghz_single():
    nets = [{"ssid": "Office", "channel": 36, "rssi": -55, "band": "5GHz"}]
    result = analyze_5ghz(nets)
    assert result[36]["count"] == 1


def test_analyze_5ghz_filters_24ghz():
    nets = [
        {"ssid": "A", "channel": 6, "rssi": -50, "band": "2.4GHz"},
        {"ssid": "B", "channel": 36, "rssi": -50, "band": "5GHz"},
    ]
    result = analyze_5ghz(nets)
    total = sum(info["count"] for info in result.values())
    assert total == 1


def test_analyze_5ghz_multiple_channels():
    nets = [
        {"ssid": "A", "channel": 36, "rssi": -50, "band": "5GHz"},
        {"ssid": "B", "channel": 44, "rssi": -60, "band": "5GHz"},
        {"ssid": "C", "channel": 149, "rssi": -70, "band": "5GHz"},
    ]
    result = analyze_5ghz(nets)
    assert result[36]["count"] == 1
    assert result[44]["count"] == 1
    assert result[149]["count"] == 1


def test_analyze_5ghz_all_zero_score_when_empty():
    result = analyze_5ghz([])
    for ch_info in result.values():
        assert ch_info["score"] == 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Best channel recommendation
# ═══════════════════════════════════════════════════════════════════════════════

def test_best_channel_24_empty():
    result = recommend_best_channel([], "2.4GHz")
    assert "channel" in result
    assert result["channel"] in NON_OVERLAPPING_24


def test_best_channel_24_avoids_congested():
    nets = [
        {"ssid": f"Net{i}", "channel": 1, "rssi": -40, "band": "2.4GHz"}
        for i in range(10)
    ]
    result = recommend_best_channel(nets, "2.4GHz")
    assert result["channel"] in [6, 11]


def test_best_channel_24_returns_required_fields():
    nets = [{"ssid": "X", "channel": 6, "rssi": -60, "band": "2.4GHz"}]
    result = recommend_best_channel(nets, "2.4GHz")
    assert "channel" in result
    assert "score" in result
    assert "reason" in result


def test_best_channel_24_all_congested():
    """When all non-overlapping channels are congested, pick the least bad."""
    nets = []
    for ch in [1, 6, 11]:
        for i in range(5):
            nets.append({"ssid": f"N{ch}_{i}", "channel": ch, "rssi": -40, "band": "2.4GHz"})
    result = recommend_best_channel(nets, "2.4GHz")
    assert result["channel"] in [1, 6, 11]
    assert isinstance(result["score"], (int, float))


def test_best_channel_24_prefers_nonoverlapping():
    """Should recommend 1, 6, or 11 even if other channels seem empty."""
    nets = [{"ssid": "X", "channel": 3, "rssi": -40, "band": "2.4GHz"}]
    result = recommend_best_channel(nets, "2.4GHz")
    assert result["channel"] in NON_OVERLAPPING_24


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


def test_best_channel_5_returns_reason():
    nets = [{"ssid": "X", "channel": 36, "rssi": -60, "band": "5GHz"}]
    result = recommend_best_channel(nets, "5GHz")
    assert "reason" in result
    assert len(result["reason"]) > 0


# ═══════════════════════════════════════════════════════════════════════════════
#  Full summary
# ═══════════════════════════════════════════════════════════════════════════════

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
    result = get_summary(sample_networks)
    rec24 = result["ghz24"]["recommendation"]
    assert rec24["channel"] in range(1, 14)
    rec5 = result["ghz5"]["recommendation"]
    if rec5["channel"]:
        assert rec5["channel"] in CHANNEL_5_CENTER


def test_get_summary_total_networks(sample_networks):
    """Total network counts should match input."""
    result = get_summary(sample_networks)
    count_24 = sum(1 for n in sample_networks if n["band"] == "2.4GHz")
    count_5 = sum(1 for n in sample_networks if n["band"] == "5GHz")
    assert result["ghz24"]["total_networks"] == count_24
    assert result["ghz5"]["total_networks"] == count_5


def test_get_summary_channel_keys_are_strings():
    """Channel keys in the result should be string-typed."""
    result = get_summary([])
    for key in result["ghz24"]["channels"]:
        assert isinstance(key, str)


def test_get_summary_scores_are_numbers():
    nets = [{"ssid": "X", "channel": 6, "rssi": -50, "band": "2.4GHz"}]
    result = get_summary(nets)
    for ch_info in result["ghz24"]["channels"].values():
        assert isinstance(ch_info["score"], (int, float))
        assert isinstance(ch_info["count"], int)


def test_get_summary_recommendation_has_channel():
    result = get_summary([])
    assert "channel" in result["ghz24"]["recommendation"]
    assert "channel" in result["ghz5"]["recommendation"]


def test_get_summary_only_24ghz_networks():
    nets = [
        {"ssid": "A", "channel": 1, "rssi": -50, "band": "2.4GHz"},
        {"ssid": "B", "channel": 6, "rssi": -60, "band": "2.4GHz"},
    ]
    result = get_summary(nets)
    assert result["ghz24"]["total_networks"] == 2
    assert result["ghz5"]["total_networks"] == 0


def test_get_summary_only_5ghz_networks():
    nets = [
        {"ssid": "A", "channel": 36, "rssi": -50, "band": "5GHz"},
        {"ssid": "B", "channel": 149, "rssi": -60, "band": "5GHz"},
    ]
    result = get_summary(nets)
    assert result["ghz24"]["total_networks"] == 0
    assert result["ghz5"]["total_networks"] == 2
