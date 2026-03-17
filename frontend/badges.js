/**
 * badges.js — Achievements, Trading Cards, Signal Gauge, Academy, Network Diary
 * Loaded after ble.js. Hooks into existing WebSocket events via monkey-patching.
 */

/* ═══════════════════════════════════
   ACHIEVEMENT DEFINITIONS
   ═══════════════════════════════════ */
const ACHIEVEMENTS = [
  // Scanning milestones
  { id:'first_scan',      icon:'🔍', name:'First Scan',       desc:'Start your first WiFi scan',              condition: s => s.scans >= 1 },
  { id:'marathon',        icon:'🏃', name:'Marathon Scanner',  desc:'Run 50 scans',                            condition: s => s.scans >= 50 },

  // Discovery milestones
  { id:'explorer',        icon:'🧭', name:'Explorer',          desc:'Find 5 different networks',               condition: s => s.uniqueNetworks >= 5 },
  { id:'collector',       icon:'🏆', name:'Collector',         desc:'Find 25 different networks',              condition: s => s.uniqueNetworks >= 25 },
  { id:'hunter',          icon:'🎯', name:'Network Hunter',    desc:'Find 50 different networks',              condition: s => s.uniqueNetworks >= 50 },
  { id:'cartographer',    icon:'🗺️', name:'Cartographer',      desc:'Find 100 different networks',             condition: s => s.uniqueNetworks >= 100 },

  // Interaction badges
  { id:'network_spy',     icon:'🕵️', name:'Network Spy',       desc:'View details of a network',               condition: s => s.detailViews >= 1 },
  { id:'channel_master',  icon:'📊', name:'Channel Master',    desc:'Analyze WiFi channels',                   condition: s => s.channelAnalysis >= 1 },
  { id:'band_hopper',     icon:'📡', name:'Band Hopper',       desc:'Discover networks on both 2.4 and 5 GHz', condition: s => s.bands24 >= 1 && s.bands5 >= 1 },
  { id:'security_auditor',icon:'🔓', name:'Security Auditor',  desc:'Find an open (unsecured) network',        condition: s => s.openNetworks >= 1 },
  { id:'hidden_hunter',   icon:'👻', name:'Hidden Hunter',     desc:'Find a hidden SSID',                      condition: s => s.hiddenSSIDs >= 1 },
  { id:'signal_pro',      icon:'💪', name:'Signal Pro',        desc:'Find a signal stronger than -30 dBm',     condition: s => s.strongSignals >= 1 },

  // Feature usage
  { id:'radar_user',      icon:'📡', name:'Radar Operator',    desc:'Use radar view',                          condition: s => s.radarUsed >= 1 },
  { id:'exporter',        icon:'💾', name:'Data Scientist',    desc:'Export data (CSV, logs, or snapshot)',     condition: s => s.exports >= 1 },

  // Vendor diversity
  { id:'vendor_variety',  icon:'🏢', name:'Vendor Spotter',    desc:'Find networks from 5 different vendors',  condition: s => s.uniqueVendors >= 5 },
  { id:'vendor_expert',   icon:'🏭', name:'Vendor Expert',     desc:'Find networks from 15 different vendors', condition: s => s.uniqueVendors >= 15 },

  // Signal mastery
  { id:'weak_finder',     icon:'🔎', name:'Needle Finder',     desc:'Detect a network weaker than -85 dBm',    condition: s => s.weakSignals >= 1 },
  { id:'crowded_space',   icon:'🏟️', name:'Crowded Space',     desc:'See 20+ networks in a single scan',       condition: s => s.maxNetworksInScan >= 20 },

  // Time-based
  { id:'night_owl',       icon:'🦉', name:'Night Owl',         desc:'Use the dashboard after 10 PM',           condition: s => s.nightOwl >= 1 },
  { id:'early_bird',      icon:'🐦', name:'Early Bird',        desc:'Use the dashboard before 7 AM',           condition: s => s.earlyBird >= 1 },
];

