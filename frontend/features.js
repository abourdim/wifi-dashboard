/**
 * features.js — Radar Styles, Leaderboard, Missions, Network DNA,
 * Signal Heatmap, Co-Location Graph, Sound Signatures, Scan Analytics,
 * Network Nicknames, Threat Detector, Export Report, Hacker Lab
 * Loaded after badges.js.
 */

/* ═══════════════════════════════════
   RADAR STYLE SWITCHING (7 styles)
   ═══════════════════════════════════ */
const RADAR_STYLES = ['military','tactical','thermal','sonar','constellation','matrix','submarine'];
const RADAR_STYLE_KEY = 'ble-radar-style';

function _getRadarStyle() {
  try { return localStorage.getItem(RADAR_STYLE_KEY) || 'military'; } catch { return 'military'; }
}

function setRadarStyle(style) {
  if (!RADAR_STYLES.includes(style)) return;
  try { localStorage.setItem(RADAR_STYLE_KEY, style); } catch {}
  const container = document.querySelector('.ble-radar-container');
  if (!container) return;
  // Remove old style classes
  RADAR_STYLES.forEach(s => container.classList.remove('radar-' + s));
  container.classList.add('radar-' + style);
  // Update style buttons
  document.querySelectorAll('.radar-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === style);
  });
  // Add/remove style-specific DOM elements
  _applyRadarStyleExtras(container, style);
}

function _applyRadarStyleExtras(container, style) {
  // Clean up previous extras
  container.querySelectorAll('.compass-n,.compass-s,.compass-e,.compass-w,.hud-corner,.hud-threat,.sonar-pulse,.star-field,.constellation-lines,.matrix-rain-overlay,.matrix-readout,.sub-depth,.sub-bubble').forEach(e => e.remove());
  // Stop matrix rain if switching away
  if (_matrixRainInterval) { clearInterval(_matrixRainInterval); _matrixRainInterval = null; }
  const circle = container.querySelector('.ble-radar-circle');
  if (!circle) return;

  if (style === 'tactical') {
    // Add compass marks
    ['N','S','E','W'].forEach(dir => {
      const el = document.createElement('span');
      el.className = 'compass-' + dir.toLowerCase();
      el.textContent = dir;
      circle.appendChild(el);
    });
    // Add HUD corners
    ['tl','tr','bl','br'].forEach(pos => {
      const el = document.createElement('div');
      el.className = 'hud-corner ' + pos;
      circle.appendChild(el);
    });
    // Threat level indicator
    const threat = document.createElement('div');
    threat.className = 'hud-threat green';
    threat.id = 'hudThreat';
    threat.textContent = 'CLEAR';
    circle.appendChild(threat);
  }

  if (style === 'sonar') {
    // Add pulse rings
    for (let i = 0; i < 3; i++) {
      const pulse = document.createElement('div');
      pulse.className = 'sonar-pulse';
      circle.appendChild(pulse);
    }
  }

  if (style === 'matrix') {
    // Matrix rain canvas overlay
    const rainCanvas = document.createElement('canvas');
    rainCanvas.className = 'matrix-rain-overlay';
    rainCanvas.width = 200;
    rainCanvas.height = 200;
    circle.appendChild(rainCanvas);
    _startMatrixRain(rainCanvas);
    // Digital readout
    const readout = document.createElement('div');
    readout.className = 'matrix-readout';
    readout.id = 'matrixReadout';
    readout.textContent = 'SYS.ONLINE // SCAN.ACTIVE';
    circle.appendChild(readout);
  }

  if (style === 'submarine') {
    // Depth gauge
    const depth = document.createElement('div');
    depth.className = 'sub-depth';
    depth.textContent = 'DEPTH 2.4GHz';
    circle.appendChild(depth);
    // Bubbles
    for (let i = 0; i < 5; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'sub-bubble';
      bubble.style.left = (15 + Math.random() * 70) + '%';
      bubble.style.animationDelay = (Math.random() * 4) + 's';
      bubble.style.animationDuration = (3 + Math.random() * 3) + 's';
      circle.appendChild(bubble);
    }
  }

  if (style === 'constellation') {
    // Add star field background
    const field = document.createElement('div');
    field.className = 'star-field';
    for (let i = 0; i < 40; i++) {
      const star = document.createElement('div');
      star.className = 'micro-star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = (Math.random() * 4) + 's';
      star.style.opacity = (0.2 + Math.random() * 0.5);
      field.appendChild(star);
    }
    circle.appendChild(field);
    // SVG overlay for constellation lines
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('constellation-lines');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    circle.appendChild(svg);
  }
}

function _initRadarStyles() {
  const style = _getRadarStyle();
  setRadarStyle(style);
}

/* Update constellation lines when blips render */
function _updateConstellationLines() {
  const svg = document.querySelector('.constellation-lines');
  if (!svg) return;
  const blips = document.querySelectorAll('#radarBlips .ble-radar-blip');
  svg.innerHTML = '';
  const positions = [];
  blips.forEach(b => {
    positions.push({ x: parseFloat(b.style.left), y: parseFloat(b.style.top) });
  });
  // Connect nearby blips (distance < 30%)
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 30) {
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1', positions[i].x);
        line.setAttribute('y1', positions[i].y);
        line.setAttribute('x2', positions[j].x);
        line.setAttribute('y2', positions[j].y);
        svg.appendChild(line);
      }
    }
  }
}

/* Update tactical HUD threat level */
function _updateHudThreat(networkCount) {
  const el = document.getElementById('hudThreat');
  if (!el) return;
  if (networkCount > 15) {
    el.className = 'hud-threat red'; el.textContent = 'HIGH';
  } else if (networkCount > 5) {
    el.className = 'hud-threat yellow'; el.textContent = 'MEDIUM';
  } else {
    el.className = 'hud-threat green'; el.textContent = 'CLEAR';
  }
}

/* ═══════════════════════════════════
   NETWORK DNA FINGERPRINT
   ═══════════════════════════════════ */
function generateDeviceDNA(addr) {
  if (!addr) return '';
  // Generate unique color pattern from BSSID bytes
  const clean = addr.replace(/[^a-fA-F0-9]/g, '');
  const colors = [
    '#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6',
    '#38bdf8','#6366f1','#a855f7','#ec4899','#64748b',
    '#2dd4bf','#fb923c','#34d399','#0ea5e9','#e879f9','#fbbf24'
  ];
  let html = '<div class="device-dna">';
  for (let i = 0; i < Math.min(clean.length, 12); i++) {
    const val = parseInt(clean[i], 16) || 0;
    const color = colors[val] || '#64748b';
    const height = 40 + (val / 15) * 60;
    html += '<div class="dna-seg" style="background:' + color + ';height:' + height + '%;align-self:center"></div>';
  }
  html += '</div>';
  return html;
}

/* ═══════════════════════════════════
   SIGNAL HEATMAP TIMELINE
   ═══════════════════════════════════ */
const _heatmapData = []; // [{ts, networks:[{name,rssi}]}]
const HEATMAP_MAX_COLS = 60;

function _addHeatmapSample(networks) {
  const sample = {
    ts: Date.now(),
    devices: (networks || []).slice(0, 20).map(n => ({
      name: n.ssid || '?',
      addr: n.bssid || '',
      rssi: n.rssi || -100
    }))
  };
  _heatmapData.push(sample);
  if (_heatmapData.length > HEATMAP_MAX_COLS) _heatmapData.shift();
}

