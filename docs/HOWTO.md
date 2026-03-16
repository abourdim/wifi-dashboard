# How-To Guide

Step-by-step instructions for common tasks.

---

## How to Find the Best WiFi Channel

1. Click **Scan** (or **Demo** for testing)
2. Wait for at least one scan to complete
3. Scroll to the **Channel Analyzer** card
4. Click **Analyze**
5. Look at the **Best Channel** recommendation for 2.4 GHz and 5 GHz
6. Log into your router admin panel and change to the recommended channel

**Why it matters:** Overlapping channels cause interference. Channels 1, 6, and 11 are the only non-overlapping 2.4 GHz channels. The analyzer scores each channel based on how many networks overlap with it and how strong their signals are.

---

## How to Detect Hidden Networks

1. Start a scan (real or demo)
2. Hidden networks appear in the list with SSID **[Hidden]**
3. They still broadcast their BSSID (MAC address), channel, and signal strength
4. Check the vendor field to identify the manufacturer
5. The **Hidden Hunter** achievement unlocks when you find your first hidden network

---

## How to Monitor Signal Stability

1. Click a network in the scanner list to select it
2. Scroll to the **Monitor** card
3. The RSSI chart updates in real time with each scan
4. Stats show: Min, Max, Average RSSI, and total data points
5. Use the slider to adjust the history window (10-500 points)
6. Click **Pause** to freeze the chart for analysis
7. Click **Export** to save the data

**Reading the chart:**
- Closer to 0 = stronger signal (e.g., -30 dBm is strong)
- Closer to -100 = weaker signal (e.g., -85 dBm is weak)
- Stable = flat line (good)
- Jumping = interference or movement (bad)

---

## How to Identify Network Vendors

Every network's BSSID (MAC address) starts with a 3-byte prefix assigned to the manufacturer. The dashboard looks up this prefix in a database of 260+ vendors.

1. Scan for networks
2. The **Vendor** column shows the manufacturer (e.g., TP-Link, Netgear, Apple, Ubiquiti)
3. In the **Command Center**, the **Vendor Pie Chart** shows distribution
4. Unknown vendors show as "Unknown"

---

## How to Check Network Security

1. Scan for networks
2. The **Security** column shows the encryption type:
   - **WPA3** - Best (green)
   - **WPA2** - Good (green)
   - **WPA** - Acceptable (yellow)
   - **WEP** - Weak, easily cracked (orange)
   - **Open** - No encryption at all (red)
3. The **Stealth Meter** in Command Center rates overall security of visible networks
4. The **Security Auditor** achievement unlocks when you find networks with different security levels

---

## How to Use the Hacker Lab

### Network Autopsy
1. Scan for networks
2. Click any network in the list
3. Open the **Hacker Lab** card
4. See deep details: channel width, frequency, vendor OUI, signal classification

### Packet Storm
1. Start scanning
2. Watch the animated canvas in Hacker Lab
3. Each dot represents a detected network event
4. Colors indicate signal strength

### Time Travel
1. Run multiple scans over time
2. Use the **Time Travel** slider to scroll through past snapshots
3. See which networks appeared and disappeared

### Terminal View
1. The terminal auto-populates with scan events
2. Shows timestamped entries in hacker-style green text
3. Useful for watching raw event flow

---

## How to Export Data

### Network List (CSV)
Click the **CSV** button in the Scanner card header. Downloads a file with all visible networks and their properties.

### Network List (HTML)
Click the **HTML** button for a formatted table you can open in any browser or paste into a report.

### Activity Logs
```bash
# CSV format
curl http://localhost:8002/api/logs/csv -o wifi_log.csv

# JSONL format
curl http://localhost:8002/api/logs/json -o wifi_log.jsonl
```

### Monitor Data
Click **Export** in the Monitor card to save the RSSI time series.

---

## How to Run on a Raspberry Pi

1. Install Raspberry Pi OS (Lite or Desktop)
2. Clone the repo:
   ```bash
   git clone <repo-url> wifi-dashboard
   cd wifi-dashboard
   ```
3. Run the launcher:
   ```bash
   bash launch.sh start
   ```
4. The launcher auto-detects `nmcli` or `iw`
5. Access from another device: `http://<pi-ip>:8002`

**Headless mode:** Set `WIFI_PORT=8002` and access from your phone or laptop on the same network.

---

## How to Change the Port

```bash
# Using environment variable
WIFI_PORT=9000 bash launch.sh start

# Or set it permanently
export WIFI_PORT=9000
bash launch.sh start
```

---

## How to Use the API Programmatically

### Python Example

```python
import asyncio
import websockets
import json

async def scan():
    async with websockets.connect("ws://localhost:8002/ws") as ws:
        # Handshake
        await ws.send(json.dumps({"type": "hello"}))
        print(await ws.recv())

        # Scan
        await ws.send(json.dumps({
            "type": "scan",
            "simulate": True,
            "duration": 3
        }))
        result = json.loads(await ws.recv())
        for net in result["networks"]:
            print(f"{net['ssid']:20s} ch{net['channel']:3d} {net['rssi']}dBm {net['security']}")

asyncio.run(scan())
```

### JavaScript Example

```javascript
const ws = new WebSocket("ws://localhost:8002/ws");
ws.onopen = () => ws.send(JSON.stringify({type: "hello"}));
ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "scan_result") {
        msg.networks.forEach(n =>
            console.log(`${n.ssid} ch${n.channel} ${n.rssi}dBm`)
        );
    }
};
// Start scan
ws.send(JSON.stringify({type: "scan", simulate: true}));
```

### curl Example

```bash
# Check server status
curl http://localhost:8002/api/status

# Get logs
curl http://localhost:8002/api/logs/csv

# Change log format
curl -X POST http://localhost:8002/api/log_format/json
```