/* ═══════════════════════════════════
   STATE — persisted in localStorage
   ═══════════════════════════════════ */
const STORAGE_KEY = 'wifi-dashboard-badges';
const DIARY_KEY   = 'wifi-dashboard-diary';
const CARDS_KEY   = 'wifi-dashboard-cards';

function _loadStats() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function _saveStats(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function _getStats() {
  const d = _loadStats();
  return {
    scans: d.scans || 0,
    uniqueNetworks: d.uniqueNetworks || 0,
    detailViews: d.detailViews || 0,
    channelAnalysis: d.channelAnalysis || 0,
    bands24: d.bands24 || 0,
    bands5: d.bands5 || 0,
    openNetworks: d.openNetworks || 0,
    hiddenSSIDs: d.hiddenSSIDs || 0,
    strongSignals: d.strongSignals || 0,
    weakSignals: d.weakSignals || 0,
    radarUsed: d.radarUsed || 0,
    exports: d.exports || 0,
    uniqueVendors: d.uniqueVendors || 0,
    maxNetworksInScan: d.maxNetworksInScan || 0,
    nightOwl: d.nightOwl || 0,
    earlyBird: d.earlyBird || 0,
    unlocked: d.unlocked || [],
    networksSeen: d.networksSeen || [],
    vendorsSeen: d.vendorsSeen || [],
  };
}
function _incStat(key, val) {
  const d = _loadStats();
  d[key] = (d[key] || 0) + (val || 1);
  _saveStats(d);
  _checkAchievements();
}
function _setStat(key, val) {
  const d = _loadStats();
  d[key] = val;
  _saveStats(d);
}
function _addNetwork(bssid) {
  if (!bssid) return;
  const d = _loadStats();
  if (!d.networksSeen) d.networksSeen = [];
  if (!d.networksSeen.includes(bssid)) {
    d.networksSeen.push(bssid);
    d.uniqueNetworks = d.networksSeen.length;
    _saveStats(d);
    _checkAchievements();
  }
}
function _addVendor(vendor) {
  if (!vendor) return;
  const d = _loadStats();
  if (!d.vendorsSeen) d.vendorsSeen = [];
  const normalized = vendor.trim().toLowerCase();
  if (normalized && !d.vendorsSeen.includes(normalized)) {
    d.vendorsSeen.push(normalized);
    d.uniqueVendors = d.vendorsSeen.length;
    _saveStats(d);
    _checkAchievements();
  }
}

/* ═══════════════════════════════════
   CHECK & UNLOCK ACHIEVEMENTS
   ═══════════════════════════════════ */
function _checkAchievements() {
  const stats = _getStats();
  let newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (!stats.unlocked.includes(a.id) && a.condition(stats)) {
      stats.unlocked.push(a.id);
      newlyUnlocked.push(a);
    }
  });
  if (newlyUnlocked.length) {
    _setStat('unlocked', stats.unlocked);
    newlyUnlocked.forEach(a => _showBadgeToast(a));
    _renderBadges();
  }
}

function _showBadgeToast(achievement) {
  const toast = document.createElement('div');
  toast.className = 'badge-toast';
  toast.innerHTML =
    '<span class="badge-toast-icon">' + achievement.icon + '</span>' +
    '<div>' +
      '<div class="badge-toast-text">ACHIEVEMENT UNLOCKED!</div>' +
      '<div class="badge-toast-name">' + achievement.name + '</div>' +
    '</div>';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'badgeToastOut .4s ease forwards';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
  // Play sound if available
  if (typeof playSound === 'function') playSound('success');
}

/* ═══════════════════════════════════
   RENDER BADGES GRID
   ═══════════════════════════════════ */