function _renderHeatmap() {
  const canvas = document.getElementById('heatmapCanvas');
  if (!canvas || !_heatmapData.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Collect all unique BSSID addrs
  const allAddrs = new Set();
  _heatmapData.forEach(s => s.devices.forEach(d => allAddrs.add(d.addr)));
  const addrs = Array.from(allAddrs).slice(0, 15); // max 15 rows

  const colW = w / HEATMAP_MAX_COLS;
  const rowH = addrs.length ? h / addrs.length : h;

  _heatmapData.forEach((sample, col) => {
    addrs.forEach((addr, row) => {
      const dev = sample.devices.find(d => d.addr === addr);
      const rssi = dev ? dev.rssi : -110;
      const norm = Math.max(0, Math.min(1, (rssi + 100) / 70));
      // Color: deep blue -> cyan -> yellow -> red
      let r, g, b;
      if (norm < 0.33) {
        const t = norm / 0.33;
        r = 13; g = Math.round(27 + t * 180); b = Math.round(42 + t * 150);
      } else if (norm < 0.66) {
        const t = (norm - 0.33) / 0.33;
        r = Math.round(45 * (1-t) + 251 * t); g = Math.round(207 * (1-t) + 146 * t); b = Math.round(191 * (1-t) + 60 * t);
      } else {
        const t = (norm - 0.66) / 0.34;
        r = Math.round(251 * (1-t) + 239 * t); g = Math.round(146 * (1-t) + 68 * t); b = Math.round(60 * (1-t) + 68 * t);
      }
      ctx.fillStyle = dev ? `rgb(${r},${g},${b})` : 'rgba(0,0,0,.3)';
      ctx.fillRect(col * colW, row * rowH, colW + 0.5, rowH + 0.5);
    });
  });

  // Draw network name labels on the left
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = '6px monospace';
  ctx.textAlign = 'left';
  addrs.forEach((addr, row) => {
    const lastSample = _heatmapData[_heatmapData.length - 1];
    const dev = lastSample?.devices.find(d => d.addr === addr);
    const label = dev?.name?.substring(0, 10) || addr.substring(0, 8);
    ctx.fillText(label, 2, row * rowH + rowH / 2 + 3);
  });
}

/* ═══════════════════════════════════
   WIFI LEADERBOARD
   ═══════════════════════════════════ */
const _leaderboardNetworks = {}; // bssid -> {bssid, ssid, vendor, visits, bestRssi, channels, firstSeen}

function _trackLeaderboard(networks) {
  (networks || []).forEach(n => {
    const bssid = n.bssid;
    if (!bssid) return;
    const existing = _leaderboardNetworks[bssid];
    if (existing) {
      existing.visits++;
      if (n.rssi != null && n.rssi > existing.bestRssi) existing.bestRssi = n.rssi;
      if (n.channel) existing.channels.add(n.channel);
      existing.ssid = n.ssid || existing.ssid;
      existing.vendor = n.vendor || existing.vendor;
    } else {
      _leaderboardNetworks[bssid] = {
        bssid: bssid,
        ssid: n.ssid || '',
        vendor: n.vendor || '',
        visits: 1,
        bestRssi: n.rssi || -100,
        channels: new Set(n.channel ? [n.channel] : []),
        firstSeen: Date.now()
      };
    }
  });
}

function _renderLeaderboard() {
  const container = document.getElementById('leaderboardBody');
  if (!container) return;
  const arr = Object.values(_leaderboardNetworks).sort((a, b) => b.visits - a.visits).slice(0, 10);

  if (!arr.length) {
    container.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-dim);font-size:.7rem;padding:12px">Scan to populate leaderboard</td></tr>';
    return;
  }

  container.innerHTML = '';
  const medals = ['\u{1F451}','\u{1F948}','\u{1F949}'];
  arr.forEach((c, i) => {
    const nickname = _getNickname(c.bssid);
    const displayName = nickname || c.ssid || c.bssid.substring(0, 8);
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="lb-rank ' + (i < 3 ? 'lb-rank-' + (i+1) : '') + '">' +
        (i < 3 ? '<span class="lb-medal">' + medals[i] + '</span>' : (i + 1)) +
      '</td>' +
      '<td class="lb-name" title="' + _escH(c.bssid) + '">' + _escH(displayName) + '</td>' +
      '<td class="lb-stat">' + c.visits + '</td>' +
      '<td class="lb-stat">' + (c.bestRssi || '\u2014') + '</td>' +
      '<td>' + generateDeviceDNA(c.bssid) + '</td>';
    container.appendChild(tr);
  });
}

/* ═══════════════════════════════════
   MISSION MODE
   ═══════════════════════════════════ */
const MISSIONS_KEY = 'ble-missions';
const MISSIONS = [
  { id:'m_scan5',      icon:'\u{1F504}', name:'Scan Warrior',       desc:'Complete 5 scan cycles',                    target:5,   stat:'scan_count',      difficulty:1, xp:20 },
  { id:'m_marathon',   icon:'\u{1F3C3}', name:'WiFi Marathon',      desc:'Keep scanning for 10 minutes straight',     target:10,  stat:'scan_minutes',    difficulty:3, xp:120 },
  { id:'m_50nets',     icon:'\u{1F4E1}', name:'Signal Hunter',      desc:'Find 50 unique networks total',             target:50,  stat:'total_unique',    difficulty:3, xp:100 },
  { id:'m_channels',   icon:'\u{1F4FB}', name:'Channel Explorer',   desc:'Discover networks on 5+ different channels',target:5,   stat:'channel_count',   difficulty:2, xp:60 },
  { id:'m_bands',      icon:'\u{1F30A}', name:'Band Master',        desc:'Find networks on both 2.4GHz and 5GHz',     target:2,   stat:'band_count',      difficulty:2, xp:50 },
  { id:'m_open',       icon:'\u{1F513}', name:'Security Audit',     desc:'Find at least 1 open network',              target:1,   stat:'open_count',      difficulty:1, xp:30 },
  { id:'m_strong',     icon:'\u{1F4AA}', name:'Close Encounter',    desc:'Find a network with RSSI > -30 dBm',        target:1,   stat:'strong_signal',   difficulty:1, xp:30 },
  { id:'m_10vendors',  icon:'\u{1F3ED}', name:'Vendor Explorer',    desc:'Discover networks from 10 different vendors',target:10,  stat:'vendor_count',    difficulty:3, xp:100 },
  { id:'m_hidden',     icon:'\u{1F575}', name:'Ghost Hunter',       desc:'Find 3 hidden SSIDs',                        target:3,   stat:'hidden_count',    difficulty:2, xp:60 },
  { id:'m_dense',      icon:'\u{1F306}', name:'Urban Jungle',       desc:'See 20+ networks in a single scan',          target:1,   stat:'dense_scan',      difficulty:2, xp:50 },
];

function _loadMissions() {
  try { return JSON.parse(localStorage.getItem(MISSIONS_KEY)) || {}; } catch { return {}; }
}
function _saveMissions(data) {
  try { localStorage.setItem(MISSIONS_KEY, JSON.stringify(data)); } catch {}
}

function _getMissionProgress(mission) {
  const data = _loadMissions();
  return data[mission.stat] || 0;
}

function _incMission(stat, val) {
  const data = _loadMissions();
  data[stat] = (data[stat] || 0) + (val || 1);
  _saveMissions(data);
}
function _setMission(stat, val) {
  const data = _loadMissions();
  data[stat] = val;
  _saveMissions(data);
}

