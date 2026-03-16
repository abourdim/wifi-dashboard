# WiFi Dashboard

Real-time WiFi network scanner, channel analyzer, and signal monitor.
Built for macOS, Linux, and Raspberry Pi.

![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What It Does

- **Scan** nearby WiFi networks in real time (2.4 GHz and 5 GHz)
- **Analyze** channel congestion and get best-channel recommendations
- **Monitor** signal strength (RSSI) with live charts
- **Identify** vendors by MAC address (260+ OUI prefixes)
- **Detect** hidden networks, open/WEP/WPA2/WPA3 security
- **Visualize** with 7 radar styles (Military, Tactical, Thermal, Sonar, Stars, Matrix, Submarine)
- **Track** achievements, trading cards, missions, and XP
- **Explore** Hacker Lab: packet storm, time travel, RF waterfall, terminal view
- **Log** all activity to CSV and/or JSONL

---

## Quick Start

```bash
# Clone and launch
git clone <repo-url> wifi-dashboard
cd wifi-dashboard
bash launch.sh start
```

The launcher will:
1. Create a Python virtual environment
2. Install dependencies (FastAPI, Uvicorn)
3. Start the server on port **8002**
4. Open `http://localhost:8002` in your browser

### Manual Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python backend/main.py
```

### Demo Mode (No WiFi Hardware)

Click **Demo** in the scanner card, or connect via WebSocket with `{"type": "scan", "simulate": true}`.
Works on any machine without WiFi tools installed.

---

## Requirements

| Platform | WiFi Tool | Fallback |
|----------|-----------|----------|
| macOS | `airport` (built-in) | Simulate mode |
| Linux | `nmcli` (NetworkManager) | `iw` (wireless-tools) |
| Raspberry Pi | `nmcli` or `iw` | Simulate mode |

**Python packages** (auto-installed):
- `fastapi >= 0.110.0`
- `uvicorn[standard] >= 0.29.0`
- `aiofiles >= 23.2.1`

---

## Features

### Scanner
Discover all nearby WiFi networks. Filter by SSID, minimum signal strength, or band (2.4/5 GHz). Export results to CSV or HTML.

### Channel Analyzer
Visual breakdown of 2.4 GHz and 5 GHz channel usage. Overlap scoring for 2.4 GHz channels (22 MHz width, non-overlapping 1/6/11). Best-channel recommendation with congestion scores.

### Monitor
Live RSSI line chart for any selected network. Configurable history window (10-500 data points). Min/Max/Avg statistics. Pause, toggle grid, export data.

### Radar
Canvas-based radar visualization of discovered networks. Seven visual styles with smooth animation. Signal strength mapped to distance from center.

### Achievements & Collection
20 badges to earn (Network Spy, Channel Master, Band Hopper, Security Auditor, Hidden Hunter, Signal Pro, and more). Trading cards for each unique network. Mission mode with XP and levels.

### Hacker Lab
- **Network Autopsy** - Deep packet-level inspection
- **Packet Storm** - Real-time animated packet visualization
- **Time Travel** - Scroll through historical scan snapshots
- **RF Waterfall** - Channel frequency occupancy over time
- **Terminal** - Hacker-style scrolling output

### Command Center
Scan analytics, vendor pie chart, RSSI histogram, network leaderboard, signal heatmap, co-location graph, sound signatures, stealth meter, scan diff, network graveyard.

---

## API Reference

### WebSocket `/ws`

Connect and send JSON messages:

```json
{"type": "hello"}
{"type": "scan", "simulate": true, "duration": 5, "band": "all"}
{"type": "scan_stop"}
{"type": "channel_analysis"}
{"type": "best_channel", "band": "2.4GHz"}
{"type": "set_log_format", "format": "both"}
```

#### Responses

| Type | Description |
|------|-------------|
| `hello_ack` | Server handshake with version |
| `scan_result` | Array of discovered networks |
| `channel_analysis` | Full 2.4/5 GHz congestion data |
| `best_channel` | Recommended channel + reason |
| `error` | Error message |

#### Network Object

```json
{
  "ssid": "Home-WiFi",
  "bssid": "14:CC:20:A1:B2:C3",
  "rssi": -65,
  "channel": 6,
  "frequency": 2437,
  "band": "2.4GHz",
  "security": "WPA2",
  "bandwidth": "20MHz",
  "vendor": "TP-Link",
  "hidden": false,
  "rssi_history": [-65, -63, -67]
}
```

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Server status, scan state, version |
| GET | `/api/logs/csv` | Download CSV log |
| GET | `/api/logs/json` | Download JSONL log |
| DELETE | `/api/logs` | Clear all logs |
| POST | `/api/log_format/{fmt}` | Set format: `csv`, `json`, or `both` |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8002` | Server port |
| `WIFI_PORT` | `8002` | Alternative port variable |

---

## UI Customization

### Themes
Mosque, Zellige, Andalus, Riad, Medina, Space, Jungle, Robot

### Languages
English, French, Arabic (with RTL support)

### Radar Styles
Military (green), Tactical (amber), Thermal (heat), Sonar (blue), Stars (white), Matrix (green rain), Submarine (deep blue)

---

## Testing

```bash
# Install test deps
pip install pytest pytest-asyncio httpx

# Run all 60 tests
python -m pytest tests/ -v

# With coverage
python -m pytest tests/ --cov=backend
```

### Test Modules

| Module | Tests | Covers |
|--------|-------|--------|
| `test_wifi_manager.py` | 24 | Scanning, parsing, filters, simulate, RSSI history |
| `test_channel_analyzer.py` | 18 | Overlap scoring, best channel, congestion, summary |
| `test_logger.py` | 8 | CSV/JSONL logging, format switching, read/write |
| `test_api.py` | 10 | REST endpoints, WebSocket messages |

---

## Project Structure

```
wifi-dashboard/
  backend/
    main.py              # FastAPI server + WebSocket
    wifi_manager.py      # Cross-platform WiFi scanner
    channel_analyzer.py  # 2.4/5 GHz congestion engine
    logger.py            # Dual CSV/JSONL logger
    oui_lookup.py        # MAC vendor database (260+ entries)
    requirements.txt
  frontend/
    index.html           # Single-page app
    wifi.js              # Core scanner + radar client
    wifi.css             # WiFi-specific styles
    channel.js           # Channel analyzer UI
    channel.css          # Channel visualization styles
    badges.js            # Achievements + trading cards
    badges.css           # Badge styles
    features.js          # Hacker Lab + Command Center
    features.css         # Feature styles
    script.js            # Shared UI (themes, i18n, help)
    style.css            # Base styles
    radar-styles.css     # 7 radar visual themes
  tests/
    conftest.py          # Shared fixtures
    test_wifi_manager.py
    test_channel_analyzer.py
    test_logger.py
    test_api.py
  launch.sh              # TUI launcher
```

---

## Launcher Commands

```bash
bash launch.sh start     # Install deps + start server
bash launch.sh stop      # Stop server
bash launch.sh status    # Check if running
bash launch.sh install   # Install/update deps only
bash launch.sh test      # Run test suite
bash launch.sh check     # Check WiFi tools + Python
bash launch.sh menu      # Interactive TUI menu
```

---

## License

MIT