function _renderBadges() {
  const container = document.getElementById('badgeGrid');
  if (!container) return;
  const stats = _getStats();
  const unlocked = stats.unlocked || [];

  container.innerHTML = '';
  ACHIEVEMENTS.forEach(a => {
    const isUnlocked = unlocked.includes(a.id);
    const card = document.createElement('div');
    card.className = 'badge-card ' + (isUnlocked ? 'unlocked' : 'locked');
    card.title = a.desc;
    card.innerHTML =
      '<span class="badge-icon">' + a.icon + '</span>' +
      '<span class="badge-name">' + a.name + '</span>' +
      '<span class="badge-desc">' + (isUnlocked ? a.desc : '???') + '</span>' +
      (isUnlocked ? '<span class="badge-stamp">&#10003;</span>' : '');
    container.appendChild(card);
  });

  // Update progress bar
  const pFill = document.getElementById('badgeProgressFill');
  const pText = document.getElementById('badgeProgressText');
  if (pFill && pText) {
    const pct = Math.round((unlocked.length / ACHIEVEMENTS.length) * 100);
    pFill.style.width = pct + '%';
    pText.textContent = unlocked.length + '/' + ACHIEVEMENTS.length;
  }
}

/* ═══════════════════════════════════
   NETWORK TRADING CARDS
   ═══════════════════════════════════ */
function _loadCards() {
  try { return JSON.parse(localStorage.getItem(CARDS_KEY)) || {}; } catch { return {}; }
}
function _saveCards(cards) {
  try { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); } catch {}
}

function _addTradingCard(network) {
  const bssid = network.bssid || network.address || network.id;
  if (!bssid) return;
  const cards = _loadCards();
  if (cards[bssid]) {
    cards[bssid].visits++;
    cards[bssid].lastSeen = Date.now();
    cards[bssid].bestRssi = Math.max(cards[bssid].bestRssi || -100, network.rssi || -100);
    if (network.ssid && network.ssid !== cards[bssid].name) {
      cards[bssid].name = network.ssid;
    }
  } else {
    cards[bssid] = {
      name: network.ssid || '(hidden)',
      addr: bssid,
      vendor: network.vendor || '',
      channel: network.channel || 0,
      security: network.security || network.encryption || '',
      rssi: network.rssi || -100,
      bestRssi: network.rssi || -100,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      visits: 1,
    };
  }
  _saveCards(cards);
}

function _getRarity(card) {
  if (card.visits >= 20) return 'legendary';
  if (card.visits >= 10) return 'epic';
  if (card.visits >= 5)  return 'rare';
  if (card.visits >= 2)  return 'uncommon';
  return 'common';
}

function _getDeviceIcon(name, vendor) {
  const n = (name + ' ' + vendor).toLowerCase();
  if (n.includes('iphone') || n.includes('android') || n.includes('hotspot') || n.includes('phone')) return '📱';
  if (n.includes('printer') || n.includes('hp ') || n.includes('epson') || n.includes('canon'))     return '🖨️';
  if (n.includes('camera') || n.includes('ring') || n.includes('nest'))                              return '📷';
  if (n.includes('tv') || n.includes('roku') || n.includes('chromecast') || n.includes('fire'))      return '📺';
  if (n.includes('echo') || n.includes('alexa') || n.includes('homepod') || n.includes('sonos'))     return '🔊';
  if (n.includes('tesla') || n.includes('car'))                                                       return '🚗';
  if (n.includes('mesh') || n.includes('eero') || n.includes('velop') || n.includes('orbi'))         return '🕸️';
  if (n.includes('repeater') || n.includes('extender') || n.includes('range'))                       return '📶';
  if (n.includes('ubiquiti') || n.includes('unifi') || n.includes('aruba') || n.includes('cisco'))   return '🏢';
  if (n.includes('guest'))                                                                            return '🏨';
  if (n.includes('xfinity') || n.includes('comcast') || n.includes('spectrum'))                      return '🌐';
  if (n.includes('iot') || n.includes('smart') || n.includes('tuya'))                                return '💡';
  return '📡';
}