function _getTotalXP() {
  let xp = 0;
  MISSIONS.forEach(m => {
    if (_getMissionProgress(m) >= m.target) xp += m.xp;
  });
  return xp;
}

function _getLevel(xp) {
  if (xp >= 500) return { level: 5, name: 'WiFi Master', next: 999, prev: 500 };
  if (xp >= 300) return { level: 4, name: 'WiFi Expert', next: 500, prev: 300 };
  if (xp >= 150) return { level: 3, name: 'WiFi Specialist', next: 300, prev: 150 };
  if (xp >= 50)  return { level: 2, name: 'WiFi Apprentice', next: 150, prev: 50 };
  return { level: 1, name: 'WiFi Rookie', next: 50, prev: 0 };
}

function _renderMissions() {
  const container = document.getElementById('missionGrid');
  if (!container) return;

  // XP bar
  const xp = _getTotalXP();
  const lvl = _getLevel(xp);
  const xpBar = document.getElementById('xpBarFill');
  const xpLevel = document.getElementById('xpLevel');
  const xpText = document.getElementById('xpText');
  if (xpBar) xpBar.style.width = Math.min(100, ((xp - lvl.prev) / (lvl.next - lvl.prev)) * 100) + '%';
  if (xpLevel) xpLevel.textContent = 'Lv.' + lvl.level + ' ' + lvl.name;
  if (xpText) xpText.textContent = xp + ' / ' + lvl.next + ' XP';

  container.innerHTML = '';
  MISSIONS.forEach(m => {
    const progress = _getMissionProgress(m);
    const completed = progress >= m.target;
    const pct = Math.min(100, (progress / m.target) * 100);

    const el = document.createElement('div');
    el.className = 'mission-card' + (completed ? ' completed' : ' active');
    el.innerHTML =
      '<div class="mission-header">' +
        '<span class="mission-icon">' + m.icon + '</span>' +
        '<span class="mission-name">' + m.name + '</span>' +
        '<span class="mission-difficulty">' + _stars(m.difficulty) + '</span>' +
      '</div>' +
      '<div class="mission-desc">' + m.desc + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between">' +
        '<span class="mission-xp">+' + m.xp + ' XP</span>' +
        '<span style="font-family:\'Orbitron\',monospace;font-size:.55rem;color:var(--text-dim)">' + Math.min(progress, m.target) + '/' + m.target + '</span>' +
      '</div>' +
      '<div class="mission-progress-bar"><div class="mission-progress-fill" style="width:' + pct + '%"></div></div>' +
      (completed ? '<span class="mission-check">\u2705</span>' : '');
    container.appendChild(el);
  });
}

function _stars(n) {
  let s = '';
  for (let i = 0; i < 3; i++) s += '<span class="mission-star' + (i >= n ? ' empty' : '') + '">\u2605</span>';
  return s;
}

/* ═══════════════════════════════════
   CO-LOCATION GRAPH
   ═══════════════════════════════════ */
const _colocData = {}; // { "bssidA|bssidB": count }

function _trackCoLocation(networks) {
  if (!networks || networks.length < 2) return;
  const addrs = networks.slice(0, 15).map(n => n.bssid).filter(Boolean);
  for (let i = 0; i < addrs.length; i++) {
    for (let j = i + 1; j < addrs.length; j++) {
      const key = [addrs[i], addrs[j]].sort().join('|');
      _colocData[key] = (_colocData[key] || 0) + 1;
    }
  }
}

function _renderCoLocationGraph() {
  const canvas = document.getElementById('colocCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Get unique nodes from co-location data
  const nodes = new Set();
  const edges = [];
  Object.entries(_colocData).forEach(([key, count]) => {
    if (count < 2) return; // Only show strong co-locations
    const [a, b] = key.split('|');
    nodes.add(a);
    nodes.add(b);
    edges.push({ a, b, weight: count });
  });

  const nodeArr = Array.from(nodes).slice(0, 20);
  if (!nodeArr.length) {
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Scan multiple times to build co-location graph', w/2, h/2);
    return;
  }

  // Simple circular layout
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * 0.35;
  const positions = {};
  nodeArr.forEach((addr, i) => {
    const angle = (i / nodeArr.length) * Math.PI * 2 - Math.PI / 2;
    positions[addr] = {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  });

  // Draw edges
  const maxWeight = Math.max(...edges.map(e => e.weight), 1);
  edges.forEach(e => {
    if (!positions[e.a] || !positions[e.b]) return;
    const alpha = Math.min(0.6, (e.weight / maxWeight) * 0.6);
    const lineWidth = 1 + (e.weight / maxWeight) * 3;
    ctx.beginPath();
    ctx.moveTo(positions[e.a].x, positions[e.a].y);
    ctx.lineTo(positions[e.b].x, positions[e.b].y);
    ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  });

  // Draw nodes
  nodeArr.forEach(addr => {
    const pos = positions[addr];
    const nickname = _getNickname(addr);
    const net = _leaderboardNetworks[addr];
    const label = nickname || net?.ssid?.substring(0, 8) || addr.substring(0, 6);

    // Node circle
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, pos.x, pos.y + 16);
  });
}

/* ═══════════════════════════════════
   SOUND SIGNATURES
   ═══════════════════════════════════ */
let _soundscapeActive = false;
let _soundscapeCtx = null;

function toggleSoundscape() {
  _soundscapeActive = !_soundscapeActive;
  const btn = document.getElementById('soundscapeBtn');
  if (btn) btn.classList.toggle('active', _soundscapeActive);
  const viz = document.getElementById('soundViz');
  if (viz) viz.style.display = _soundscapeActive ? 'flex' : 'none';

  if (!_soundscapeActive && _soundscapeCtx) {
    _soundscapeCtx.close();
    _soundscapeCtx = null;
  }
}

function _playSoundSignature(networks) {
  if (!_soundscapeActive || !networks?.length) return;
  try {
    if (!_soundscapeCtx) _soundscapeCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _soundscapeCtx;
    if (ctx.state === 'suspended') ctx.resume();

    // Play a tone for up to 5 strongest networks
    const sorted = networks.slice().sort((a, b) => (b.rssi||0) - (a.rssi||0)).slice(0, 5);
    sorted.forEach((n, i) => {
      const rssi = n.rssi || -100;
      // Map RSSI to frequency: -100=low pitch, -30=high pitch
      const freq = 200 + ((rssi + 100) / 70) * 600;
      // Map security to waveform
      const sec = (n.security || '').toUpperCase();
      let type = 'sine';
      if (sec.includes('WPA3')) type = 'triangle';
      else if (sec.includes('WPA2')) type = 'square';
      else if (sec.includes('WEP')) type = 'sawtooth';

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = 0.03;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + 0.3 + i * 0.08);
    });
  } catch {}
}

/* ═══════════════════════════════════
   SCAN ANALYTICS MINI-DASHBOARD
   ═══════════════════════════════════ */
let _scanStartTime = Date.now();
let _scanHistory = []; // [{ts, count}]

