# Start Here

Welcome to WiFi Dashboard. This guide gets you scanning in under 2 minutes.

---

## Step 1: Launch

```bash
cd wifi-dashboard
bash launch.sh start
```

Your browser opens automatically to `http://localhost:8002`.

If it doesn't, open that URL manually.

---

## Step 2: First Scan

### With Real WiFi
Click the green **Scan** button in the Scanner card. Networks appear on the radar and in the list below it.

### Without WiFi (Demo Mode)
Click **Demo** next to the Scan button. This generates 8-16 simulated networks so you can explore every feature without WiFi hardware.

---

## Step 3: Explore

### Radar
Click **Radar** to toggle the animated radar view. Try different styles from the dropdown: Military, Tactical, Thermal, Sonar, Stars, Matrix, Submarine.

### Network Details
Click any network in the list to see its signal history chart, vendor info, and security details.

### Channel Analyzer
Scroll to the **Channel Analyzer** card and click **Analyze**. See which 2.4 GHz and 5 GHz channels are congested. The app recommends the best channel for your router.

### Monitor
Select a network, then scroll to the **Monitor** card. Watch its signal strength in real time. Use the slider to adjust how many data points to show.

### Achievements
Scan enough networks and you'll start unlocking badges. Check the **Achievements** card for your progress (20 badges total).

### Hacker Lab
The most advanced features:
- **Network Autopsy** - Pick a network for deep inspection
- **Packet Storm** - Watch animated packets fly across the screen
- **Time Travel** - Slide back through previous scan snapshots
- **RF Waterfall** - See channel usage change over time
- **Terminal** - Watch a hacker-style scrolling output of events

---

## Step 4: Customize

### Theme
Open **Settings** (gear icon in the nav bar). Pick from 8 themes: Mosque, Zellige, Andalus, Riad, Medina, Space, Jungle, Robot.

### Language
Switch between English, French, and Arabic in Settings.

### Filters
In the Scanner card:
- **SSID** - Type a name to filter by network name
- **Min RSSI** - Drag the slider to hide weak signals
- **Band** - Toggle between All, 2.4 GHz only, or 5 GHz only

---

## Step 5: Export

- **CSV** - Click the CSV button in the Scanner card to download network data
- **HTML** - Click HTML for a formatted report
- **Logs** - Visit `http://localhost:8002/api/logs/csv` or `/api/logs/json` for raw activity logs

---

## Stopping the Server

```bash
bash launch.sh stop
```

Or press `Ctrl+C` in the terminal where it's running.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "No WiFi tool found" | Use Demo mode, or install `nmcli` (Linux) |
| Port 8002 in use | Set `WIFI_PORT=9000 bash launch.sh start` |
| No networks found | Move closer to access points, or use Demo mode |
| WebSocket disconnects | Refresh the browser page |
| Server won't start | Run `bash launch.sh check` to diagnose |

---

## Next Steps

- Read the [How-To Guide](HOWTO.md) for specific tasks
- Check the [API Reference](../README.md#api-reference) for WebSocket and REST usage
- Run `bash launch.sh test` to verify everything works