function _renderTradingCards() {
  const container = document.getElementById('tradingCards');
  if (!container) return;
  const cards = _loadCards();
  const arr = Object.values(cards).sort((a, b) => b.lastSeen - a.lastSeen);

  if (!arr.length) {
    container.innerHTML = '<div class="ble-empty">Scan to discover networks and collect cards!</div>';
    return;
  }

  container.innerHTML = '';
  arr.forEach((c, cardIdx) => {
    const rarity = _getRarity(c);
    const icon = _getDeviceIcon(c.name, c.vendor);
    const firstDate = new Date(c.firstSeen);
    const dateStr = firstDate.toLocaleDateString() + ' ' +
      firstDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const el = document.createElement('div');
    el.className = 'trading-card rarity-' + rarity;
    const nickname = typeof _getNickname === 'function' ? _getNickname(c.addr) : '';
    el.onclick = () => { if (typeof promptNickname === 'function') promptNickname(c.addr); };
    el.title = 'Click to set nickname';
    el.innerHTML =
      '<div class="tc-header">' +
        '<span class="tc-icon">' + icon + '</span>' +
        '<span class="tc-name">' + _esc(nickname || c.name) + '</span>' +
        '<span class="tc-rarity ' + rarity + '">' + rarity + '</span>' +
      '</div>' +
      (nickname ? '<div style="font-size:.55rem;color:#38bdf8;font-weight:600">aka ' + _esc(c.name) + '</div>' : '') +
      '<div class="tc-vendor">' + _esc(c.vendor || 'Unknown vendor') + '</div>' +
      '<div class="tc-stats">' +
        '<div><span class="tc-stat-label">Best Signal</span><span class="tc-stat-value">' + c.bestRssi + ' dBm</span></div>' +
        '<div><span class="tc-stat-label">Channel</span><span class="tc-stat-value">' + (c.channel || '?') + '</span></div>' +
        '<div><span class="tc-stat-label">Visits</span><span class="tc-stat-value">' + c.visits + '</span></div>' +
      '</div>' +
      (c.security ? '<div class="tc-security" style="font-size:.55rem;color:#94a3b8;margin-top:2px">' + _esc(c.security) + '</div>' : '') +
      '<div class="tc-dna">' + (typeof generateDeviceDNA === 'function' ? generateDeviceDNA(c.addr) : '') + '</div>' +
      '<div class="tc-first-seen">First seen: ' + dateStr + '</div>' +
      '<span class="tc-count">#' + (cardIdx + 1) + '</span>';
    container.appendChild(el);
  });

  // Update collection count
  const countEl = document.getElementById('cardCount');
  if (countEl) countEl.textContent = arr.length + ' collected';
}

function _esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

/* ═══════════════════════════════════
   LIVE SIGNAL GAUGE
   ═══════════════════════════════════ */
let _gaugeInterval = null;

function _initGauge() {
  const wrap = document.getElementById('signalGauge');
  if (!wrap) return;
  wrap.innerHTML =
    '<svg viewBox="0 0 200 110">' +
      '<path class="gauge-bg" d="M 20 100 A 80 80 0 0 1 180 100" />' +
      '<path id="gaugeFill" class="gauge-fill" d="M 20 100 A 80 80 0 0 1 180 100" ' +
        'stroke="#38bdf8" stroke-dasharray="251" stroke-dashoffset="251" />' +
      '<text class="gauge-ticks" x="15" y="108" text-anchor="middle">-100</text>' +
      '<text class="gauge-ticks" x="100" y="22" text-anchor="middle">-50</text>' +
      '<text class="gauge-ticks" x="185" y="108" text-anchor="middle">0</text>' +
    '</svg>' +
    '<div class="gauge-label"><span id="gaugeValue">--</span><span class="gauge-unit">dBm</span></div>';
}

