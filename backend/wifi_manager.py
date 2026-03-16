"""
wifi_manager.py — Cross-platform WiFi scanner.

Platforms:
  macOS:  airport -s (Apple80211 framework)
  Linux:  nmcli dev wifi list --rescan yes
  RPi:    same as Linux, fallback to iw dev wlan0 scan
"""

import asyncio
import logging
import platform
import random
import re
import shutil
from typing import Callable, Dict, List, Optional

from oui_lookup import lookup_vendor

logger = logging.getLogger("wifi_manager")


def detect_os() -> str:
    """Detect platform: 'macos', 'linux', or 'rpi'."""
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    # Check for Raspberry Pi
    try:
        with open("/proc/device-tree/model", "r") as f:
            if "raspberry" in f.read().lower():
                return "rpi"
    except FileNotFoundError:
        pass
    try:
        with open("/etc/os-release", "r") as f:
            content = f.read().lower()
            if "raspbian" in content or "raspberry" in content:
                return "rpi"
    except FileNotFoundError:
        pass
    return "linux"


# macOS airport binary path
AIRPORT_BIN = "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport"


class WiFiManager:
    def __init__(self, notify_callback: Callable):
        self._cb = notify_callback
        self._scanning = False
        self._scan_task: Optional[asyncio.Task] = None
        self._os = detect_os()
        self._history: Dict[str, List[int]] = {}  # BSSID → RSSI history (last 20)
        self._last_networks: List[dict] = []
        logger.info("WiFiManager initialized — platform: %s", self._os)

    @property
    def last_networks(self) -> List[dict]:
        return self._last_networks

    async def scan(
        self,
        duration: float = 5.0,
        ssid_filter: str = "",
        rssi_min: int = -100,
        band: str = "all",
        simulate: bool = False,
    ) -> List[dict]:
        """Scan for WiFi networks. Returns list of network dicts."""
        self._scanning = True
        try:
            if simulate:
                networks = self._simulate()
            elif self._os == "macos":
                networks = await self._scan_macos()
            else:
                networks = await self._scan_linux()

            # Enrich with vendor and history
            for net in networks:
                net["vendor"] = lookup_vendor(net.get("bssid", ""))
                bssid = net.get("bssid", "")
                rssi = net.get("rssi", -100)
                if bssid not in self._history:
                    self._history[bssid] = []
                self._history[bssid].append(rssi)
                self._history[bssid] = self._history[bssid][-20:]
                net["rssi_history"] = list(self._history[bssid])

            # Apply filters
            if ssid_filter:
                filt = ssid_filter.lower()
                networks = [n for n in networks if filt in (n.get("ssid") or "").lower()]
            networks = [n for n in networks if (n.get("rssi") or -100) >= rssi_min]
            if band != "all":
                networks = [n for n in networks if n.get("band") == band]

            self._last_networks = networks

            # Broadcast result
            await self._cb({
                "type": "scan_result",
                "networks": networks,
            })
            return networks

        except Exception as e:
            logger.error("Scan error: %s", e)
            await self._cb({"type": "error", "message": f"Scan failed: {e}"})
            return []
        finally:
            self._scanning = False

    async def stop_scan(self):
        self._scanning = False
        if self._scan_task and not self._scan_task.done():
            self._scan_task.cancel()

    # ── macOS: airport -s ─────────────────────────────────────────────────
    async def _scan_macos(self) -> List[dict]:
        if not shutil.which(AIRPORT_BIN) and not __import__("os").path.exists(AIRPORT_BIN):
            logger.warning("airport binary not found, falling back to simulate")
            return self._simulate()

        proc = await asyncio.create_subprocess_exec(
            AIRPORT_BIN, "-s",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("airport error: %s", stderr.decode())
            return []

        return self._parse_airport(stdout.decode("utf-8", errors="replace"))

    def _parse_airport(self, output: str) -> List[dict]:
        """Parse macOS airport -s output.

        Format:
                            SSID BSSID             RSSI CHANNEL HT CC SECURITY
                        MyWiFi aa:bb:cc:dd:ee:ff -65  6       Y  -- WPA2(PSK/AES/AES)
        """
        lines = output.strip().split("\n")
        if len(lines) < 2:
            return []

        # Find header to determine column positions
        header = lines[0]
        # BSSID column is always at a fixed position; find it
        bssid_start = header.find("BSSID")
        if bssid_start < 0:
            return []

        rssi_start = header.find("RSSI")
        chan_start = header.find("CHANNEL")
        sec_start = header.find("SECURITY")

        networks = []
        for line in lines[1:]:
            if len(line) < bssid_start + 17:
                continue
            try:
                ssid = line[:bssid_start].strip()
                bssid = line[bssid_start:bssid_start + 17].strip()
                rest = line[bssid_start + 17:].split()
                if len(rest) < 3:
                    continue

                rssi = int(rest[0])
                channel_str = rest[1]
                # Channel can be like "6" or "6,+1" or "36,1"
                channel = int(channel_str.split(",")[0])
                frequency = self._channel_to_freq(channel)
                band = "5GHz" if channel > 14 else "2.4GHz"

                # Security is everything after the CC field
                security = "Open"
                if sec_start > 0 and len(line) > sec_start:
                    sec_raw = line[sec_start:].strip()
                    if sec_raw and sec_raw != "--":
                        security = self._normalize_security(sec_raw)

                networks.append({
                    "ssid": ssid or "[Hidden]",
                    "bssid": bssid,
                    "rssi": rssi,
                    "channel": channel,
                    "frequency": frequency,
                    "band": band,
                    "security": security,
                    "bandwidth": "20MHz",
                    "hidden": not bool(ssid),
                })
            except (ValueError, IndexError) as e:
                logger.debug("Skipping airport line: %s (%s)", line.strip(), e)
                continue

        return networks

    # ── Linux: nmcli / iw ────────────────────────────────────────────────
    async def _scan_linux(self) -> List[dict]:
        if shutil.which("nmcli"):
            return await self._scan_nmcli()
        elif shutil.which("iw"):
            return await self._scan_iw()
        else:
            logger.warning("No WiFi scanner found (nmcli/iw), falling back to simulate")
            return self._simulate()

    async def _scan_nmcli(self) -> List[dict]:
        proc = await asyncio.create_subprocess_exec(
            "nmcli", "-t", "-f",
            "SSID,BSSID,SIGNAL,FREQ,SECURITY,CHAN,RATE",
            "dev", "wifi", "list", "--rescan", "yes",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("nmcli error: %s", stderr.decode())
            return []

        return self._parse_nmcli(stdout.decode("utf-8", errors="replace"))

    def _parse_nmcli(self, output: str) -> List[dict]:
        """Parse nmcli -t colon-separated output."""
        networks = []
        for line in output.strip().split("\n"):
            if not line:
                continue
            # nmcli -t uses : as separator, but BSSID also has colons
            # Format: SSID:BSSID(escaped):SIGNAL:FREQ:SECURITY:CHAN:RATE
            # nmcli escapes colons in BSSID with \\:
            parts = line.replace("\\:", "@@").split(":")
            parts = [p.replace("@@", ":") for p in parts]
            if len(parts) < 6:
                continue
            try:
                ssid = parts[0]
                bssid = parts[1]
                signal = int(parts[2])  # nmcli gives 0-100 percentage
                rssi = signal - 100 if signal <= 100 else signal  # approximate dBm
                freq_str = parts[3]
                security = parts[4] if len(parts) > 4 else "Open"
                channel = int(parts[5]) if len(parts) > 5 and parts[5].isdigit() else 0

                freq = int(freq_str.split()[0]) if freq_str else 0
                band = "5GHz" if freq > 3000 else "2.4GHz"
                if channel == 0:
                    channel = self._freq_to_channel(freq)

                networks.append({
                    "ssid": ssid or "[Hidden]",
                    "bssid": bssid,
                    "rssi": rssi,
                    "channel": channel,
                    "frequency": freq,
                    "band": band,
                    "security": self._normalize_security(security),
                    "bandwidth": "20MHz",
                    "hidden": not bool(ssid),
                })
            except (ValueError, IndexError) as e:
                logger.debug("Skipping nmcli line: %s (%s)", line.strip(), e)
                continue
        return networks

    async def _scan_iw(self) -> List[dict]:
        """Fallback: use iw dev wlan0 scan (requires root on some systems)."""
        # Find wireless interface
        iface = await self._find_wireless_iface()
        if not iface:
            logger.warning("No wireless interface found")
            return self._simulate()

        proc = await asyncio.create_subprocess_exec(
            "sudo", "iw", "dev", iface, "scan",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            logger.error("iw scan error: %s", stderr.decode())
            return self._simulate()

        return self._parse_iw(stdout.decode("utf-8", errors="replace"))

    def _parse_iw(self, output: str) -> List[dict]:
        """Parse iw dev scan output."""
        networks = []
        current = None

        for line in output.split("\n"):
            line = line.strip()
            if line.startswith("BSS "):
                if current:
                    networks.append(current)
                bssid_match = re.match(r"BSS ([0-9a-f:]{17})", line)
                bssid = bssid_match.group(1) if bssid_match else ""
                current = {
                    "ssid": "[Hidden]", "bssid": bssid, "rssi": -100,
                    "channel": 0, "frequency": 0, "band": "2.4GHz",
                    "security": "Open", "bandwidth": "20MHz", "hidden": True,
                }
            elif current is None:
                continue
            elif line.startswith("freq:"):
                freq = int(line.split(":")[1].strip())
                current["frequency"] = freq
                current["band"] = "5GHz" if freq > 3000 else "2.4GHz"
                current["channel"] = self._freq_to_channel(freq)
            elif line.startswith("signal:"):
                rssi_match = re.search(r"-?\d+", line)
                if rssi_match:
                    current["rssi"] = int(float(rssi_match.group()))
            elif line.startswith("SSID:"):
                ssid = line.split(":", 1)[1].strip()
                if ssid:
                    current["ssid"] = ssid
                    current["hidden"] = False
            elif "WPA" in line or "RSN" in line:
                current["security"] = "WPA2" if "RSN" in line else "WPA"
            elif "WEP" in line:
                current["security"] = "WEP"

        if current:
            networks.append(current)
        return networks

    async def _find_wireless_iface(self) -> Optional[str]:
        """Find first wireless interface name."""
        proc = await asyncio.create_subprocess_exec(
            "iw", "dev",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        match = re.search(r"Interface\s+(\S+)", stdout.decode())
        return match.group(1) if match else None

    # ── Simulate mode ────────────────────────────────────────────────────
    def _simulate(self) -> List[dict]:
        """Generate realistic fake WiFi networks for demo/testing."""
        ssids = [
            "Home-WiFi", "Livebox-5G", "NETGEAR_EXT", "iPhone-Hotspot",
            "FreeWifi", "TP-Link_2G_Home", "HUAWEI-B315", "Bbox-42A",
            "eduroam", "AndroidAP_7", "SFR_WiFi", "Vodafone-Guest",
            "BT-Hub6", "Xfinity", "ASUS_5G", "RPi-Workshop",
            "MakerSpace", "Linksys03492", "Hidden-Net", "IoT-Sensors",
        ]
        bssids = [
            "14:CC:20:A1:B2:C3", "30:B5:C2:D4:E5:F6", "A0:63:91:12:34:56",
            "28:CF:DA:78:9A:BC", "C0:25:E9:DE:F0:11", "50:C7:BF:22:33:44",
            "1C:3B:F3:55:66:77", "44:32:C8:88:99:AA", "24:05:0F:BB:CC:DD",
            "78:D2:94:EE:FF:00", "E8:DE:27:11:22:33", "38:43:7D:44:55:66",
            "08:36:C9:77:88:99", "3C:37:86:AA:BB:CC", "2C:4D:54:DD:EE:FF",
            "B8:27:EB:00:11:22", "DC:A6:32:33:44:55", "98:FC:11:66:77:88",
            "74:44:01:99:AA:BB", "24:0A:C4:CC:DD:EE",
        ]
        channels_24 = [1, 1, 1, 3, 6, 6, 6, 6, 8, 9, 11, 11, 11, 13]
        channels_5 = [36, 40, 44, 48, 52, 100, 149, 153, 157, 161]
        securities = ["WPA2", "WPA2", "WPA2", "WPA3", "WPA", "Open", "WEP", "WPA2"]

        count = 8 + random.randint(0, 8)  # 8-16 networks
        networks = []
        for i in range(count):
            is_5g = random.random() < 0.35
            channel = random.choice(channels_5) if is_5g else random.choice(channels_24)
            rssi = random.randint(-90, -25)
            ssid = ssids[i % len(ssids)]
            bssid = bssids[i % len(bssids)]

            # Randomize last 2 octets for uniqueness
            parts = bssid.split(":")
            parts[4] = f"{random.randint(0, 255):02X}"
            parts[5] = f"{random.randint(0, 255):02X}"
            bssid = ":".join(parts)

            hidden = random.random() < 0.08  # 8% hidden

            networks.append({
                "ssid": "[Hidden]" if hidden else ssid,
                "bssid": bssid,
                "rssi": rssi,
                "channel": channel,
                "frequency": self._channel_to_freq(channel),
                "band": "5GHz" if is_5g else "2.4GHz",
                "security": random.choice(securities),
                "bandwidth": random.choice(["20MHz", "40MHz"]) if not is_5g else random.choice(["40MHz", "80MHz"]),
                "hidden": hidden,
            })

        return networks

    # ── Helpers ───────────────────────────────────────────────────────────
    @staticmethod
    def _channel_to_freq(channel: int) -> int:
        if 1 <= channel <= 13:
            return 2412 + (channel - 1) * 5
        elif channel == 14:
            return 2484
        elif 36 <= channel <= 64:
            return 5180 + (channel - 36) * 5
        elif 100 <= channel <= 144:
            return 5500 + (channel - 100) * 5
        elif 149 <= channel <= 165:
            return 5745 + (channel - 149) * 5
        return 0

    @staticmethod
    def _freq_to_channel(freq: int) -> int:
        if 2412 <= freq <= 2472:
            return (freq - 2412) // 5 + 1
        elif freq == 2484:
            return 14
        elif 5180 <= freq <= 5320:
            return (freq - 5180) // 5 + 36
        elif 5500 <= freq <= 5720:
            return (freq - 5500) // 5 + 100
        elif 5745 <= freq <= 5825:
            return (freq - 5745) // 5 + 149
        return 0

    @staticmethod
    def _normalize_security(raw: str) -> str:
        raw = raw.upper()
        if "WPA3" in raw:
            return "WPA3"
        if "WPA2" in raw or "RSN" in raw:
            return "WPA2"
        if "WPA" in raw:
            return "WPA"
        if "WEP" in raw:
            return "WEP"
        if raw in ("", "--", "NONE"):
            return "Open"
        return raw
