"""
main.py — WiFi Dashboard Backend  v1.0
FastAPI + WebSocket + system WiFi scanner + dual logger

Usage:
    cd backend
    pip install -r requirements.txt
    python main.py

Open http://localhost:8001 in Chrome or Edge.
"""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import List

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from wifi_manager import WiFiManager
from channel_analyzer import get_summary as channel_summary
from logger import WiFiLogger, CSV_FIELDS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="WiFi Dashboard", version="1.0.0")

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
LOG_FORMAT   = os.environ.get("WIFI_LOG_FORMAT", "both")   # csv | json | both

wifi_logger  = WiFiLogger(LOG_FORMAT)
wifi_manager: WiFiManager = None       # created once on first WS connection
active_ws: List[WebSocket] = []        # all connected browser clients


# ── broadcast ─────────────────────────────────────────────────────────────────
async def broadcast(event: dict):
    """Forward WiFi event to all WS clients and persist to log."""
    etype = event.get("type", "")

    # selective logging
    if etype == "scan_result":
        networks = event.get("networks", [])
        for net in networks[:5]:  # log first 5
            await wifi_logger.log_event(
                direction="rx", event_type="scan",
                network=net.get("ssid", ""),
                bssid=net.get("bssid", ""),
                channel=str(net.get("channel", "")),
                rssi=net.get("rssi"),
                security=net.get("security", ""),
            )

    # send to browsers
    dead = []
    msg  = json.dumps(event)
    for ws in active_ws:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_ws:
            active_ws.remove(ws)


# ── WebSocket ─────────────────────────────────────────────────────────────────
@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    active_ws.append(ws)
    logger.info("WS client connected  (total: %d)", len(active_ws))

    global wifi_manager
    if wifi_manager is None:
        wifi_manager = WiFiManager(notify_callback=broadcast)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "error", "message": "Invalid JSON"}))
                continue
            await _handle(msg, ws)

    except WebSocketDisconnect:
        if ws in active_ws:
            active_ws.remove(ws)
        logger.info("WS client disconnected (total: %d)", len(active_ws))


async def _handle(msg: dict, ws: WebSocket):
    t = msg.get("type", "")

    if t == "hello":
        await ws.send_text(json.dumps({
            "type": "hello_ack",
            "server": "WiFi Dashboard",
            "version": "1.0.0",
        }))

    elif t == "scan":
        asyncio.create_task(wifi_manager.scan(
            duration=float(msg.get("duration", 5)),
            ssid_filter=msg.get("ssid_filter", ""),
            rssi_min=int(msg.get("rssi_min", -100)),
            band=msg.get("band", "all"),
            simulate=bool(msg.get("simulate", False)),
        ))

    elif t == "scan_stop":
        await wifi_manager.stop_scan()

    elif t == "channel_analysis":
        networks = wifi_manager.last_networks
        summary = channel_summary(networks)
        await ws.send_text(json.dumps(summary))

    elif t == "best_channel":
        from channel_analyzer import recommend_best_channel
        band = msg.get("band", "2.4GHz")
        result = recommend_best_channel(wifi_manager.last_networks, band)
        result["type"] = "best_channel"
        await ws.send_text(json.dumps(result))

    elif t == "set_log_format":
        fmt = msg.get("format", "both")
        wifi_logger.set_format(fmt)
        await ws.send_text(json.dumps({"type": "log_format_ok", "format": fmt}))

    else:
        logger.warning("Unknown WS type: %s", t)
        await ws.send_text(json.dumps({"type": "error", "message": f"Unknown: {t}"}))


# ── REST API ──────────────────────────────────────────────────────────────────
@app.get("/api/status")
async def api_status():
    return {
        "scanning": wifi_manager._scanning if wifi_manager else False,
        "log_format": LOG_FORMAT,
        "version": "1.0.0",
    }

@app.get("/api/logs/csv", response_class=PlainTextResponse)
async def get_csv():
    return wifi_logger.read_csv()

@app.get("/api/logs/json", response_class=PlainTextResponse)
async def get_json():
    return wifi_logger.read_json()

@app.delete("/api/logs")
async def clear_logs():
    import csv as _csv
    from logger import CSV_PATH, JSON_PATH
    if CSV_PATH.exists():
        with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
            _csv.DictWriter(f, fieldnames=CSV_FIELDS).writeheader()
    if JSON_PATH.exists():
        JSON_PATH.write_text("")
    return {"status": "cleared"}

@app.post("/api/log_format/{fmt}")
async def set_log_format(fmt: str):
    if fmt not in ("csv", "json", "both"):
        return JSONResponse({"error": "Use: csv | json | both"}, status_code=400)
    wifi_logger.set_format(fmt)
    return {"log_format": fmt}


# ── static frontend ───────────────────────────────────────────────────────────
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
else:
    @app.get("/")
    async def root():
        return {"message": "Frontend not found. Place frontend/ next to backend/."}


# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=os.environ.get("WIFI_HOST", "0.0.0.0"),
        port=int(os.environ.get("PORT", os.environ.get("WIFI_PORT", 8002))),
        reload=False,
        log_level="info",
    )