function _updateGauge(rssi) {
  const fill = document.getElementById('gaugeFill');
  const valEl = document.getElementById('gaugeValue');
  if (!fill || !valEl) return;

  const clamped = Math.max(-100, Math.min(0, rssi || -100));
  const pct = (clamped + 100) / 100; // 0..1
  const arcLen = 251;
  fill.setAttribute('stroke-dashoffset', arcLen * (1 - pct));

  // Color: red -> yellow -> green -> cyan
  let color;
  if (pct < 0.25) color = '#ef4444';
  else if (pct < 0.5) color = '#fb923c';
  else if (pct < 0.75) color = '#34d399';
  else color = '#38bdf8';
  fill.setAttribute('stroke', color);

  valEl.textContent = clamped;
  valEl.style.color = color;
}

/* ═══════════════════════════════════
   FREQUENCY MAP (EM Spectrum visual)
   ═══════════════════════════════════ */
function _drawFreqMap() {
  const canvas = document.getElementById('freqMapCanvas');
  if (!canvas) return;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return; // Collapsed — will redraw when opened
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width = cw * 2;
  const h = canvas.height = ch * 2;
  ctx.scale(2, 2);

  // EM spectrum bands (log scale approximation, visual only)
  const bands = [
    { name: 'AM Radio',    freq: '0.5-1.7 MHz',   color: '#64748b', start: 0,    end: 0.06 },
    { name: 'FM Radio',    freq: '88-108 MHz',     color: '#34d399', start: 0.06, end: 0.18 },
    { name: 'TV',          freq: '470-890 MHz',    color: '#0ea5e9', start: 0.18, end: 0.30 },
    { name: 'Cell/4G/5G',  freq: '700-2600 MHz',   color: '#fb923c', start: 0.30, end: 0.42 },
    { name: 'WiFi 2.4',    freq: '2.4 GHz',        color: '#38bdf8', start: 0.42, end: 0.54, highlight: true },
    { name: 'BLE',         freq: '2.4 GHz',        color: '#64748b', start: 0.54, end: 0.60 },
    { name: 'WiFi 5',      freq: '5 GHz',          color: '#38bdf8', start: 0.60, end: 0.74, highlight: true },
    { name: 'WiFi 6E',     freq: '6 GHz',          color: '#38bdf8', start: 0.74, end: 0.84, highlight: true },
    { name: 'Microwave',   freq: '2.45 GHz',       color: '#64748b', start: 0.84, end: 0.92 },
    { name: 'Satellite',   freq: '12+ GHz',        color: '#2dd4bf', start: 0.92, end: 1.0 },
  ];

  ctx.clearRect(0, 0, cw, ch);

  bands.forEach(b => {
    const x = b.start * cw;
    const bw = (b.end - b.start) * cw;
    const alpha = b.highlight ? 0.25 : 0.12;
    ctx.fillStyle = b.color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.fillRect(x, 0, bw, ch);

    // Border
    ctx.strokeStyle = b.color + '40';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, 0, bw, ch);

    // Label
    ctx.fillStyle = b.highlight ? b.color : b.color + 'cc';
    ctx.font = (b.highlight ? 'bold ' : '') + '7px sans-serif';
    ctx.textAlign = 'center';
    const cx = x + bw / 2;
    ctx.fillText(b.name, cx, ch / 2 - 2);
    ctx.font = '5px monospace';
    ctx.fillStyle = b.color + '99';
    ctx.fillText(b.freq, cx, ch / 2 + 8);

    // WiFi band highlight pulse
    if (b.highlight) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(x + 1, 1, bw - 2, ch - 2);
      ctx.setLineDash([]);
    }
  });

  // "YOU ARE HERE" label spanning the WiFi bands
  const wifiStart = 0.42 * cw;
  const wifiEnd = 0.84 * cw;
  const wifiCenter = (wifiStart + wifiEnd) / 2;
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▼ YOU ARE HERE', wifiCenter, ch - 4);
}

