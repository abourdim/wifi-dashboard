#!/usr/bin/env bash
# ╔═══════════════════════════════════════════════════════════════╗
# ║  WiFi Dashboard — Launcher v1.0                              ║
# ║  Usage: bash launch.sh [start|stop|status|install|test]      ║
# ╚═══════════════════════════════════════════════════════════════╝

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Defaults ────────────────────────────────────────────────────
PORT="${WIFI_PORT:-8002}"
HOST="${WIFI_HOST:-0.0.0.0}"
LOG_FMT="${WIFI_LOG_FORMAT:-both}"
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_FILE="$SCRIPT_DIR/server.log"
VENV="$SCRIPT_DIR/.venv"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

info()  { echo -e "${CYAN}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✓${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
err()   { echo -e "${RED}✗${NC}  $1"; }

# ── Detect OS ───────────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)
      if [[ -f /proc/device-tree/model ]] && grep -qi "raspberry" /proc/device-tree/model 2>/dev/null; then
        echo "rpi"
      else
        echo "linux"
      fi ;;
    *) echo "unknown" ;;
  esac
}
OS=$(detect_os)

# ── Find Python ─────────────────────────────────────────────────
find_python() {
  if [[ -x "$VENV/bin/python" ]]; then echo "$VENV/bin/python"
  elif command -v python3 &>/dev/null; then echo "python3"
  elif command -v python &>/dev/null; then echo "python"
  else echo ""; fi
}

# ── Commands ────────────────────────────────────────────────────
cmd_install() {
  info "Installing WiFi Dashboard dependencies..."
  local py
  py=$(find_python)
  if [[ -z "$py" ]]; then
    err "Python not found. Install Python 3.10+."
    exit 1
  fi

  # Create venv if needed
  if [[ ! -d "$VENV" ]]; then
    info "Creating virtual environment..."
    "$py" -m venv "$VENV"
  fi

  info "Installing Python packages..."
  "$VENV/bin/pip" install -q -r backend/requirements.txt
  "$VENV/bin/pip" install -q websockets

  ok "Dependencies installed."

  # Check WiFi tools
  info "Checking WiFi scanner tools..."
  if [[ "$OS" == "macos" ]]; then
    if [[ -x "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport" ]]; then
      ok "macOS airport utility found."
    else
      warn "airport not found — simulate mode will be used."
    fi
  else
    if command -v nmcli &>/dev/null; then
      ok "nmcli found."
    elif command -v iw &>/dev/null; then
      ok "iw found (may need sudo for scanning)."
    else
      warn "No WiFi scanner found (nmcli/iw) — simulate mode will be used."
    fi
  fi
}

cmd_start() {
  local py
  py=$(find_python)
  if [[ -z "$py" ]]; then
    err "Python not found. Run: bash launch.sh install"
    exit 1
  fi

  # Check if already running
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      warn "Server already running (PID $pid) on port $PORT"
      return
    fi
    rm -f "$PID_FILE"
  fi

  info "Starting WiFi Dashboard on http://$HOST:$PORT ..."
  WIFI_PORT="$PORT" WIFI_HOST="$HOST" WIFI_LOG_FORMAT="$LOG_FMT" \
    "$VENV/bin/python" backend/main.py > "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  sleep 2

  if kill -0 "$pid" 2>/dev/null; then
    ok "Server started (PID $pid)"
    # Open browser
    if [[ "$OS" == "macos" ]]; then
      open "http://localhost:$PORT" 2>/dev/null || true
    elif command -v xdg-open &>/dev/null; then
      xdg-open "http://localhost:$PORT" 2>/dev/null || true
    fi
  else
    err "Server failed to start. Check $LOG_FILE"
    cat "$LOG_FILE"
  fi
}

cmd_stop() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      ok "Server stopped (PID $pid)"
    else
      warn "Server was not running."
    fi
    rm -f "$PID_FILE"
  else
    warn "No PID file found."
  fi
}

cmd_status() {
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    ok "Server running (PID $(cat "$PID_FILE")) on port $PORT"
    curl -s "http://localhost:$PORT/api/status" 2>/dev/null && echo
  else
    warn "Server not running."
  fi
}

cmd_test() {
  info "Running tests..."
  local py="$VENV/bin/python"
  if [[ ! -x "$py" ]]; then
    err "Virtual env not found. Run: bash launch.sh install"
    exit 1
  fi
  "$VENV/bin/pip" install -q pytest pytest-asyncio pytest-cov httpx 2>/dev/null
  cd "$SCRIPT_DIR"
  "$VENV/bin/python" -m pytest tests/ -v --tb=short
}

cmd_check() {
  echo -e "${BOLD}${CYAN}WiFi Dashboard — System Check${NC}"
  echo ""

  # Python
  local py
  py=$(find_python)
  if [[ -n "$py" ]]; then
    ok "Python: $("$py" --version 2>&1)"
  else
    err "Python: not found"
  fi

  # Venv
  if [[ -d "$VENV" ]]; then
    ok "Virtual env: $VENV"
  else
    warn "Virtual env: not created (run: bash launch.sh install)"
  fi

  # WiFi tools
  echo ""
  info "WiFi scanner tools:"
  if [[ "$OS" == "macos" ]]; then
    [[ -x "/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport" ]] \
      && ok "  airport: found" || warn "  airport: not found"
  else
    command -v nmcli &>/dev/null && ok "  nmcli: found" || warn "  nmcli: not found"
    command -v iw &>/dev/null && ok "  iw: found" || warn "  iw: not found"
  fi

  # Server status
  echo ""
  cmd_status
}

# ── TUI Menu ────────────────────────────────────────────────────
cmd_menu() {
  echo ""
  echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${CYAN}║     📡 WiFi Dashboard v1.0            ║${NC}"
  echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BOLD}1${NC}  Check installation"
  echo -e "  ${BOLD}2${NC}  Install / update dependencies"
  echo -e "  ${BOLD}3${NC}  Start server"
  echo -e "  ${BOLD}4${NC}  Stop server"
  echo -e "  ${BOLD}5${NC}  Open dashboard in browser"
  echo -e "  ${BOLD}6${NC}  Run tests"
  echo -e "  ${BOLD}7${NC}  Server status"
  echo -e "  ${BOLD}8${NC}  View server log"
  echo -e "  ${BOLD}q${NC}  Quit"
  echo ""
  read -r -p "  Choose: " choice
  case "$choice" in
    1) cmd_check ;;
    2) cmd_install ;;
    3) cmd_start ;;
    4) cmd_stop ;;
    5)
      if [[ "$OS" == "macos" ]]; then open "http://localhost:$PORT"
      elif command -v xdg-open &>/dev/null; then xdg-open "http://localhost:$PORT"
      else info "Open http://localhost:$PORT in your browser"; fi
      ;;
    6) cmd_test ;;
    7) cmd_status ;;
    8) [[ -f "$LOG_FILE" ]] && tail -30 "$LOG_FILE" || warn "No log file." ;;
    q|Q) exit 0 ;;
    *) warn "Unknown option." ;;
  esac
  echo ""
  cmd_menu
}

# ── Entry point ─────────────────────────────────────────────────
case "${1:-menu}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  status)  cmd_status ;;
  install) cmd_install ;;
  test)    cmd_test ;;
  check)   cmd_check ;;
  menu|*)  cmd_menu ;;
esac
