"""
channel_analyzer.py — WiFi channel congestion analysis and best channel recommendation.

2.4 GHz: Channels 1-13, each 22 MHz wide, center frequencies offset by 5 MHz.
  Non-overlapping: 1, 6, 11 (or 1, 5, 9, 13 in some regions)
5 GHz: Channels 36-165, non-overlapping with 20/40/80/160 MHz bandwidths.
"""

from typing import Dict, List, Optional

# 2.4 GHz channel center frequencies
CHANNEL_24_CENTER = {ch: 2412 + (ch - 1) * 5 for ch in range(1, 14)}
CHANNEL_24_WIDTH = 22  # MHz

# 5 GHz channel center frequencies (common UNII bands)
CHANNEL_5_CENTER = {}
for _ch in range(36, 65, 4):    # UNII-1 + UNII-2: 36,40,44,48,52,56,60,64
    CHANNEL_5_CENTER[_ch] = 5180 + (_ch - 36) * 5
for _ch in range(100, 145, 4):  # UNII-2e: 100,104,...,140,144
    CHANNEL_5_CENTER[_ch] = 5500 + (_ch - 100) * 5
for _ch in range(149, 166, 4):  # UNII-3: 149,153,157,161,165
    CHANNEL_5_CENTER[_ch] = 5745 + (_ch - 149) * 5

# 5 GHz channel groups (non-overlapping at 20 MHz)
CHANNEL_5_GROUPS = {
    "UNII-1": [36, 40, 44, 48],
    "UNII-2": [52, 56, 60, 64],
    "UNII-2e": list(range(100, 145, 4)),
    "UNII-3": [149, 153, 157, 161, 165],
}

NON_OVERLAPPING_24 = [1, 6, 11]


def _overlap_fraction(ch_a: int, ch_b: int) -> float:
    """Return overlap fraction (0.0-1.0) between two 2.4 GHz channels."""
    if ch_a < 1 or ch_a > 13 or ch_b < 1 or ch_b > 13:
        return 0.0
    center_a = CHANNEL_24_CENTER[ch_a]
    center_b = CHANNEL_24_CENTER[ch_b]
    separation = abs(center_a - center_b)
    if separation >= CHANNEL_24_WIDTH:
        return 0.0
    return 1.0 - (separation / CHANNEL_24_WIDTH)


def analyze_24ghz(networks: List[dict]) -> dict:
    """Analyze 2.4 GHz channel congestion.

    Returns per-channel scores and network counts.
    """
    channels = {}
    for ch in range(1, 14):
        channels[ch] = {"count": 0, "score": 0.0, "networks": []}

    nets_24 = [n for n in networks if n.get("band") == "2.4GHz"]

    for net in nets_24:
        ch = net.get("channel", 0)
        if ch < 1 or ch > 13:
            continue
        rssi = net.get("rssi", -100)
        # Signal weight: stronger signals contribute more interference
        # Convert RSSI to linear power weight (0-1 scale)
        weight = max(0, (rssi + 100)) / 70  # -100 → 0, -30 → 1

        for target_ch in range(1, 14):
            overlap = _overlap_fraction(ch, target_ch)
            if overlap > 0:
                channels[target_ch]["score"] += overlap * weight

        channels[ch]["count"] += 1
        channels[ch]["networks"].append({
            "ssid": net.get("ssid", ""),
            "bssid": net.get("bssid", ""),
            "rssi": rssi,
        })

    return channels


def analyze_5ghz(networks: List[dict]) -> dict:
    """Analyze 5 GHz channel utilization."""
    channels = {}
    for ch in CHANNEL_5_CENTER:
        channels[ch] = {"count": 0, "score": 0.0, "networks": []}

    nets_5 = [n for n in networks if n.get("band") == "5GHz"]

    for net in nets_5:
        ch = net.get("channel", 0)
        if ch not in channels:
            continue
        rssi = net.get("rssi", -100)
        weight = max(0, (rssi + 100)) / 70

        # 5 GHz channels don't overlap at 20 MHz width
        channels[ch]["count"] += 1
        channels[ch]["score"] += weight
        channels[ch]["networks"].append({
            "ssid": net.get("ssid", ""),
            "bssid": net.get("bssid", ""),
            "rssi": rssi,
        })

    return channels


def recommend_best_channel(networks: List[dict], band: str = "2.4GHz") -> dict:
    """Recommend the best channel for a given band.

    Returns: {channel, score, reason}
    """
    if band == "2.4GHz":
        analysis = analyze_24ghz(networks)
        # Only recommend non-overlapping channels
        candidates = NON_OVERLAPPING_24
        best_ch = min(candidates, key=lambda c: analysis[c]["score"])
        score = analysis[best_ch]["score"]
        count = analysis[best_ch]["count"]
        reason = (
            f"Channel {best_ch} has the lowest interference score ({score:.2f}) "
            f"with {count} network(s) on it"
        )
        if score == 0:
            reason = f"Channel {best_ch} is completely clear!"
        return {"channel": best_ch, "score": round(score, 2), "count": count, "reason": reason}
    else:
        analysis = analyze_5ghz(networks)
        if not analysis:
            return {"channel": 36, "score": 0, "count": 0, "reason": "No 5GHz data — default to channel 36"}
        best_ch = min(analysis.keys(), key=lambda c: analysis[c]["score"])
        score = analysis[best_ch]["score"]
        count = analysis[best_ch]["count"]
        # Determine which group
        group = "Unknown"
        for g, chs in CHANNEL_5_GROUPS.items():
            if best_ch in chs:
                group = g
                break
        reason = (
            f"Channel {best_ch} ({group}) has the lowest interference ({score:.2f}) "
            f"with {count} network(s)"
        )
        if score == 0:
            reason = f"Channel {best_ch} ({group}) is completely clear!"
        return {"channel": best_ch, "score": round(score, 2), "count": count, "reason": reason}


def get_summary(networks: List[dict]) -> dict:
    """Get full channel analysis summary for both bands."""
    ghz24 = analyze_24ghz(networks)
    ghz5 = analyze_5ghz(networks)
    rec24 = recommend_best_channel(networks, "2.4GHz")
    rec5 = recommend_best_channel(networks, "5GHz")

    nets_24 = len([n for n in networks if n.get("band") == "2.4GHz"])
    nets_5 = len([n for n in networks if n.get("band") == "5GHz"])

    return {
        "type": "channel_analysis",
        "ghz24": {
            "channels": {str(k): {"count": v["count"], "score": round(v["score"], 2)} for k, v in ghz24.items()},
            "total_networks": nets_24,
            "recommendation": rec24,
        },
        "ghz5": {
            "channels": {str(k): {"count": v["count"], "score": round(v["score"], 2)} for k, v in ghz5.items()},
            "total_networks": nets_5,
            "recommendation": rec5,
        },
    }