/* ═══════════════════════════════════
   NETWORK DIARY (history)
   ═══════════════════════════════════ */
function _loadDiary() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY)) || []; } catch { return []; }
}
function _saveDiary(diary) {
  try { localStorage.setItem(DIARY_KEY, JSON.stringify(diary.slice(-200))); } catch {} // keep last 200
}
function _addDiaryEntry(network) {
  const diary = _loadDiary();
  diary.push({
    ts: Date.now(),
    name: network.ssid || network.name || '(hidden)',
    addr: network.bssid || network.address || network.id || '',
    rssi: network.rssi || -100,
    channel: network.channel || 0,
  });
  _saveDiary(diary);
}

function _renderDiary() {
  const container = document.getElementById('deviceDiary');
  if (!container) return;
  const diary = _loadDiary().slice().reverse().slice(0, 50); // last 50

  if (!diary.length) {
    container.innerHTML = '<div class="ble-empty">No networks in your diary yet.</div>';
    return;
  }

  container.innerHTML = '';
  diary.forEach(e => {
    const d = new Date(e.ts);
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const el = document.createElement('div');
    el.className = 'diary-entry';
    el.innerHTML =
      '<span class="diary-time">' + date + ' ' + time + '</span>' +
      '<span class="diary-name">' + _esc(e.name) + '</span>' +
      '<span class="diary-rssi">' + e.rssi + ' dBm</span>' +
      (e.channel ? '<span class="diary-channel">CH ' + e.channel + '</span>' : '');
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   ACADEMY QUIZ LOGIC
   ═══════════════════════════════════ */
function quizAnswer(btn, correct) {
  const parent = btn.closest('.academy-quiz-options');
  if (!parent) return;
  // Disable all options
  parent.querySelectorAll('.academy-quiz-opt').forEach(o => {
    o.style.pointerEvents = 'none';
    if (o.dataset.correct === 'true') o.classList.add('correct');
  });
  if (!correct) btn.classList.add('wrong');
}

/* ═══════════════════════════════════
   HOOKS — monkey-patch existing functions
   ═══════════════════════════════════ */
function _initBadgeHooks() {
  // Check time-based badges
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 5) { const d = _loadStats(); d.nightOwl = 1; _saveStats(d); }
  if (hour >= 4 && hour < 7)  { const d = _loadStats(); d.earlyBird = 1; _saveStats(d); }

  // Hook wifiScan for scan counting
  const origScan = window.wifiScan;
  if (origScan) {
    window.wifiScan = async function() {
      _incStat('scans');
      return origScan.apply(this, arguments);
    };
  }

  // Hook toggleRadarView
  const origRadar = window.toggleRadarView;
  if (origRadar) {
    window.toggleRadarView = function() {
      const d = _loadStats(); d.radarUsed = 1; _saveStats(d);
      _checkAchievements();
      return origRadar.apply(this, arguments);
    };
  }

  // Hook selectNetwork for "Network Spy" badge
  const origDetail = window.selectNetwork;
  if (origDetail) {
    window.selectNetwork = function() {
      _incStat('detailViews');
      return origDetail.apply(this, arguments);
    };
  }

  // Hook requestChannelAnalysis for "Channel Master" badge
  const origChannel = window.requestChannelAnalysis;
  if (origChannel) {
    window.requestChannelAnalysis = function() {
      const d = _loadStats(); d.channelAnalysis = 1; _saveStats(d);
      _checkAchievements();
      return origChannel.apply(this, arguments);
    };
  }

  // Hook exportDevicesCSV / exportChartData / exportLogsFromBackend
  ['exportNetworksCSV', 'exportChartData', 'exportLogsFromBackend', 'exportScanReport'].forEach(fn => {
    const orig = window[fn];
    if (orig) {
      window[fn] = function() {
        _incStat('exports');
        return orig.apply(this, arguments);
      };
    }
  });

  // Data flow: wifi.js wsHandle() calls window._handleBadgeEvent() directly
  // No monkey-patching needed
}

function _handleBadgeEvent(msg) {
  const t = msg.type;
  if (t === 'scan_result') {
    // Track networks — msg.networks is the WiFi equivalent of msg.devices
    const networks = msg.networks || (msg.bssid ? [msg] : []);

    // Track max networks in a single scan for "Crowded Space" badge
    if (networks.length) {
      const d = _loadStats();
      if (networks.length > (d.maxNetworksInScan || 0)) {
        d.maxNetworksInScan = networks.length;
        _saveStats(d);
      }
    }

    networks.forEach(n => {
      const bssid = n.bssid || n.address || n.id;
      const ssid = n.ssid || n.name || '';
      const vendor = n.vendor || '';
      const rssi = n.rssi || -100;
      const channel = n.channel || 0;
      const security = n.security || n.encryption || '';

      if (bssid) {
        _addNetwork(bssid);
        _addTradingCard({
          bssid: bssid,
          ssid: ssid,
          vendor: vendor,
          rssi: rssi,
          channel: channel,
          security: security,
        });
        _addDiaryEntry({
          ssid: ssid,
          bssid: bssid,
          rssi: rssi,
          channel: channel,
        });
      }

      // Track vendor diversity
      if (vendor) _addVendor(vendor);

      // Track band usage for "Band Hopper" badge
      if (channel > 0 && channel <= 14) {
        const d = _loadStats(); d.bands24 = 1; _saveStats(d);
      } else if (channel > 14) {
        const d = _loadStats(); d.bands5 = 1; _saveStats(d);
      }

      // Track open networks for "Security Auditor" badge
      const sec = (security || '').toLowerCase();
      if (sec === 'open' || sec === 'none' || sec === '' || sec.includes('open')) {
        const d = _loadStats(); d.openNetworks = 1; _saveStats(d);
      }

      // Track hidden SSIDs for "Hidden Hunter" badge
      if (!ssid || ssid === '(hidden)' || ssid.trim() === '') {
        const d = _loadStats(); d.hiddenSSIDs = 1; _saveStats(d);
      }

      // Track strong signals for "Signal Pro" badge
      if (rssi > -30) {
        const d = _loadStats(); d.strongSignals = 1; _saveStats(d);
      }

      // Track weak signals for "Needle Finder" badge
      if (rssi < -85 && rssi > -100) {
        const d = _loadStats(); d.weakSignals = 1; _saveStats(d);
      }
    });

    // Update signal gauge with strongest network
    if (networks.length) {
      const strongest = networks.reduce((a, b) =>
        (a.rssi || -100) > (b.rssi || -100) ? a : b
      );
      _updateGauge(strongest.rssi);
    }

    _checkAchievements();
  }
}

/* ═══════════════════════════════════
   INIT
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure ble.js has initialized
  setTimeout(() => {
    _initBadgeHooks();
    _initGauge();
    _renderBadges();
    _renderTradingCards();
    _renderDiary();
    _drawFreqMap();
    _checkAchievements();

    // Periodically refresh trading cards and diary
    setInterval(() => {
      _renderTradingCards();
      _renderDiary();
    }, 10000);

    // Resize freq map on window resize
    window.addEventListener('resize', () => _drawFreqMap());

    // Redraw freq map when Achievements section opens (canvas is 0x0 when collapsed)
    document.addEventListener('toggle', (e) => {
      if (e.target.classList && e.target.classList.contains('section-achievements') && e.target.open) {
        setTimeout(_drawFreqMap, 50);
      }
    }, true);
  }, 600);
});

/* ═══════════════════════════════════
   EXPOSE GLOBALS
   ═══════════════════════════════════ */
window._handleBadgeEvent = _handleBadgeEvent;
window.quizAnswer = quizAnswer;