function _updateAnalytics(networks) {
  const now = Date.now();
  _scanHistory.push({ ts: now, count: networks?.length || 0 });
  // Keep last 60 entries
  if (_scanHistory.length > 60) _scanHistory.shift();

  // Networks/minute
  const recentScans = _scanHistory.filter(s => s.ts > now - 60000);
  const netPerMin = recentScans.length ? Math.round(recentScans.reduce((s, e) => s + e.count, 0) / recentScans.length) : 0;

  // Session duration
  const sessionMin = Math.round((now - _scanStartTime) / 60000);

  // Peak
  const peak = _scanHistory.length ? Math.max(..._scanHistory.map(s => s.count)) : 0;

  // Update DOM
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('analyticsDevPerMin', netPerMin);
  el('analyticsSession', sessionMin + 'm');
  el('analyticsPeak', peak);
  el('analyticsTotalScans', _scanHistory.length);

  // Vendor pie chart
  _renderVendorPie(networks);
  // RSSI histogram
  _renderRssiHistogram(networks);
}

function _renderVendorPie(networks) {
  const canvas = document.getElementById('vendorPieCanvas');
  if (!canvas || !networks?.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // Count vendors
  const vendors = {};
  networks.forEach(n => {
    const v = n.vendor || 'Unknown';
    vendors[v] = (vendors[v] || 0) + 1;
  });
  const entries = Object.entries(vendors).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((s, e) => s + e[1], 0);

  const colors = ['#38bdf8','#22c55e','#f59e0b','#ef4444','#a855f7','#2dd4bf','#fb923c','#64748b'];
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.4;
  let startAngle = -Math.PI / 2;

  entries.forEach(([name, count], i) => {
    const slice = (count / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + slice);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    // Label
    const midAngle = startAngle + slice / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    if (slice > 0.3) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name.substring(0, 6), lx, ly);
    }
    startAngle += slice;
  });
}

function _renderRssiHistogram(networks) {
  const canvas = document.getElementById('rssiHistCanvas');
  if (!canvas || !networks?.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  // Bucket RSSI values: -100 to -20, 10dBm buckets
  const buckets = new Array(8).fill(0);
  const labels = ['-100','-90','-80','-70','-60','-50','-40','-30'];
  networks.forEach(n => {
    const rssi = Math.max(-100, Math.min(-30, n.rssi || -100));
    const idx = Math.max(0, Math.min(7, Math.floor((rssi + 100) / 10)));
    buckets[idx]++;
  });

  const maxVal = Math.max(...buckets, 1);
  const barW = (w - 20) / buckets.length;
  const colors = ['#ef4444','#ef4444','#f97316','#f97316','#eab308','#22c55e','#22c55e','#38bdf8'];

  buckets.forEach((count, i) => {
    const barH = (count / maxVal) * (h - 20);
    const x = 10 + i * barW + 2;
    ctx.fillStyle = colors[i];
    ctx.fillRect(x, h - 14 - barH, barW - 4, barH);
    // Label
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + (barW - 4) / 2, h - 4);
  });
}

/* ═══════════════════════════════════
   NETWORK NICKNAMES & NOTES
   ═══════════════════════════════════ */
const NICKNAMES_KEY = 'ble-nicknames';

function _loadNicknames() {
  try { return JSON.parse(localStorage.getItem(NICKNAMES_KEY)) || {}; } catch { return {}; }
}
function _saveNicknames(data) {
  try { localStorage.setItem(NICKNAMES_KEY, JSON.stringify(data)); } catch {}
}
function _getNickname(addr) {
  return _loadNicknames()[addr] || '';
}
function setNickname(addr, name) {
  const data = _loadNicknames();
  if (name) data[addr] = name;
  else delete data[addr];
  _saveNicknames(data);
}

/* Global nickname prompt — called from network list / radar detail */
function promptNickname(bssid) {
  const current = _getNickname(bssid);
  const name = prompt('Set nickname for ' + bssid + ':', current);
  if (name !== null) {
    setNickname(bssid, name.trim());
    // Re-render relevant views
    if (typeof renderNetworkList === 'function') {
      renderNetworkList();
    }
    _renderLeaderboard();
  }
}

/* ═══════════════════════════════════
   THREAT DETECTOR (WiFi-specific)
   ═══════════════════════════════════ */
let _threats = [];
const _ssidBssidMap = {}; // ssid -> Set<bssid> for evil twin detection

function _analyzeThreats(networks) {
  if (!networks?.length) return;
  _threats = [];
  const now = Date.now();

  // Build SSID -> BSSID map for evil twin detection
  networks.forEach(n => {
    const ssid = n.ssid || '';
    const bssid = n.bssid || '';
    if (!ssid || !bssid) return;
    if (!_ssidBssidMap[ssid]) _ssidBssidMap[ssid] = new Set();
    _ssidBssidMap[ssid].add(bssid);
  });

  // Check 1: Open networks (no encryption)
  networks.forEach(n => {
    const sec = (n.security || '').toUpperCase();
    if (sec === 'OPEN' || sec === 'NONE' || sec === '') {
      _threats.push({
        type: 'warning',
        icon: '\u{1F513}',
        title: 'Open Network',
        desc: (n.ssid || n.bssid) + ' \u2014 no encryption, data sent in plaintext',
        ts: now
      });
    }
  });

  // Check 2: WEP networks (weak encryption)
  networks.forEach(n => {
    const sec = (n.security || '').toUpperCase();
    if (sec.includes('WEP')) {
      _threats.push({
        type: 'danger',
        icon: '\u{1F510}',
        title: 'WEP Encryption (Weak)',
        desc: (n.ssid || n.bssid) + ' \u2014 WEP is trivially crackable, avoid this network',
        ts: now
      });
    }
  });

  // Check 3: Hidden SSIDs (suspicious)
  networks.forEach(n => {
    if (n.hidden || (!n.ssid || n.ssid === '')) {
      _threats.push({
        type: 'info',
        icon: '\u{1F575}',
        title: 'Hidden SSID',
        desc: (n.bssid || '??') + ' \u2014 network is hiding its name, could be suspicious',
        ts: now
      });
    }
  });

  // Check 4: Evil twin detection (same SSID, different BSSID)
  Object.entries(_ssidBssidMap).forEach(([ssid, bssids]) => {
    if (bssids.size > 1) {
      // Check if the BSSIDs have significantly different OUIs (different vendors = likely evil twin)
      const ouis = new Set();
      bssids.forEach(b => { ouis.add(b.substring(0, 8).toUpperCase()); });
      if (ouis.size > 1) {
        _threats.push({
          type: 'danger',
          icon: '\u{1F47B}',
          title: 'Possible Evil Twin',
          desc: '"' + ssid + '" seen from ' + bssids.size + ' APs with different vendors \u2014 possible rogue AP',
          ts: now
        });
      }
    }
  });

  // Check 5: Very strong signal (possible rogue AP nearby)
  networks.forEach(n => {
    if ((n.rssi || -100) > -25) {
      _threats.push({
        type: 'warning',
        icon: '\u{1F4E1}',
        title: 'Very Strong Signal',
        desc: (n.ssid || n.bssid) + ' at ' + n.rssi + ' dBm \u2014 AP is very close',
        ts: now
      });
    }
  });

  _renderThreats();
}

function _renderThreats() {
  const container = document.getElementById('threatPanel');
  if (!container) return;
  container.style.display = '';

  // Update threat count badge
  const badge = document.getElementById('threatCountBadge');
  if (badge) {
    const dangerCount = _threats.filter(t => t.type === 'danger').length;
    const warnCount = _threats.filter(t => t.type === 'warning').length;
    const total = _threats.length;
    badge.textContent = total;
    badge.className = 'threat-count-badge ' + (dangerCount ? 'red' : warnCount ? 'yellow' : 'green');
    badge.style.display = total ? '' : 'none';
  }

  if (!_threats.length) {
    container.innerHTML = '<div style="text-align:center;padding:12px;color:var(--text-dim);font-size:.7rem">\u2705 No threats detected \u2014 all clear!</div>';
    return;
  }

  container.innerHTML = '';
  _threats.forEach(t => {
    const el = document.createElement('div');
    el.className = 'threat-alert ' + t.type;
    el.innerHTML =
      '<span class="threat-icon">' + t.icon + '</span>' +
      '<div class="threat-text">' +
        '<div class="threat-title">' + t.title + '</div>' +
        '<div class="threat-desc">' + t.desc + '</div>' +
      '</div>' +
      '<span class="threat-time">' + new Date(t.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '</span>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   EXPORT SCAN REPORT
   ═══════════════════════════════════ */
function exportScanReport() {
  const missions = _loadMissions();
  const xp = _getTotalXP();
  const lvl = _getLevel(xp);
  const now = new Date();

  const netArr = Object.values(_leaderboardNetworks).sort((a, b) => b.visits - a.visits);
  const totalUnique = netArr.length;
  const totalScans = _scanHistory.length;

  let html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WiFi Scan Report \u2014 ${now.toLocaleDateString()}</title>
<style>
body{font-family:system-ui,sans-serif;background:#0a0e27;color:#e0e8ff;padding:20px;max-width:900px;margin:0 auto}
h1{color:#38bdf8;border-bottom:2px solid #38bdf8;padding-bottom:8px}
h2{color:#f59e0b;margin-top:24px}
table{width:100%;border-collapse:collapse;margin:8px 0}
th{text-align:left;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1);color:#7a8aaa;font-size:.8rem;text-transform:uppercase}
td{padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.85rem}
.stat{display:inline-block;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 16px;margin:4px;text-align:center}
.stat-value{font-size:1.4rem;font-weight:700;color:#38bdf8}
.stat-label{font-size:.7rem;color:#7a8aaa;margin-top:2px}
footer{margin-top:30px;padding-top:10px;border-top:1px solid rgba(255,255,255,.1);color:#556;font-size:.75rem;text-align:center}
</style></head><body>
<h1>\u{1F4E1} WiFi Scan Report</h1>
<p style="color:#7a8aaa">${now.toLocaleString()} \u2014 Level ${lvl.level} ${lvl.name} (${xp} XP)</p>

<div style="display:flex;flex-wrap:wrap;gap:4px">
<div class="stat"><div class="stat-value">${totalScans}</div><div class="stat-label">Scans</div></div>
<div class="stat"><div class="stat-value">${totalUnique}</div><div class="stat-label">Unique Networks</div></div>
</div>

<h2>\u{1F3C6} Network Leaderboard</h2>
<table>
<tr><th>#</th><th>SSID</th><th>BSSID</th><th>Vendor</th><th>Visits</th><th>Best RSSI</th><th>Channels</th></tr>
${netArr.map((c, i) => {
  const nickname = _getNickname(c.bssid);
  return `<tr><td>${i+1}</td><td>${_escH(nickname || c.ssid || '(hidden)')}</td><td>${_escH(c.bssid)}</td><td>${_escH(c.vendor || 'Unknown')}</td><td>${c.visits}</td><td>${c.bestRssi} dBm</td><td>${Array.from(c.channels).join(', ')}</td></tr>`;
}).join('')}
</table>

<h2>\u{1F3AF} Missions</h2>
<table>
<tr><th>Mission</th><th>Progress</th><th>XP</th><th>Status</th></tr>
${MISSIONS.map(m => {
  const p = _getMissionProgress(m);
  const done = p >= m.target;
  return `<tr><td>${m.icon} ${m.name}</td><td>${Math.min(p, m.target)}/${m.target}</td><td>+${m.xp}</td><td>${done ? '\u2705' : '\u23F3'}</td></tr>`;
}).join('')}
</table>

<h2>\u{1F6E1} Threat Summary</h2>
<p>${_threats.length ? _threats.map(t => t.icon + ' ' + t.title + ': ' + t.desc).join('<br>') : '\u2705 No threats detected'}</p>

<footer>WiFi Dashboard v1.0 \u2014 Scan Report generated ${now.toLocaleString()}</footer>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wifi-report-' + now.toISOString().slice(0, 10) + '.html';
  a.click();
  URL.revokeObjectURL(url);
  if (typeof log === 'function') log('\u{1F4CA} Scan report exported', 'success');
}

/* ═══════════════════════════════════
   MATRIX RAIN (for radar style)
   ═══════════════════════════════════ */
let _matrixRainInterval = null;
function _startMatrixRain(canvas) {
  if (_matrixRainInterval) clearInterval(_matrixRainInterval);
  const ctx = canvas.getContext('2d');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZアイウエオカキクケコ0123456789@#$%';
  const columns = Math.floor(canvas.width / 8);
  const drops = new Array(columns).fill(0);
  _matrixRainInterval = setInterval(() => {
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#00ff41';
    ctx.font = '8px monospace';
    for (let i = 0; i < drops.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(ch, i * 8, drops[i] * 8);
      if (drops[i] * 8 > canvas.height && Math.random() > 0.95) drops[i] = 0;
      drops[i]++;
    }
  }, 80);
}

/* ═══════════════════════════════════
   NETWORK AUTOPSY
   ═══════════════════════════════════ */
function showDeviceAutopsy(network) {
  const panel = document.getElementById('autopsyPanel');
  if (!panel || !network) return;
  const bssid = network.bssid || network.address || '??:??:??:??:??:??';
  const rssi = network.rssi || -100;
  const ssid = network.ssid || network.name || '(hidden)';
  const vendor = network.vendor || 'Unknown';
  const channel = network.channel || '?';
  const security = network.security || 'Unknown';

  // MAC byte analysis
  const macBytes = bssid.split(':');
  const oui = macBytes.slice(0, 3).join(':').toUpperCase();
  const isRandomized = macBytes.length >= 1 && (parseInt(macBytes[0], 16) & 0x02) !== 0;

  // Frequency calculation from channel
  let freqMHz = 2412; // default ch1
  const ch = parseInt(channel);
  if (ch >= 1 && ch <= 13) {
    freqMHz = 2407 + ch * 5;
  } else if (ch === 14) {
    freqMHz = 2484;
  } else if (ch >= 36) {
    freqMHz = 5000 + ch * 5;
  }

  // Signal physics: estimate distance
  const txPower = -30; // typical WiFi AP TX power at 1m
  const n = 3.0; // path loss exponent for indoor WiFi
  const distance = Math.pow(10, (txPower - rssi) / (10 * n));

  // Free Space Path Loss
  const fspl = 20 * Math.log10(distance) + 20 * Math.log10(freqMHz) + 32.44;

  const byteColors = ['#ef4444','#f97316','#f59e0b','#22c55e','#2dd4bf','#38bdf8'];

  panel.innerHTML =
    '<div class="autopsy-card">' +
      '<div class="autopsy-header">' +
        '<span style="font-size:1.2rem">\u{1F52C}</span>' +
        '<span class="autopsy-title">' + _escH(ssid) + '</span>' +
      '</div>' +
      '<div class="autopsy-grid">' +
        '<div class="autopsy-field"><div class="autopsy-label">BSSID</div><div class="autopsy-value">' + _escH(bssid) + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">OUI Prefix</div><div class="autopsy-value">' + oui + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">Vendor</div><div class="autopsy-value">' + _escH(vendor) + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">Channel</div><div class="autopsy-value">Ch ' + channel + ' (' + freqMHz + ' MHz)</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">Security</div><div class="autopsy-value">' + _escH(security) + '</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">RSSI</div><div class="autopsy-value">' + rssi + ' dBm</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">Est. Distance</div><div class="autopsy-value">' + distance.toFixed(2) + ' m</div></div>' +
        '<div class="autopsy-field"><div class="autopsy-label">MAC Type</div><div class="autopsy-value">' + (isRandomized ? '\u{1F3B2} Randomized' : '\u{1F3ED} Public') + '</div></div>' +
      '</div>' +
      '<div class="autopsy-mac-bytes">' +
        macBytes.map((b, i) => '<span class="autopsy-byte" style="color:' + byteColors[i % 6] + ';border-color:' + byteColors[i % 6] + '30">' + b.toUpperCase() + '</span>').join('') +
      '</div>' +
      generateDeviceDNA(bssid) +
      '<div class="autopsy-signal-physics">' +
        '// SIGNAL PHYSICS ANALYSIS\n' +
        'TX Power (assumed): ' + txPower + ' dBm\n' +
        'Received (RSSI):    ' + rssi + ' dBm\n' +
        'Path Loss:          ' + (txPower - rssi) + ' dB\n' +
        'Frequency:          ' + freqMHz + ' MHz (Ch ' + channel + ')\n' +
        'FSPL:               ' + fspl.toFixed(1) + ' dB\n' +
        'Est. Distance:      ' + distance.toFixed(2) + ' m\n' +
        'Formula: d = 10^((TxPow - RSSI) / (10*n))' +
      '</div>' +
    '</div>';
}

/* ═══════════════════════════════════
   PACKET STORM VISUALIZER
   ═══════════════════════════════════ */
const _packets = []; // {x, y, vx, vy, life, color, size}
let _packetAnimFrame = null;
let _packetCount = 0;

function _addPacketBurst(count) {
  const canvas = document.getElementById('packetStormCanvas');
  if (!canvas) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const colors = ['#38bdf8','#22c55e','#f59e0b','#ef4444','#2dd4bf','#0ea5e9'];
  for (let i = 0; i < count; i++) {
    _packets.push({
      x: w / 2 + (Math.random() - 0.5) * 40,
      y: h / 2,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 60 + Math.random() * 60,
      maxLife: 120,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1.5 + Math.random() * 2
    });
  }
  _packetCount += count;
}

function _renderPacketStorm() {
  const canvas = document.getElementById('packetStormCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // Draw origin glow
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 30);
  grad.addColorStop(0, 'rgba(56,189,248,.15)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(w/2 - 30, h/2 - 30, 60, 60);

  // Update and draw particles
  for (let i = _packets.length - 1; i >= 0; i--) {
    const p = _packets[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
      _packets.splice(i, 1);
      continue;
    }
    const alpha = Math.min(1, p.life / 30);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fill();
    // Trail
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
    ctx.globalAlpha = alpha * 0.3;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size * 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Stats overlay
  const statsEl = document.getElementById('packetStormStats');
  if (statsEl) statsEl.textContent = _packetCount + ' pkts | ' + _packets.length + ' active';

  _packetAnimFrame = requestAnimationFrame(_renderPacketStorm);
}

/* ═══════════════════════════════════
   TIME TRAVEL SCANNER
   ═══════════════════════════════════ */
const _timeTravelSnapshots = []; // [{ts, networks:[{ssid,bssid,rssi,vendor,channel,security}]}]
const TIMETRAVEL_MAX = 30;

function _addTimeTravelSnapshot(networks) {
  if (!networks?.length) return;
  _timeTravelSnapshots.push({
    ts: Date.now(),
    networks: networks.slice(0, 20).map(n => ({
      ssid: n.ssid || '?',
      bssid: n.bssid || '',
      rssi: n.rssi || -100,
      vendor: n.vendor || '',
      channel: n.channel || '',
      security: n.security || ''
    }))
  });
  if (_timeTravelSnapshots.length > TIMETRAVEL_MAX) _timeTravelSnapshots.shift();
  // Update slider max
  const slider = document.getElementById('timeTravelSlider');
  if (slider) {
    slider.max = _timeTravelSnapshots.length - 1;
    slider.value = _timeTravelSnapshots.length - 1;
  }
  _renderTimeTravelSnapshot(_timeTravelSnapshots.length - 1);
}

function onTimeTravelSlide(val) {
  _renderTimeTravelSnapshot(parseInt(val));
}

function _renderTimeTravelSnapshot(idx) {
  const container = document.getElementById('timeTravelView');
  const timeLabel = document.getElementById('timeTravelTime');
  if (!container) return;

  if (idx < 0 || idx >= _timeTravelSnapshots.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.7rem;padding:8px">No snapshots yet \u2014 start scanning</div>';
    return;
  }

  const snap = _timeTravelSnapshots[idx];
  if (timeLabel) timeLabel.textContent = new Date(snap.ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});

  container.innerHTML = '';
  snap.networks.forEach(n => {
    const rssiColor = n.rssi > -50 ? '#22c55e' : n.rssi > -70 ? '#eab308' : '#ef4444';
    const el = document.createElement('div');
    el.className = 'timetravel-device';
    el.innerHTML =
      '<span>' + _escH(n.ssid) + '</span>' +
      '<span class="tt-rssi" style="color:' + rssiColor + '">' + n.rssi + '</span>';
    el.onclick = () => showDeviceAutopsy({ ssid: n.ssid, bssid: n.bssid, rssi: n.rssi, vendor: n.vendor, channel: n.channel, security: n.security });
    el.style.cursor = 'pointer';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   NETWORK GRAVEYARD
   ═══════════════════════════════════ */
const _graveyard = []; // [{ssid, bssid, lastSeen, rssi, vendor}]
const _currentAliveAddrs = new Set();

function _updateGraveyard(networks) {
  const nowAlive = new Set();
  (networks || []).forEach(n => {
    const bssid = n.bssid;
    if (bssid) nowAlive.add(bssid);
  });

  // Networks that were alive but now gone
  _currentAliveAddrs.forEach(bssid => {
    if (!nowAlive.has(bssid) && !_graveyard.some(g => g.bssid === bssid)) {
      const net = _leaderboardNetworks[bssid];
      _graveyard.push({
        ssid: net?.ssid || bssid.substring(0, 8),
        bssid: bssid,
        lastSeen: Date.now(),
        rssi: net?.bestRssi || -100,
        vendor: net?.vendor || ''
      });
      if (_graveyard.length > 20) _graveyard.shift();
    }
  });

  _currentAliveAddrs.clear();
  nowAlive.forEach(a => _currentAliveAddrs.add(a));
  _renderGraveyard();
}

function _renderGraveyard() {
  const container = document.getElementById('graveyardGrid');
  if (!container) return;

  if (!_graveyard.length) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-size:.7rem;padding:12px;grid-column:1/-1">No departed networks yet...</div>';
    return;
  }

  container.innerHTML = '';
  _graveyard.slice().reverse().forEach(g => {
    const ago = Math.round((Date.now() - g.lastSeen) / 60000);
    const el = document.createElement('div');
    el.className = 'tombstone';
    el.innerHTML =
      '<div class="tombstone-icon">\u{1FAA6}</div>' +
      '<div class="tombstone-name">' + _escH(g.ssid) + '</div>' +
      '<div class="tombstone-date">' + ago + 'm ago</div>' +
      '<div class="tombstone-rip">Last: ' + g.rssi + ' dBm</div>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   RF CHANNEL WATERFALL (2.4GHz)
   ═══════════════════════════════════ */
const _rfWaterfallData = []; // rows of 13 channel values (channels 1-13)
const RF_WATERFALL_ROWS = 50;
const RF_CHANNELS_24 = 13;

function _addRfWaterfallRow(networks) {
  // Aggregate RSSI per 2.4GHz channel (1-13)
  const row = new Array(RF_CHANNELS_24).fill(-100);
  (networks || []).forEach(n => {
    const ch = parseInt(n.channel);
    if (ch >= 1 && ch <= 13) {
      const rssi = n.rssi || -100;
      row[ch - 1] = Math.max(row[ch - 1], rssi);
    }
  });
  _rfWaterfallData.push(row);
  if (_rfWaterfallData.length > RF_WATERFALL_ROWS) _rfWaterfallData.shift();
  _renderRfWaterfall();
}

function _renderRfWaterfall() {
  const canvas = document.getElementById('rfMiniCanvas');
  if (!canvas || !_rfWaterfallData.length) return;
  const ctx = canvas.getContext('2d');
  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const cellW = w / RF_CHANNELS_24;
  const cellH = h / RF_WATERFALL_ROWS;

  _rfWaterfallData.forEach((row, rowIdx) => {
    row.forEach((val, ch) => {
      const norm = Math.max(0, Math.min(1, (val + 100) / 70));
      // Color: dark blue -> cyan -> yellow -> red
      let r, g, b;
      if (norm < 0.5) {
        r = 0; g = Math.round(norm * 2 * 200); b = Math.round(180 - norm * 2 * 80);
      } else {
        const t = (norm - 0.5) * 2;
        r = Math.round(t * 255); g = Math.round(200 - t * 130); b = Math.round(100 - t * 100);
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(ch * cellW, rowIdx * cellH, cellW + 0.5, cellH + 0.5);
    });
  });

  // Draw channel labels at bottom
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < RF_CHANNELS_24; i++) {
    ctx.fillText(String(i + 1), (i + 0.5) * cellW, h - 2);
  }
}

/* ═══════════════════════════════════
   EXPOSURE METER (WiFi-adapted)
   ═══════════════════════════════════ */
function _renderStealthMeter(networks) {
  const container = document.getElementById('stealthList');
  if (!container || !networks?.length) return;

  const scored = networks.map(n => {
    let score = 0;
    const tactics = [];
    const bssid = n.bssid || '';
    const ssid = n.ssid || '';
    const rssi = n.rssi || -100;
    const sec = (n.security || '').toUpperCase();

    // Open network = most exposed
    if (sec === 'OPEN' || sec === 'NONE' || sec === '') { score += 40; tactics.push('Open'); }
    // WEP = weak
    else if (sec.includes('WEP')) { score += 30; tactics.push('WEP'); }
    // WPA (not WPA2) = aging
    else if (sec.includes('WPA') && !sec.includes('WPA2') && !sec.includes('WPA3')) { score += 15; tactics.push('WPA1'); }

    // Hidden SSID
    if (n.hidden || !ssid) { score += 20; tactics.push('Hidden'); }

    // Very strong signal (easy to sniff)
    if (rssi > -40) { score += 10; tactics.push('Strong Sig'); }

    // Randomized BSSID (unusual for APs)
    if (bssid && (parseInt(bssid.split(':')[0], 16) & 0x02)) { score += 10; tactics.push('Random MAC'); }

    return { ...n, exposureScore: Math.min(100, score), tactics };
  }).sort((a, b) => b.exposureScore - a.exposureScore).slice(0, 10);

  container.innerHTML = '';
  scored.forEach(n => {
    const color = n.exposureScore > 50 ? '#ef4444' : n.exposureScore > 25 ? '#eab308' : '#22c55e';
    const el = document.createElement('div');
    el.className = 'stealth-row';
    el.innerHTML =
      '<span class="stealth-name">' + _escH(n.ssid || n.bssid || '?') + '</span>' +
      '<div class="stealth-bar-wrap"><div class="stealth-bar" style="width:' + n.exposureScore + '%;background:' + color + '"></div></div>' +
      '<span class="stealth-score" style="color:' + color + '">' + n.exposureScore + '</span>' +
      '<div class="stealth-tactics">' + n.tactics.map(t => '<span class="stealth-tag">' + t + '</span>').join('') + '</div>';
    container.appendChild(el);
  });
}

/* ═══════════════════════════════════
   TERMINAL HACKER VIEW
   ═══════════════════════════════════ */
const _terminalLines = [];
const TERMINAL_MAX = 100;

function _termLog(type, msg) {
  const ts = new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  _terminalLines.push({ ts, type, msg });
  if (_terminalLines.length > TERMINAL_MAX) _terminalLines.shift();
  _renderTerminal();
}

function _renderTerminal() {
  const body = document.getElementById('terminalBody');
  if (!body) return;
  const wasAtBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 20;

  body.innerHTML = '';
  _terminalLines.forEach(l => {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML =
      '<span class="t-time">[' + l.ts + ']</span> ' +
      '<span class="t-type ' + l.type + '">[' + l.type.toUpperCase() + ']</span> ' +
      l.msg;
    body.appendChild(line);
  });

  // Cursor
  const cursor = document.createElement('div');
  cursor.className = 'terminal-line';
  cursor.innerHTML = '<span class="t-time">root@wifi</span>:~$ <span class="terminal-cursor"></span>';
  body.appendChild(cursor);

  if (wasAtBottom) body.scrollTop = body.scrollHeight;
}

/* ═══════════════════════════════════
   SCAN DIFF MODE
   ═══════════════════════════════════ */
let _previousScanNetworks = [];

function _renderScanDiff(currentNetworks) {
  const container = document.getElementById('diffView');
  if (!container) return;

  const prev = new Map(_previousScanNetworks.map(n => [n.bssid, n]));
  const curr = new Map((currentNetworks || []).map(n => [n.bssid, {
    ssid: n.ssid || '?',
    bssid: n.bssid || '',
    rssi: n.rssi || -100
  }]));

  const added = [];
  const removed = [];
  const changed = [];
  const same = [];

  curr.forEach((n, bssid) => {
    if (!prev.has(bssid)) added.push(n);
    else {
      const p = prev.get(bssid);
      const rssiDiff = n.rssi - p.rssi;
      if (Math.abs(rssiDiff) > 5) changed.push({ ...n, rssiDiff });
      else same.push(n);
    }
  });
  prev.forEach((n, bssid) => {
    if (!curr.has(bssid)) removed.push(n);
  });

  // Update summary
  const summary = document.getElementById('diffSummary');
  if (summary) {
    summary.innerHTML =
      '<span class="diff-stat added">+' + added.length + ' new</span>' +
      '<span class="diff-stat removed">-' + removed.length + ' gone</span>' +
      '<span class="diff-stat changed">~' + changed.length + ' changed</span>' +
      '<span class="diff-stat same">=' + same.length + ' same</span>';
  }

  container.innerHTML = '';
  added.forEach(n => {
    container.innerHTML += '<div class="diff-item add"><span class="diff-marker">+</span>' + _escH(n.ssid) + ' <span style="opacity:.5">' + n.rssi + ' dBm</span></div>';
  });
  removed.forEach(n => {
    container.innerHTML += '<div class="diff-item rem"><span class="diff-marker">-</span>' + _escH(n.ssid) + '</div>';
  });
  changed.forEach(n => {
    const arrow = n.rssiDiff > 0 ? '\u25B2' : '\u25BC';
    const color = n.rssiDiff > 0 ? '#22c55e' : '#ef4444';
    container.innerHTML += '<div class="diff-item chg"><span class="diff-marker">~</span>' + _escH(n.ssid) + ' <span style="color:' + color + '">' + arrow + Math.abs(n.rssiDiff) + 'dB</span></div>';
  });

  // Save current as previous for next diff
  _previousScanNetworks = Array.from(curr.values());
}

/* ═══════════════════════════════════
   UTILITY
   ═══════════════════════════════════ */
function _escH(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

/* ═══════════════════════════════════
   HOOKS — intercept scan results to feed all features
   ═══════════════════════════════════ */
function _initFeatureHooks() {
  // Hook directly into WebSocket messages
  const wsCheck = setInterval(() => {
    if (typeof ble !== 'undefined' && ble.ws && ble.ws.onmessage) {
      const origHandler = ble.ws.onmessage;
      ble.ws.onmessage = function(ev) {
        try {
          const msg = JSON.parse(ev.data);
          _handleFeatureEvent(msg);
        } catch {}
        return origHandler.call(this, ev);
      };
      clearInterval(wsCheck);
    }
  }, 500);
  setTimeout(() => clearInterval(wsCheck), 10000);

  // Also hook wifiScan for mission counting
  const origScan = window.wifiScan;
  if (origScan) {
    const currentScan = window.wifiScan;
    window.wifiScan = async function() {
      _incMission('scan_count');
      return currentScan.apply(this, arguments);
    };
  }

  // Hook into renderRadarBlips to update constellation lines and HUD
  const origRender = window.renderRadarBlips;
  if (origRender) {
    window.renderRadarBlips = function(networks) {
      const result = origRender.apply(this, arguments);
      setTimeout(() => {
        _updateConstellationLines();
        _updateHudThreat(networks ? networks.length : 0);
      }, 100);
      return result;
    };
  }

  // Scan minute tracker for marathon mission
  setInterval(() => {
    // Check if scanning is active
    const stopBtn = document.getElementById('stopScanBtn');
    if (stopBtn && stopBtn.style.display !== 'none') {
      _incMission('scan_minutes');
    }
  }, 60000);
}

function _handleFeatureEvent(msg) {
  const t = msg.type;
  if (t === 'scan_result') {
    const networks = msg.networks || [];

    // Map fields: n.bssid = address, n.ssid = name, n.rssi, n.vendor
    const mapped = networks.map(n => ({
      bssid: n.bssid || '',
      ssid: n.ssid || '',
      rssi: n.rssi || -100,
      vendor: n.vendor || '',
      channel: n.channel || '',
      security: n.security || '',
      hidden: n.hidden || (!n.ssid || n.ssid === ''),
      band: n.band || ''
    }));

    // Feed all feature systems
    _trackLeaderboard(mapped);
    _addHeatmapSample(mapped);
    _renderHeatmap();
    _trackCoLocation(mapped);
    _updateAnalytics(mapped);
    _analyzeThreats(mapped);
    _playSoundSignature(mapped);
    // Hacker Lab features
    _addPacketBurst(mapped.length * 2);
    _addTimeTravelSnapshot(mapped);
    _updateGraveyard(mapped);
    _addRfWaterfallRow(mapped);
    _renderStealthMeter(mapped);
    _renderScanDiff(mapped);

    // Call channel.js congestion overview if available
    if (typeof renderCongestionOverview === 'function') {
      renderCongestionOverview(mapped);
    }

    // Terminal log
    const namedNets = mapped.filter(n => n.ssid && n.ssid !== '?');
    _termLog('scan', mapped.length + ' networks found \u2014 ' + namedNets.map(n => n.ssid).slice(0,5).join(', ') + (namedNets.length > 5 ? '...' : ''));

    // Mission tracking
    const data = _loadMissions();

    // Strong signal
    if (mapped.some(n => (n.rssi || -100) > -30)) {
      data.strong_signal = (data.strong_signal || 0) + 1;
    }

    // Open network count
    const openNets = mapped.filter(n => {
      const sec = (n.security || '').toUpperCase();
      return sec === 'OPEN' || sec === 'NONE' || sec === '';
    });
    if (openNets.length > 0) {
      data.open_count = (data.open_count || 0) + openNets.length;
    }

    // Hidden SSIDs
    const hiddenNets = mapped.filter(n => n.hidden);
    if (hiddenNets.length > 0) {
      data.hidden_count = (data.hidden_count || 0) + hiddenNets.length;
    }

    // Dense scan (20+ networks at once)
    if (mapped.length >= 20) {
      data.dense_scan = (data.dense_scan || 0) + 1;
    }

    // Channel diversity
    const channelsSeen = new Set(data._channels || []);
    mapped.forEach(n => {
      if (n.channel) channelsSeen.add(String(n.channel));
    });
    data._channels = Array.from(channelsSeen);
    data.channel_count = channelsSeen.size;

    // Band diversity
    const bandsSeen = new Set(data._bands || []);
    mapped.forEach(n => {
      const ch = parseInt(n.channel);
      if (ch >= 1 && ch <= 14) bandsSeen.add('2.4');
      else if (ch >= 36) bandsSeen.add('5');
      // Also check band field directly
      const b = String(n.band || '');
      if (b.includes('2.4') || b === '2.4GHz') bandsSeen.add('2.4');
      if (b.includes('5') || b === '5GHz') bandsSeen.add('5');
    });
    data._bands = Array.from(bandsSeen);
    data.band_count = bandsSeen.size;

    // Vendor count
    const vendorsSeen = new Set(data._vendors || []);
    mapped.forEach(n => {
      const v = n.vendor || '';
      if (v && v !== 'Unknown') vendorsSeen.add(v);
    });
    data._vendors = Array.from(vendorsSeen);
    data.vendor_count = vendorsSeen.size;

    // Total unique (count BSSIDs tracked in leaderboard)
    data.total_unique = Object.keys(_leaderboardNetworks).length;

    _saveMissions(data);
  }
}

/* ═══════════════════════════════════
   INIT
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    _initFeatureHooks();
    _initRadarStyles();
    _renderLeaderboard();
    _renderMissions();
    _renderHeatmap();
    _renderCoLocationGraph();
    _renderThreats();
    _renderGraveyard();
    _renderTerminal();

    // Start packet storm animation
    _renderPacketStorm();

    // Terminal boot sequence
    _termLog('scan', 'WiFi Dashboard v1.0 initialized');
    _termLog('scan', 'Radar styles: ' + RADAR_STYLES.length + ' loaded');
    _termLog('scan', 'Systems online \u2014 awaiting scan...');

    // Periodic refresh
    setInterval(() => {
      _renderLeaderboard();
      _renderMissions();
      _renderCoLocationGraph();
    }, 10000);

    // Resize handlers
    window.addEventListener('resize', () => {
      _renderHeatmap();
      _renderCoLocationGraph();
      _renderRfWaterfall();
    });
  }, 800);
});

/* ═══════════════════════════════════
   EXPOSE GLOBALS FOR HTML onclick
   ═══════════════════════════════════ */
window.setRadarStyle = setRadarStyle;
window.toggleSoundscape = toggleSoundscape;
window.onTimeTravelSlide = onTimeTravelSlide;
window.exportScanReport = exportScanReport;
window.showDeviceAutopsy = showDeviceAutopsy;
