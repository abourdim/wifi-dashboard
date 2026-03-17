/**
 * wifi.js  v1.0  — WiFi Dashboard frontend logic
 * Loaded after script.js (Workshop-DIY template).
 * Provides: i18n extension · WebSocket backend · passive WiFi scanning ·
 *           Chart.js RSSI monitor · radar visualization · channel analysis
 */

/* ═══════════════════════════════════
   i18n — extend template LANG at parse time
   so template init() picks up WiFi keys
   ═══════════════════════════════════ */
(function extendLang() {
  if (typeof LANG === 'undefined') return;
  const ext = {
    en: {
      title:'WiFi Dashboard', subtitle:'📡 scan · 📊 monitor · 📶 analyze',
      scanTitle:'WiFi Scanner', scanDesc:'Discover nearby WiFi networks',
      scanStart:'Scan', scanStop:'Stop',
      filterLabel:'Filter by SSID', rssiLabel:'Min RSSI', bandFilter:'Band',
      bandAll:'All', band24:'2.4 GHz', band5:'5 GHz',
      noNetworks:'No networks found. Press Scan to start.',
      hiddenNetwork:'(Hidden Network)',
      channelTitle:'Channel Analysis', channelDesc:'View channel utilization and interference',
      channelBtn:'Analyze Channels', bestChannelBtn:'Best Channel',
      detailTitle:'Network Details', detailDesc:'Click a network to view full metadata',
      monitorTitle:'Monitor', chartTitle:'Real-time RSSI', chartDesc:'Signal strength over time',
      clearChart:'Clear', exportChart:'Export',
      chartWindow:'Window (pts)', chartPause:'Pause', chartGrid:'Grid',
      statMin:'Min', statMax:'Max', statAvg:'Avg', statCount:'Points',
      backendURL:'Backend URL', logFormat:'Log format', logBoth:'CSV + JSON',
      exportLogs:'Export logs from backend',
      simulateBtn:'Simulate', simulateDesc:'Generate simulated WiFi scan data',
      secOpen:'Open', secWPA:'WPA', secWPA2:'WPA2', secWPA3:'WPA3', secWEP:'WEP',
      faq_q1:'What is WiFi scanning?', faq_a1:'Passive monitoring of nearby wireless access points and their signal characteristics.',
      faq_q2:'Why no networks?', faq_a2:'Ensure backend is running with appropriate permissions. Some OS require sudo for WiFi scanning.',
      faq_q3:'What is RSSI?', faq_a3:'Received Signal Strength Indicator — measured in dBm. Higher (less negative) values mean stronger signals.',
      faq_q4:'What bands are supported?', faq_a4:'2.4 GHz (channels 1-14) and 5 GHz (channels 36-165). The dashboard auto-detects both.',
      faq_q5:'How to start backend?', faq_a5:'cd backend && pip install -r requirements.txt && python main.py',
      howto_1:'Start backend: cd backend && python main.py',
      howto_2:'Open http://localhost:8001 in your browser.',
      howto_3:'Click Scan. Filter by SSID, RSSI, or band if needed.',
      howto_4:'Click a network to view detailed information.',
      howto_5:'Monitor signal strength in the real-time chart.',
      howto_6:'Use Channel Analysis to find the best channel.',
      wiki_wifi_title:'📡 WiFi Protocol', wiki_wifi:'IEEE 802.11 family. 2.4 GHz (b/g/n) and 5 GHz (a/n/ac/ax) bands.',
      wiki_channel_title:'📻 Channels', wiki_channel:'2.4 GHz: ch1-14 (20 MHz). 5 GHz: ch36-165 (20/40/80/160 MHz). Non-overlapping: 1,6,11.',
      wiki_backend_title:'🐍 Backend', wiki_backend:'FastAPI + WiFi scanner. WS: ws://localhost:8001/ws. REST: /api/. Linux · macOS.',
      wiki_log_title:'📜 Log', wiki_log:'TX (blue) = sent, RX (cyan) = received. Filter by type, export.',
    },
    fr: {
      title:'Tableau WiFi', subtitle:'📡 scan · 📊 surveillance · 📶 analyse',
      scanTitle:'Scanner WiFi', scanDesc:'Découvrir les réseaux WiFi à proximité',
      scanStart:'Scanner', scanStop:'Arrêter',
      filterLabel:'Filtrer par SSID', rssiLabel:'RSSI min', bandFilter:'Bande',
      bandAll:'Tous', band24:'2,4 GHz', band5:'5 GHz',
      noNetworks:'Aucun réseau. Appuie sur Scanner.',
      hiddenNetwork:'(Réseau caché)',
      channelTitle:'Analyse des canaux', channelDesc:'Visualiser l\'utilisation des canaux',
      channelBtn:'Analyser les canaux', bestChannelBtn:'Meilleur canal',
      detailTitle:'Détails du réseau', detailDesc:'Cliquer sur un réseau pour voir ses métadonnées',
      monitorTitle:'Moniteur', chartTitle:'RSSI temps réel', chartDesc:'Puissance du signal en direct',
      clearChart:'Effacer', exportChart:'Exporter',
      chartWindow:'Fenêtre (pts)', chartPause:'Pause', chartGrid:'Grille',
      statMin:'Min', statMax:'Max', statAvg:'Moy', statCount:'Points',
      backendURL:'URL Backend', logFormat:'Format de log', logBoth:'CSV + JSON',
      exportLogs:'Exporter les logs',
      simulateBtn:'Simuler', simulateDesc:'Générer des données WiFi simulées',
      secOpen:'Ouvert', secWPA:'WPA', secWPA2:'WPA2', secWPA3:'WPA3', secWEP:'WEP',
      faq_q1:'C\'est quoi le scan WiFi?', faq_a1:'Surveillance passive des points d\'accès sans fil à proximité.',
      faq_q2:'Pourquoi pas de réseaux?', faq_a2:'Vérifier que le backend tourne avec les permissions nécessaires.',
      faq_q3:'C\'est quoi le RSSI?', faq_a3:'Indicateur de puissance du signal reçu — en dBm. Plus élevé = plus fort.',
      faq_q4:'Quelles bandes?', faq_a4:'2,4 GHz (canaux 1-14) et 5 GHz (canaux 36-165).',
      faq_q5:'Comment démarrer le backend?', faq_a5:'cd backend && pip install -r requirements.txt && python main.py',
      howto_1:'Démarrer backend: cd backend && python main.py',
      howto_2:'Ouvrir http://localhost:8001 dans le navigateur.',
      howto_3:'Cliquer Scanner. Filtrer si besoin.',
      howto_4:'Cliquer sur un réseau pour les détails.',
      howto_5:'Surveiller le signal en temps réel.',
      howto_6:'Analyser les canaux pour trouver le meilleur.',
      wiki_wifi_title:'📡 Protocole WiFi', wiki_wifi:'Famille IEEE 802.11. Bandes 2,4 GHz et 5 GHz.',
      wiki_channel_title:'📻 Canaux', wiki_channel:'2,4 GHz: ch1-14. 5 GHz: ch36-165. Sans chevauchement: 1,6,11.',
      wiki_backend_title:'🐍 Backend', wiki_backend:'FastAPI + scanner WiFi. WS: ws://localhost:8001/ws. Multiplateforme.',
      wiki_log_title:'📜 Journal', wiki_log:'TX (bleu) = envoyé, RX (cyan) = reçu.',
    },
    ar: {
      title:'لوحة WiFi', subtitle:'📡 مسح · 📊 مراقبة · 📶 تحليل',
      scanTitle:'ماسح WiFi', scanDesc:'اكتشاف شبكات WiFi القريبة',
      scanStart:'مسح', scanStop:'إيقاف',
      filterLabel:'تصفية بـ SSID', rssiLabel:'RSSI أدنى', bandFilter:'النطاق',
      bandAll:'الكل', band24:'2.4 جيجا', band5:'5 جيجا',
      noNetworks:'لا شبكات. اضغط مسح.',
      hiddenNetwork:'(شبكة مخفية)',
      channelTitle:'تحليل القنوات', channelDesc:'عرض استخدام القنوات والتداخل',
      channelBtn:'تحليل القنوات', bestChannelBtn:'أفضل قناة',
      detailTitle:'تفاصيل الشبكة', detailDesc:'انقر على شبكة لعرض البيانات الكاملة',
      monitorTitle:'المراقبة', chartTitle:'RSSI حي', chartDesc:'قوة الإشارة في الوقت الحقيقي',
      clearChart:'مسح', exportChart:'تصدير',
      chartWindow:'نافذة (نقاط)', chartPause:'إيقاف مؤقت', chartGrid:'شبكة',
      statMin:'أدنى', statMax:'أقصى', statAvg:'متوسط', statCount:'نقاط',
      backendURL:'رابط الخادم', logFormat:'تنسيق السجل', logBoth:'CSV + JSON',
      exportLogs:'تصدير السجلات',
      simulateBtn:'محاكاة', simulateDesc:'توليد بيانات WiFi محاكاة',
      secOpen:'مفتوح', secWPA:'WPA', secWPA2:'WPA2', secWPA3:'WPA3', secWEP:'WEP',
      faq_q1:'ما هو مسح WiFi؟', faq_a1:'مراقبة سلبية لنقاط الوصول اللاسلكية القريبة.',
      faq_q2:'لماذا لا توجد شبكات؟', faq_a2:'تأكد من تشغيل الخادم بالصلاحيات المناسبة.',
      faq_q3:'ما هو RSSI؟', faq_a3:'مؤشر قوة الإشارة المستقبلة — بوحدة dBm.',
      faq_q4:'ما النطاقات المدعومة؟', faq_a4:'2.4 جيجاهرتز و5 جيجاهرتز.',
      faq_q5:'كيف أشغّل الخادم؟', faq_a5:'cd backend && pip install -r requirements.txt && python main.py',
      howto_1:'شغّل الخادم: cd backend && python main.py',
      howto_2:'افتح http://localhost:8001 في المتصفح.',
      howto_3:'اضغط مسح. صفّ بالاسم أو RSSI.',
      howto_4:'انقر على شبكة لعرض التفاصيل.',
      howto_5:'راقب قوة الإشارة في الرسم البياني.',
      howto_6:'حلّل القنوات للعثور على الأفضل.',
      wiki_wifi_title:'📡 بروتوكول WiFi', wiki_wifi:'عائلة IEEE 802.11. نطاقات 2.4 و5 جيجاهرتز.',
      wiki_channel_title:'📻 القنوات', wiki_channel:'2.4 جيجا: قناة 1-14. 5 جيجا: قناة 36-165.',
      wiki_backend_title:'🐍 الخادم', wiki_backend:'FastAPI + ماسح WiFi. متعدد المنصات.',
      wiki_log_title:'📜 السجل', wiki_log:'TX (أزرق) = مُرسَل، RX (سماوي) = مُستقبَل.',
    },
  };
  ['en','fr','ar'].forEach(l => Object.assign(LANG[l], ext[l]));
})();

/* ═══════════════════════════════════
   STATE — global `ble` object for compatibility
   with radar-styles.css and features.js
   ═══════════════════════════════════ */
const ble = {
  ws:            null,
  wsConnected:   false,
  networks:      [],          // current scan results
  selectedNet:   null,        // currently selected network (bssid)
  scanActive:    false,
  bandFilter:    'all',       // 'all' | '2.4' | '5'
  chartData:     [],
  chartPaused:   false,
  stats:         { min:null, max:null, sum:0, count:0 },
  channelData:   null,        // last channel analysis result
  bestChannel:   null,        // last best channel result
};

/* ═══════════════════════════════════
   DEBUG STATE
   ═══════════════════════════════════ */
const _debug = {
  timeline:     [],          // {ts, event, detail, type}
};

/* ═══════════════════════════════════
   NETWORK HISTORY & FAVORITES
   ═══════════════════════════════════ */
const _networkHistory = new Map(); // bssid -> {network, firstSeen, lastSeen, rssiHistory}
const _favorites = new Set((() => { try { return JSON.parse(localStorage.getItem('wifi-favorites') || '[]'); } catch { return []; } })());

function toggleFavorite(bssid) {
  if (_favorites.has(bssid)) _favorites.delete(bssid);
  else _favorites.add(bssid);
  localStorage.setItem('wifi-favorites', JSON.stringify([..._favorites]));
  renderNetworkList();
}

function _updateNetworkHistory(networks) {
  const now = Date.now();
  networks.forEach(n => {
    const bssid = n.bssid;
    if (!bssid) return;
    const existing = _networkHistory.get(bssid);
    if (existing) {
      existing.network = n;
      existing.lastSeen = now;
      if (n.rssi != null) {
        existing.rssiHistory.push(n.rssi);
        if (existing.rssiHistory.length > 30) existing.rssiHistory.shift();
      }
    } else {
      _networkHistory.set(bssid, {
        network: n,
        firstSeen: now,
        lastSeen: now,
        rssiHistory: n.rssi != null ? [n.rssi] : [],
      });
    }
  });
  // Update badge
  const badge = document.getElementById('historyBadge');
  if (badge) {
    badge.textContent = _networkHistory.size + ' seen';
    badge.style.display = '';
  }
}

/* ═══════════════════════════════════
   CONNECTION TIMELINE
   ═══════════════════════════════════ */
function _timelineEvent(event, detail, type) {
  const entry = { ts: new Date(), event, detail: detail||'', type: type||'info' };
  _debug.timeline.push(entry);
  if (_debug.timeline.length > 200) _debug.timeline.shift();
  _renderTimeline();
}

function _renderTimeline() {
  const el = document.getElementById('timelineBody');
  if (!el) return;
  el.innerHTML = '';
  const recent = _debug.timeline.slice(-30).reverse();
  recent.forEach(e => {
    const row = document.createElement('div');
    row.className = 'tl-entry tl-' + e.type;
    const t = e.ts.toLocaleTimeString() + '.' + String(e.ts.getMilliseconds()).padStart(3,'0');
    row.innerHTML = '<span class="tl-time">' + t + '</span>' +
      '<span class="tl-dot"></span>' +
      '<span class="tl-event">' + esc(e.event) + '</span>' +
      (e.detail ? '<span class="tl-detail">' + esc(e.detail) + '</span>' : '');
    el.appendChild(row);
  });
}

/* ═══════════════════════════════════
   HELPERS
   ═══════════════════════════════════ */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/** Friendly display name for a vendor string */
function friendlyName(vendor) {
  if (!vendor) return '';
  // Clean up common vendor name patterns
  const v = String(vendor).trim();
  if (v.length <= 20) return v;
  // Truncate long vendor strings
  return v.substring(0, 18) + '...';
}

/** RSSI bar characters */
function rssiToBars(rssi) {
  if (rssi >= -50) return '▓▓▓▓';
  if (rssi >= -60) return '▓▓▓░';
  if (rssi >= -70) return '▓▓░░';
  if (rssi >= -80) return '▓░░░';
  return '░░░░';
}

/** RSSI color: green >-50, yellow -70 to -50, orange -85 to -70, red <-85 */
function rssiColor(rssi) {
  if (rssi >= -50) return '#22cc88';
  if (rssi >= -70) return '#eab308';
  if (rssi >= -85) return '#f97316';
  return '#ef4444';
}

/** Security icon */
function securityIcon(security) {
  if (!security) return '<span class="wifi-sec-icon wifi-sec-unknown" title="Unknown">?</span>';
  const s = String(security).toUpperCase();
  if (s === 'OPEN' || s === 'NONE' || s === '') {
    return '<span class="wifi-sec-icon wifi-sec-open" title="Open (no encryption)">&#9888;</span>';
  }
  return '<span class="wifi-sec-icon wifi-sec-locked" title="' + esc(security) + '">&#128274;</span>';
}

/** Security badge text */
function securityBadge(security) {
  if (!security || security === 'OPEN' || security === 'NONE') return 'Open';
  return String(security).toUpperCase();
}

/** Band pill (2.4G / 5G) */
function bandPill(band, frequency) {
  let b = '';
  let cls = 'wifi-band-pill';
  if (band) {
    b = String(band);
  } else if (frequency) {
    b = frequency < 3000 ? '2.4' : '5';
  }
  if (b === '2.4' || b === '2.4GHz' || b === '2.4 GHz') {
    cls += ' wifi-band-24';
    b = '2.4G';
  } else if (b === '5' || b === '5GHz' || b === '5 GHz') {
    cls += ' wifi-band-5';
    b = '5G';
  } else {
    cls += ' wifi-band-unknown';
    b = b || '?';
  }
  return '<span class="' + cls + '">' + esc(b) + '</span>';
}

/** Channel badge */
function channelBadge(channel) {
  if (channel == null) return '';
  return '<span class="wifi-channel-badge" title="Channel ' + channel + '">Ch ' + channel + '</span>';
}

/** Bandwidth badge */
function bandwidthBadge(bandwidth) {
  if (!bandwidth) return '';
  return '<span class="wifi-bw-badge" title="Bandwidth">' + esc(String(bandwidth)) + '</span>';
}

/** Deterministic angle from BSSID hash (for radar) */
function _hashAngle(addr) {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = ((h << 5) - h + addr.charCodeAt(i)) | 0;
  return ((h % 360) + 360) % 360;
}

/** Map RSSI to radar radius: 0=center (strong), 1=edge (weak) */
function _rssiToRadius(rssi) {
  const clamped = Math.max(-100, Math.min(-30, rssi || -100));
  return 0.05 + ((clamped + 30) / -70) * 0.87;
}

/** RSSI sparkline SVG */
function _rssiSparkline(history) {
  if (!history || !history.length) return '';
  const w = 60, h = 20;
  const min = -100, max = -30;
  const points = history.map((v, i) => {
    const x = (i / Math.max(1, history.length - 1)) * w;
    const y = h - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * h;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const lastRssi = history[history.length - 1];
  const color = rssiColor(lastRssi);
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" class="nrf-spark-svg">' +
    '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
}

/** RSSI history graph (larger, for detail panel) */
function _rssiGraph(history) {
  const w = 200, h = 50;
  const min = -100, max = -30;
  const points = history.map((v, i) => {
    const x = (i / Math.max(1, history.length - 1)) * w;
    const y = h - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * h;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');
  const fillPoints = '0,' + h + ' ' + points + ' ' + w + ',' + h;
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<defs><linearGradient id="rssiGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="#22cc88" stop-opacity="0.3"/>' +
    '<stop offset="100%" stop-color="#22cc88" stop-opacity="0.02"/>' +
    '</linearGradient></defs>' +
    '<polygon points="' + fillPoints + '" fill="url(#rssiGrad)"/>' +
    '<polyline points="' + points + '" fill="none" stroke="#22cc88" stroke-width="2" stroke-linecap="round"/>' +
    '<text x="' + w + '" y="12" text-anchor="end" fill="#7a8aaa" font-size="10">' + history[history.length-1] + ' dBm</text>' +
    '<text x="2" y="' + (h-2) + '" fill="#7a8aaa55" font-size="8">-100</text>' +
    '<text x="2" y="10" fill="#7a8aaa55" font-size="8">-30</text>' +
    '</svg>';
}

/** Get the band from a network object */
function _getNetBand(n) {
  if (n.band) {
    const b = String(n.band);
    if (b.includes('2.4')) return '2.4';
    if (b.includes('5')) return '5';
    return b;
  }
  if (n.frequency) return n.frequency < 3000 ? '2.4' : '5';
  return null;
}

/** OUI-based vendor lookup from BSSID */
const _ouiVendors = {
  '00:1A:2B': 'Cisco', '00:14:22': 'Dell', '00:25:00': 'Apple',
  '00:26:AB': 'Netgear', '3C:37:86': 'Netgear', 'C0:3F:0E': 'Netgear',
  '00:1E:58': 'D-Link', '1C:7E:E5': 'D-Link', '28:10:7B': 'D-Link',
  'AC:84:C6': 'TP-Link', '50:C7:BF': 'TP-Link', '60:E3:27': 'TP-Link',
  'F4:F2:6D': 'TP-Link', 'B0:4E:26': 'TP-Link', '98:DA:C4': 'TP-Link',
  'E4:F0:42': 'Google', '94:EB:2C': 'Google', 'F4:F5:D8': 'Google',
  'C8:69:CD': 'Apple', '88:71:B1': 'Apple', 'F0:72:EA': 'Apple',
  '00:1F:33': 'Netgear', '20:4E:7F': 'Netgear',
  'FC:EC:DA': 'Ubiquiti', '80:2A:A8': 'Ubiquiti', '24:A4:3C': 'Ubiquiti',
  '00:17:C5': 'Cisco/Linksys', '00:23:69': 'Cisco/Linksys',
  '00:0C:F1': 'Intel', '68:05:CA': 'Intel', '7C:5C:F8': 'Intel',
  '00:1F:3B': 'Intel', '00:24:D7': 'Intel',
  '00:50:F2': 'Microsoft', '00:15:5D': 'Microsoft',
  '00:1A:A0': 'Aruba', 'D8:C7:C8': 'Aruba', '00:0B:86': 'Aruba',
  '00:1C:B3': 'Apple', '00:1D:4F': 'Apple', '04:0C:CE': 'Apple',
  'F0:99:BF': 'Apple', '00:17:F2': 'Apple',
  'E8:48:B8': 'Samsung', '00:21:19': 'Samsung', 'AC:5F:3E': 'Samsung',
  'C8:BA:94': 'Samsung', '44:6D:57': 'Liteon/Qualcomm',
  '78:24:AF': 'ASUS', '1C:87:2C': 'ASUS', '38:2C:4A': 'ASUS',
  'F8:32:E4': 'ASUS', '04:D4:C4': 'ASUS',
  '00:90:A9': 'Western Digital', '00:26:2D': 'Wistron',
  'C0:25:06': 'Belkin', '08:86:3B': 'Belkin',
  '5C:F3:70': 'Huawei', '00:46:4B': 'Huawei', '00:25:68': 'Huawei',
  'BC:76:70': 'Huawei', '54:A5:1B': 'Huawei',
  'A8:5E:45': 'Xiaomi', '78:11:DC': 'Xiaomi', '64:CC:2E': 'Xiaomi',
};

function _vendorFromBssid(bssid) {
  if (!bssid) return null;
  const prefix = bssid.toUpperCase().substring(0, 8);
  return _ouiVendors[prefix] || null;
}

/** Get display vendor for a network */
function _netVendor(n) {
  if (n.vendor) return n.vendor;
  return _vendorFromBssid(n.bssid) || null;
}

/* ═══════════════════════════════════
   WEBSOCKET
   ═══════════════════════════════════ */
let _wsRetries = 0;
const _WS_FALLBACK_PORTS = [8001, 8000, 8002];

function wsConnect() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const customUrl = (document.getElementById('backendURL')||{}).value;
  const defaultUrl = proto + '//' + location.host + '/ws';
  const url = customUrl && customUrl !== 'ws://localhost:8001/ws' ? customUrl : defaultUrl;
  if (ble.ws && ble.ws.readyState < 2) return;
  try {
    ble.ws = new WebSocket(url);
    ble.ws.onopen = () => {
      ble.wsConnected = true; _wsRetries = 0;
      _timelineEvent('WS Connected', url, 'success');
      log('🔌 Backend connected ('+url+')','success');
      wsSend({type:'hello', version:'1.0'});
    };
    ble.ws.onclose = () => {
      ble.wsConnected = false;
      _wsRetries++;
      _timelineEvent('WS Disconnected', 'retry #'+_wsRetries, 'error');
      if (_wsRetries >= 2) {
        const hostname = location.hostname || 'localhost';
        const currentPort = parseInt(location.port) || 80;
        const fallback = _WS_FALLBACK_PORTS.find(p => p !== currentPort);
        if (fallback && _wsRetries <= 4) {
          const fallbackUrl = proto + '//' + hostname + ':' + fallback + '/ws';
          log('⚠️ Port mismatch? Trying backend on :'+fallback+'...','error');
          setTimeout(() => _wsConnectTo(fallbackUrl), 1000);
          return;
        }
      }
      log('⚠️ Backend disconnected — retrying...','error');
      setTimeout(wsConnect, 3000);
    };
    ble.ws.onerror = () => {};
    ble.ws.onmessage = (ev) => { try { wsHandle(JSON.parse(ev.data)); } catch(e) { console.error('WS message error:', e); } };
  } catch(e) { log('WS init failed: '+e.message,'error'); }
}

function _wsConnectTo(url) {
  try {
    ble.ws = new WebSocket(url);
    ble.ws.onopen = () => {
      ble.wsConnected = true; _wsRetries = 0;
      log('🔌 Backend connected ('+url+')','success');
      const field = document.getElementById('backendURL');
      if (field) field.value = url;
      wsSend({type:'hello', version:'1.0'});
    };
    ble.ws.onclose = () => { ble.wsConnected = false; _wsRetries++; setTimeout(wsConnect, 3000); };
    ble.ws.onerror = () => {};
    ble.ws.onmessage = (ev) => { try { wsHandle(JSON.parse(ev.data)); } catch(e) { console.error('WS message error:', e); } };
  } catch(e) { setTimeout(wsConnect, 3000); }
}

function wsSend(obj) {
  if (ble.ws && ble.ws.readyState === 1) {
    ble.ws.send(JSON.stringify(obj));
    log('TX → '+obj.type,'tx');
    return true;
  }
  log('⚠️ Not connected — ' + obj.type + ' dropped','error');
  return false;
}

function wsHandle(msg) {
  switch(msg.type) {
    case 'scan_result': {
      const nets = msg.networks || [];
      const named = nets.filter(n => n.ssid && n.ssid !== '');
      log('RX ← scan_result: '+nets.length+' network(s)' + (named.length ? ' — named: '+named.map(n=>n.ssid).join(', ') : ''),'rx');
      ble.networks = nets;
      renderNetworkList(nets);
      toggleScanBtns(false);
      hideToast();
      // If a network is selected, refresh its detail panel and push RSSI to chart
      if (ble.selectedNet) {
        const sel = nets.find(n => n.bssid === ble.selectedNet);
        if (sel) {
          _renderNetworkDetail(sel);
          if (sel.rssi != null) pushChartPoint(sel.rssi, sel.ssid || sel.bssid);
        }
      }
      // Feed features and badges directly (no monkey-patching)
      if (typeof window._handleFeatureEvent === 'function') try { window._handleFeatureEvent(msg); } catch(e) { console.error('Feature event error:', e); }
      if (typeof window._handleBadgeEvent === 'function') try { window._handleBadgeEvent(msg); } catch(e) { console.error('Badge event error:', e); }
      break;
    }
    case 'channel_analysis': {
      ble.channelData = msg;
      const totalNets = (msg.ghz24 ? msg.ghz24.total_networks : 0) + (msg.ghz5 ? msg.ghz5.total_networks : 0);
      log('RX ← channel_analysis: ' + totalNets + ' networks analyzed','rx');
      _timelineEvent('Channel Analysis', 'received', 'info');
      _renderChannelAnalysis(msg);
      if (typeof handleChannelAnalysis === 'function') handleChannelAnalysis(msg);
      break;
    }
    case 'best_channel': {
      ble.bestChannel = msg;
      const ch24 = msg.best_2_4 || msg.best_24 || '?';
      const ch5 = msg.best_5 || '?';
      log('RX ← best_channel: 2.4GHz=' + ch24 + ', 5GHz=' + ch5,'rx');
      _timelineEvent('Best Channel', '2.4G: ch' + ch24 + ', 5G: ch' + ch5, 'success');
      _showBestChannel(msg);
      break;
    }
    case 'error':
      log('⚠️ '+msg.message,'error');
      _timelineEvent('Error', msg.message, 'error');
      toggleScanBtns(false);
      hideToast();
      break;
    default:
      log('RX ← '+(msg.type||'?'),'rx');
  }
}

/* ═══════════════════════════════════
   SCAN
   ═══════════════════════════════════ */
let _scanTimer = null;

function wifiScan() {
  // Clear any existing scan timer to prevent parallel scan loops
  if (_scanTimer) { clearTimeout(_scanTimer); _scanTimer = null; }
  if (!ble.ws || ble.ws.readyState !== 1) {
    log('⚠️ Cannot scan — backend not connected','error');
    if (typeof showToast === 'function') showToast('Not connected to backend', 2000);
    return;
  }
  toggleScanBtns(true);
  ble.scanActive = true;
  showToast('Scanning...', 0);
  _doScan();
}

function _doScan() {
  // Stop scan loop if WS disconnected
  if (!ble.ws || ble.ws.readyState !== 1) {
    wifiStopScan();
    return;
  }
  const ssidFilter = (document.getElementById('deviceNameFilter')||{}).value || '';
  const rssiMin    = parseInt((document.getElementById('rssiFilter')||{}).value || '-90', 10);
  const band       = ble.bandFilter !== 'all' ? ble.bandFilter : undefined;
  const params = { type:'scan', ssid_filter:ssidFilter, rssi_min:rssiMin };
  if (band) params.band = band;
  wsSend(params);
  // Continuous scan — re-scan every 5s until stopped
  _scanTimer = setTimeout(() => {
    const stopBtn = document.getElementById('stopScanBtn');
    if (stopBtn && stopBtn.style.display !== 'none') _doScan();
  }, 5000);
}

function wifiStopScan() {
  clearTimeout(_scanTimer); _scanTimer = null;
  ble.scanActive = false;
  toggleScanBtns(false); hideToast();
  wsSend({type:'scan_stop'});
  log('⛔ Scan stopped','info');
}

function toggleScanBtns(scanning) {
  const s = document.getElementById('scanBtn'), t = document.getElementById('stopScanBtn');
  if (s) s.style.display = scanning ? 'none' : '';
  if (t) t.style.display = scanning ? '' : 'none';
}

/* ═══════════════════════════════════
   SIMULATE MODE
   ═══════════════════════════════════ */
function simulateNetworks() {
  log('🎲 Requesting simulated WiFi scan...','info');
  wsSend({type:'scan', simulate:true});
  _timelineEvent('Simulate', 'Simulated scan requested', 'info');
  // Note: simulated scan results arrive via WebSocket as normal scan_result messages,
  // which feed features/badges via wsHandle() automatically
}

/* ═══════════════════════════════════
   BAND FILTER
   ═══════════════════════════════════ */
function setBandFilter(band) {
  ble.bandFilter = band;
  // Update band filter button states
  document.querySelectorAll('.wifi-band-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.band === band);
  });
  // Re-render with current networks
  renderNetworkList();
  log('📶 Band filter: ' + (band === 'all' ? 'All' : band + ' GHz'),'info');
}

/* ═══════════════════════════════════
   NETWORK LIST
   ═══════════════════════════════════ */
let _lastNetworks = [];
let _showAllNetworks = true;
const MAX_VISIBLE_NETWORKS = 5;

function renderNetworkList(networks) {
  const list = document.getElementById('deviceList');
  if (!list) return;
  if (networks) _lastNetworks = networks;
  else networks = _lastNetworks;

  // Track history
  if (networks.length) _updateNetworkHistory(networks);

  if (!networks.length) {
    list.innerHTML = '<div class="wifi-empty">No networks found.</div>';
    return;
  }

  // Apply band filter
  let filtered = networks;
  if (ble.bandFilter !== 'all') {
    filtered = networks.filter(n => {
      const band = _getNetBand(n);
      return band === ble.bandFilter;
    });
  }

  // Apply SSID text filter
  const ssidFilter = (document.getElementById('deviceNameFilter')||{}).value || '';
  if (ssidFilter) {
    const q = ssidFilter.toLowerCase();
    filtered = filtered.filter(n => {
      const ssid = (n.ssid || '').toLowerCase();
      const bssid = (n.bssid || '').toLowerCase();
      return ssid.includes(q) || bssid.includes(q);
    });
  }

  // Apply RSSI filter
  const rssiMin = parseInt((document.getElementById('rssiFilter')||{}).value || '-90', 10);
  if (rssiMin > -100) {
    filtered = filtered.filter(n => (n.rssi || -100) >= rssiMin);
  }

  if (!filtered.length) {
    list.innerHTML = '<div class="wifi-empty">No networks match current filters.</div>';
    return;
  }

  // Sort: favorites first, then by RSSI (strongest first)
  filtered.sort((a, b) => {
    const aFav = _favorites.has(a.bssid) ? 1 : 0;
    const bFav = _favorites.has(b.bssid) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;
    return (b.rssi || -999) - (a.rssi || -999);
  });

  // Group by band
  const groups = { '2.4 GHz': [], '5 GHz': [], 'Unknown': [] };
  filtered.forEach(n => {
    const band = _getNetBand(n);
    if (band === '2.4') groups['2.4 GHz'].push(n);
    else if (band === '5') groups['5 GHz'].push(n);
    else groups['Unknown'].push(n);
  });

  // Order groups, hide empty
  const groupNames = ['2.4 GHz', '5 GHz', 'Unknown'].filter(g => groups[g].length > 0);

  list.innerHTML = '';

  const bandColors = {
    '2.4 GHz': '#eab308',
    '5 GHz':   '#3b82f6',
    'Unknown': '#6b7280',
  };

  groupNames.forEach(groupName => {
    const nets = groups[groupName];
    const gColor = bandColors[groupName] || 'var(--accent)';
    const details = document.createElement('details');
    details.className = 'collapsible vendor-group';
    details.open = true;
    details.style.setProperty('--vendor-color', gColor);

    const summary = document.createElement('summary');
    const icon = groupName === '2.4 GHz' ? '📶' : groupName === '5 GHz' ? '📡' : '❓';
    summary.innerHTML = '<span class="icon">' + icon + '</span> ' + esc(groupName) +
      ' <span class="badge"><strong>' + nets.length + '</strong></span>';
    details.appendChild(summary);

    const groupBody = document.createElement('div');
    groupBody.className = 'vendor-group-body';

    nets.forEach(n => {
      const rssi    = n.rssi != null ? n.rssi : '—';
      const bars    = n.rssi != null ? rssiToBars(n.rssi) : '░░░░';
      const color   = n.rssi != null ? rssiColor(n.rssi) : 'var(--text-dim)';
      const bssid   = n.bssid || '';
      const isFav   = _favorites.has(bssid);
      const isHidden = n.hidden || (!n.ssid || n.ssid === '');
      const ssid    = isHidden ? '(Hidden Network)' : n.ssid;
      const vendor  = _netVendor(n);
      const hist    = _networkHistory.get(bssid);
      const rssiHist = (hist ? hist.rssiHistory : null) || n.rssi_history || (n.rssi != null ? [n.rssi] : []);
      const sparkSvg = _rssiSparkline(rssiHist);

      const row = document.createElement('div');
      row.className = 'wifi-network-row' + (ble.selectedNet === bssid ? ' wifi-selected' : '');
      row.onclick = () => selectNetwork(n);

      row.innerHTML =
        '<button class="ble-fav-btn ' + (isFav ? 'fav-active' : '') + '" onclick="event.stopPropagation();toggleFavorite(\'' + esc(bssid) + '\')" title="Favorite">' + (isFav ? '★' : '☆') + '</button>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="wifi-net-name' + (isHidden ? ' wifi-hidden' : '') + '">' +
            securityIcon(n.security) + ' ' + esc(ssid) +
          '</div>' +
          '<div class="wifi-net-bssid">' + esc(bssid) + '</div>' +
          '<div class="wifi-net-meta">' +
            channelBadge(n.channel) +
            bandPill(n.band, n.frequency) +
            '<span class="wifi-sec-badge wifi-sec-' + (n.security ? n.security.toLowerCase().replace(/[^a-z0-9]/g,'') : 'open') + '">' + esc(securityBadge(n.security)) + '</span>' +
            bandwidthBadge(n.bandwidth) +
            (vendor ? '<span class="wifi-vendor-tag">' + esc(friendlyName(vendor)) + '</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="nrf-rssi-col">' +
          '<div class="nrf-rssi-spark">' + sparkSvg + '</div>' +
          '<div class="ble-rssi" style="color:' + color + '" title="' + rssi + ' dBm">' + bars + ' ' + rssi + '</div>' +
        '</div>';

      groupBody.appendChild(row);
    });

    details.appendChild(groupBody);
    list.appendChild(details);
  });

  // Update radar if active
  if (_radarMode) renderRadarBlips(filtered);

  // Summary log
  const named = networks.filter(n => n.ssid && n.ssid !== '');
  log('📡 ' + networks.length + ' network(s) found' + (named.length ? ' — ' + named.length + ' named' : ''),'success');
}

/* ═══════════════════════════════════
   NETWORK SELECTION & DETAIL PANEL
   ═══════════════════════════════════ */
function selectNetwork(n) {
  if (!n) return;
  ble.selectedNet = n.bssid;
  // Update row highlighting
  document.querySelectorAll('.wifi-network-row').forEach(r => r.classList.remove('wifi-selected'));
  const rows = document.querySelectorAll('.wifi-network-row');
  rows.forEach(r => {
    if (r.querySelector('.wifi-net-bssid') && r.querySelector('.wifi-net-bssid').textContent === n.bssid) {
      r.classList.add('wifi-selected');
    }
  });
  // Update header title
  const titleEl = document.getElementById('connectedDeviceName');
  if (titleEl) titleEl.textContent = n.ssid || n.bssid || 'Unknown Network';
  // Auto-open all cards first, then render and scroll
  document.querySelectorAll('details.collapsible').forEach(d => {
    if (!d.open) d.open = true;
  });

  const detailsPanel = document.getElementById('explorerDetails');
  if (detailsPanel) {
    _renderNetworkDetail(n);
    // Single scroll after layout settles
    setTimeout(() => detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  } else {
    _renderNetworkDetail(n);
  }

  // Push RSSI to chart when selecting
  if (n.rssi != null) {
    pushChartPoint(n.rssi, n.ssid || n.bssid);
  }
  playSound('click');
  log('📋 Selected: ' + (n.ssid || n.bssid),'info');

  // Auto-start RSSI tracking (without triggering new scan)
  _startRssiTrackingQuiet(n.bssid, n.ssid || n.bssid);

  // Auto-run channel analysis
  if (typeof requestChannelAnalysis === 'function') {
    requestChannelAnalysis();
  }
}

function _renderNetworkDetail(n) {
  const el = document.getElementById('networkDetails') || document.getElementById('networkDetail') || document.getElementById('radarDetail');
  if (!el) return;
  el.style.display = '';

  const vendor   = _netVendor(n);
  const band     = _getNetBand(n);
  const isHidden = n.hidden || (!n.ssid || n.ssid === '');
  const ssid     = isHidden ? '(Hidden Network)' : n.ssid;
  const rssi     = n.rssi != null ? n.rssi : '?';
  const color    = n.rssi != null ? rssiColor(n.rssi) : 'var(--text-dim)';
  const bars     = n.rssi != null ? rssiToBars(n.rssi) : '░░░░';
  const hist     = _networkHistory.get(n.bssid);
  const rssiHist = (hist ? hist.rssiHistory : null) || n.rssi_history || (n.rssi != null ? [n.rssi] : []);
  const spark    = _rssiSparkline(rssiHist);

  let html = '<div class="wifi-detail-panel">';

  // Header
  html += '<div class="wifi-detail-header">' +
    '<div class="wifi-detail-ssid">' + securityIcon(n.security) + ' ' + esc(ssid) + '</div>' +
    '<div class="wifi-detail-bssid">' + esc(n.bssid || '') + '</div>' +
    '</div>';

  // Signal
  html += '<div class="wifi-detail-signal">' +
    '<span class="ble-rssi" style="color:' + color + '">' + bars + ' ' + rssi + ' dBm</span>' +
    '<span class="nrf-rssi-spark">' + spark + '</span>' +
    '</div>';

  // RSSI Graph
  if (rssiHist.length > 1) {
    html += '<div class="wifi-detail-graph">' + _rssiGraph(rssiHist) + '</div>';
  }

  // Metadata grid
  html += '<div class="wifi-detail-grid">';
  html += _detailField('Channel', n.channel != null ? n.channel : '?');
  html += _detailField('Frequency', n.frequency ? n.frequency + ' MHz' : '?');
  html += _detailField('Band', band ? band + ' GHz' : '?');
  html += _detailField('Security', n.security || 'Open');
  html += _detailField('Bandwidth', n.bandwidth || '?');
  html += _detailField('Vendor', vendor || 'Unknown');
  html += _detailField('Hidden', n.hidden ? 'Yes' : 'No');
  if (hist) {
    html += _detailField('First Seen', new Date(hist.firstSeen).toLocaleTimeString());
    html += _detailField('Last Seen', new Date(hist.lastSeen).toLocaleTimeString());
    html += _detailField('Scan Count', hist.rssiHistory.length);
  }
  if (n.rssi != null && rssiHist.length > 1) {
    const avg = (rssiHist.reduce((a,b) => a+b, 0) / rssiHist.length).toFixed(1);
    const min = Math.min(...rssiHist);
    const max = Math.max(...rssiHist);
    html += _detailField('RSSI Avg', avg + ' dBm');
    html += _detailField('RSSI Min', min + ' dBm');
    html += _detailField('RSSI Max', max + ' dBm');
  }
  html += '</div>';

  // Action buttons — avoid inline onclick with user-controlled strings (SSIDs may contain quotes)
  html += '<div class="wifi-detail-actions">' +
    '<button class="button btn-sm primary" id="_trackRssiBtn">📊 Track RSSI</button>' +
    '<button class="button btn-sm" onclick="_copyNetworkInfo()">📋 Copy Info</button>' +
    '</div>';

  html += '</div>';
  el.innerHTML = html;

  // Attach Track RSSI handler safely (avoids inline onclick with user-controlled strings)
  const trackBtn = document.getElementById('_trackRssiBtn');
  if (trackBtn) {
    const _bssid = n.bssid || '';
    const _label = n.ssid || n.bssid || '';
    trackBtn.onclick = () => startRssiTracking(_bssid, _label);
  }

  // Render signal history mini-chart on the signalHistoryChart canvas
  _renderSignalHistoryChart(rssiHist);
}

function _renderSignalHistoryChart(rssiHist) {
  const canvas = document.getElementById('signalHistoryChart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  if (!rssiHist || rssiHist.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Need more scans for history', w / 2, h / 2);
    return;
  }

  const pad = { top: 10, right: 10, bottom: 20, left: 35 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const minR = Math.min(...rssiHist);
  const maxR = Math.max(...rssiHist);
  const range = Math.max(maxR - minR, 5);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
    const val = Math.round(maxR - (range / 4) * i);
    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val + '', pad.left - 4, y + 3);
  }

  // Line
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(1, '#0ea5e9');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  rssiHist.forEach((val, i) => {
    const x = pad.left + (i / (rssiHist.length - 1)) * plotW;
    const y = pad.top + (1 - (val - minR) / range) * plotH;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Fill under line
  const lastX = pad.left + plotW;
  const lastY = pad.top + (1 - (rssiHist[rssiHist.length - 1] - minR) / range) * plotH;
  ctx.lineTo(lastX, pad.top + plotH);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = 'rgba(56,189,248,.08)';
  ctx.fill();

  // Dots
  rssiHist.forEach((val, i) => {
    const x = pad.left + (i / (rssiHist.length - 1)) * plotW;
    const y = pad.top + (1 - (val - minR) / range) * plotH;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  });

  // X-axis label
  ctx.fillStyle = '#64748b';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Scan #', w / 2, h - 3);
}

function _detailField(label, value) {
  return '<div class="wifi-detail-field">' +
    '<span class="wifi-detail-label">' + esc(label) + '</span>' +
    '<span class="wifi-detail-value">' + esc(String(value)) + '</span>' +
    '</div>';
}

function _copyNetworkInfo() {
  const n = _lastNetworks.find(n => n.bssid === ble.selectedNet);
  if (!n) return;
  const text = [
    'SSID: ' + (n.ssid || '(hidden)'),
    'BSSID: ' + (n.bssid || '?'),
    'RSSI: ' + (n.rssi || '?') + ' dBm',
    'Channel: ' + (n.channel || '?'),
    'Frequency: ' + (n.frequency || '?') + ' MHz',
    'Band: ' + (_getNetBand(n) || '?') + ' GHz',
    'Security: ' + (n.security || 'Open'),
    'Bandwidth: ' + (n.bandwidth || '?'),
    'Vendor: ' + (_netVendor(n) || 'Unknown'),
    'Hidden: ' + (n.hidden ? 'Yes' : 'No'),
  ].join('\n');
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('Copied network info!', 1500);
      }).catch(() => {});
    } else {
      // Fallback for non-HTTPS
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      if (typeof showToast === 'function') showToast('Copied network info!', 1500);
    }
  } catch(e) {}
}

/* ═══════════════════════════════════
   RADAR VIEW — uses .ble-radar-* classes
   for compatibility with radar-styles.css
   ═══════════════════════════════════ */
let _radarMode = false;
let _radarZoom = 1.0;
const _RADAR_ZOOM_MIN = 0.5;
const _RADAR_ZOOM_MAX = 4.0;
const _RADAR_ZOOM_STEP = 0.25;

function _applyRadarZoom() {
  _applyRadarTransform();
  // Update zoom label
  const label = document.getElementById('radarZoomLabel');
  if (label) label.textContent = Math.round(_radarZoom * 100) + '%';
  // Toggle button states
  const zoomIn = document.getElementById('radarZoomIn');
  const zoomOut = document.getElementById('radarZoomOut');
  if (zoomIn) zoomIn.disabled = _radarZoom >= _RADAR_ZOOM_MAX;
  if (zoomOut) zoomOut.disabled = _radarZoom <= _RADAR_ZOOM_MIN;
}

function radarZoomIn() {
  _radarZoom = Math.min(_RADAR_ZOOM_MAX, _radarZoom + _RADAR_ZOOM_STEP);
  _applyRadarZoom();
}

function radarZoomOut() {
  _radarZoom = Math.max(_RADAR_ZOOM_MIN, _radarZoom - _RADAR_ZOOM_STEP);
  _applyRadarZoom();
}

function radarZoomReset() {
  _radarZoom = 1.0;
  _radarPanX = 0;
  _radarPanY = 0;
  _applyRadarZoom();
}

let _radarPanX = 0, _radarPanY = 0;
let _radarDragging = false, _radarDragStart = null;

function _applyRadarTransform() {
  const circle = document.querySelector('.ble-radar-circle');
  if (!circle) return;
  if (_radarZoom <= 1) { _radarPanX = 0; _radarPanY = 0; }
  circle.style.transform = 'scale(' + _radarZoom + ') translate(' + _radarPanX + 'px,' + _radarPanY + 'px)';
  circle.style.transformOrigin = 'center center';
}

function _initRadarZoom() {
  const container = document.querySelector('.ble-radar-container');
  if (!container) return;

  // Wheel zoom
  container.addEventListener('wheel', (e) => {
    if (!_radarMode) return;
    e.preventDefault();
    if (e.deltaY < 0) radarZoomIn();
    else radarZoomOut();
  }, { passive: false });

  // Drag to pan
  container.addEventListener('mousedown', (e) => {
    if (!_radarMode || _radarZoom <= 1) return;
    _radarDragging = true;
    _radarDragStart = { x: e.clientX - _radarPanX, y: e.clientY - _radarPanY };
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!_radarDragging) return;
    _radarPanX = e.clientX - _radarDragStart.x;
    _radarPanY = e.clientY - _radarDragStart.y;
    // Clamp pan so radar doesn't drift too far
    const maxPan = (_radarZoom - 1) * 120;
    _radarPanX = Math.max(-maxPan, Math.min(maxPan, _radarPanX));
    _radarPanY = Math.max(-maxPan, Math.min(maxPan, _radarPanY));
    _applyRadarTransform();
  });
  window.addEventListener('mouseup', () => { _radarDragging = false; });

  // Touch drag to pan
  container.addEventListener('touchstart', (e) => {
    if (!_radarMode || _radarZoom <= 1 || e.touches.length !== 1) return;
    _radarDragging = true;
    _radarDragStart = { x: e.touches[0].clientX - _radarPanX, y: e.touches[0].clientY - _radarPanY };
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!_radarDragging || e.touches.length !== 1) return;
    _radarPanX = e.touches[0].clientX - _radarDragStart.x;
    _radarPanY = e.touches[0].clientY - _radarDragStart.y;
    const maxPan = (_radarZoom - 1) * 120;
    _radarPanX = Math.max(-maxPan, Math.min(maxPan, _radarPanX));
    _radarPanY = Math.max(-maxPan, Math.min(maxPan, _radarPanY));
    _applyRadarTransform();
  }, { passive: true });
  window.addEventListener('touchend', () => { _radarDragging = false; });
}

function toggleRadarView() {
  _radarMode = !_radarMode;
  const list  = document.getElementById('deviceList');
  const radar = document.getElementById('radarView');
  const btn   = document.getElementById('radarToggleBtn');
  const proxBtn = document.getElementById('proxSoundBtn');
  if (list) list.style.display = _radarMode ? 'none' : '';
  if (radar) radar.style.display = _radarMode ? '' : 'none';
  if (btn) btn.classList.toggle('active', _radarMode);
  if (proxBtn) proxBtn.style.display = _radarMode ? '' : 'none';
  if (!_radarMode) {
    const detail = document.getElementById('radarDetail');
    if (detail) detail.style.display = 'none';
    if (_proxSoundActive) toggleProximitySound();
  }
  if (_radarMode && _lastNetworks.length) renderRadarBlips(_lastNetworks);
  playSound('click');
}

/**
 * Render radar blips — uses .ble-radar-* class names
 * for compatibility with radar-styles.css themes
 */
function renderRadarBlips(networks) {
  const container = document.getElementById('radarBlips');
  if (!container) return;

  // Apply band filter
  let filtered = networks;
  if (ble.bandFilter !== 'all') {
    filtered = networks.filter(n => _getNetBand(n) === ble.bandFilter);
  }

  container.innerHTML = '';

  const bandColors = {
    '2.4': '#eab308',
    '5':   '#3b82f6',
  };

  filtered.forEach((n, idx) => {
    const bssid = n.bssid || String(idx);
    const angle  = _hashAngle(bssid) * (Math.PI / 180);
    const radius = _rssiToRadius(n.rssi);
    const rssi   = n.rssi || -100;

    // Convert polar to % position (center is 50%,50%)
    const x = 50 + radius * 50 * Math.cos(angle);
    const y = 50 + radius * 50 * Math.sin(angle);

    // Dot size by signal strength
    let dotClass = 'ble-radar-dot';
    if (rssi > -50) dotClass += ' dot-strong';
    else if (rssi < -75) dotClass += ' dot-weak';

    // Proximity color based on RSSI
    let proxColor;
    if (rssi > -50) proxColor = '#22c55e';
    else if (rssi >= -70) proxColor = '#eab308';
    else if (rssi >= -85) proxColor = '#f97316';
    else proxColor = '#ef4444';

    // Band color for outline ring
    const band = _getNetBand(n);
    const bandColor = bandColors[band] || 'var(--accent)';

    const ssid = n.ssid && n.ssid !== '' ? n.ssid.substring(0, 14) : '?';
    const isHidden = n.hidden || (!n.ssid || n.ssid === '');

    const blip = document.createElement('div');
    blip.className = 'ble-radar-blip';
    blip.style.left = x + '%';
    blip.style.top = y + '%';
    blip.style.animationDelay = (idx * 0.08) + 's';
    blip.title = (n.ssid || 'hidden') + ' — ' + rssi + ' dBm';
    blip.onpointerdown = (e) => { e.stopPropagation(); e.preventDefault(); showRadarDetail(n); selectNetwork(n); };

    blip.innerHTML =
      '<div class="' + dotClass + '" style="background:' + proxColor + ';color:' + proxColor + ';border:2px solid ' + bandColor + '"></div>' +
      '<div class="ble-radar-blip-name' + (isHidden ? ' wifi-hidden' : '') + '">' + esc(ssid) + '</div>' +
      '<div class="ble-radar-blip-rssi">' + rssi + '</div>';

    container.appendChild(blip);
  });
}

function showRadarDetail(n) {
  const el = document.getElementById('radarDetail');
  if (!el) return;
  const rssi   = n.rssi != null ? n.rssi : '?';
  const vendor = _netVendor(n) || 'Unknown';
  const band   = _getNetBand(n);
  const hist   = _networkHistory.get(n.bssid);
  const rssiHist = (hist ? hist.rssiHistory : null) || n.rssi_history || (n.rssi != null ? [n.rssi] : []);
  const spark  = _rssiSparkline(rssiHist);
  const bars   = n.rssi != null ? rssiToBars(n.rssi) : '░░░░';
  const color  = n.rssi != null ? rssiColor(n.rssi) : 'var(--text-dim)';
  const isHidden = n.hidden || (!n.ssid || n.ssid === '');
  const ssid   = isHidden ? '(Hidden)' : n.ssid;

  el.style.display = '';
  el.onclick = null; // Don't make the whole card clickable — it overlaps blips
  el.innerHTML =
    '<div class="detail-name">' + esc(ssid) + '</div>' +
    '<div class="detail-addr">' + esc(n.bssid || '') + '</div>' +
    '<div class="detail-vendor">' + esc(vendor) + '</div>' +
    '<div class="detail-meta">' +
      channelBadge(n.channel) + ' ' +
      bandPill(n.band, n.frequency) + ' ' +
      securityIcon(n.security) + ' ' + esc(securityBadge(n.security)) +
    '</div>' +
    '<div class="detail-row">' +
      '<span class="ble-rssi" style="color:' + color + '">' + bars + ' ' + rssi + ' dBm</span>' +
      '<span class="nrf-rssi-spark">' + spark + '</span>' +
      '<button class="button btn-sm primary" id="_radarDetailBtn">📋 Details</button>' +
    '</div>';

  // Attach handler safely via closure
  setTimeout(() => {
    const detBtn = document.getElementById('_radarDetailBtn');
    if (detBtn) detBtn.onclick = () => selectNetwork(n);
  }, 0);
}

/* ═══════════════════════════════════
   AUDIO PROXIMITY FEEDBACK
   ═══════════════════════════════════ */
let _proxSoundActive = false;
let _proxSoundTimer = null;
let _proxAudioCtx = null;

function toggleProximitySound() {
  _proxSoundActive = !_proxSoundActive;
  const btn = document.getElementById('proxSoundBtn');
  if (btn) btn.classList.toggle('active', _proxSoundActive);

  if (_proxSoundActive) {
    if (!_proxAudioCtx) _proxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _scheduleProxBeep();
  } else {
    if (_proxSoundTimer) { clearTimeout(_proxSoundTimer); _proxSoundTimer = null; }
  }
}

function _proxBeep() {
  if (!_proxAudioCtx || !_proxSoundActive) return;
  const osc = _proxAudioCtx.createOscillator();
  const gain = _proxAudioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 800;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(_proxAudioCtx.destination);
  osc.start();
  osc.stop(_proxAudioCtx.currentTime + 0.1);
}

function _scheduleProxBeep() {
  if (!_proxSoundActive) return;
  let strongest = -999;
  _lastNetworks.forEach(n => { if (n.rssi != null && n.rssi > strongest) strongest = n.rssi; });

  let interval;
  if (strongest > -40) interval = 200;
  else if (strongest > -60) interval = 400;
  else if (strongest > -80) interval = 800;
  else interval = 1500;

  _proxBeep();
  _proxSoundTimer = setTimeout(_scheduleProxBeep, interval);
}

/* ═══════════════════════════════════
   CHANNEL ANALYSIS
   ═══════════════════════════════════ */
function requestChannelAnalysis() {
  log('📻 Requesting channel analysis...','info');
  wsSend({type:'channel_analysis'});
  _timelineEvent('Channel Analysis', 'requested', 'info');
}

function requestBestChannel() {
  log('📻 Requesting best channel recommendation...','info');
  wsSend({type:'best_channel'});
  _timelineEvent('Best Channel', 'requested', 'info');
}

function _renderChannelAnalysis(msg) {
  const el = document.getElementById('channelAnalysisBody');
  if (!el) return;

  // Backend sends {ghz24: {channels, total_networks, recommendation}, ghz5: {...}}
  const ghz24 = msg.ghz24 || {};
  const ghz5 = msg.ghz5 || {};
  const ch24 = ghz24.channels || {};
  const ch5 = ghz5.channels || {};

  if (!Object.keys(ch24).length && !Object.keys(ch5).length) {
    el.innerHTML = '<div class="wifi-empty">No channel data available. Run a scan first.</div>';
    return;
  }

  let html = '';

  // 2.4 GHz channel map
  if (Object.keys(ch24).length) {
    const rec24 = ghz24.recommendation || {};
    const maxScore24 = Math.max(1, ...Object.values(ch24).map(d => d.score || 0));
    html += '<div class="wifi-channel-section">';
    html += '<div class="wifi-channel-title">📶 2.4 GHz Channel Map</div>';
    html += '<div class="wifi-channel-bars">';
    Object.entries(ch24).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([ch, data]) => {
      const count = data.count || 0;
      const score = data.score || 0;
      const pct = (score / maxScore24) * 100;
      const isNonOverlap = [1, 6, 11].includes(parseInt(ch));
      const isBest = rec24.channel && String(rec24.channel) === ch;
      const barColor = count === 0 ? '#22c55e' : score > maxScore24 * 0.7 ? '#ef4444' : score > maxScore24 * 0.3 ? '#eab308' : '#22c55e';
      html += '<div class="wifi-channel-bar-wrap">' +
        '<div class="wifi-channel-bar' + (isNonOverlap ? ' wifi-ch-nonoverlap' : '') + (isBest ? ' wifi-ch-best' : '') + '" style="height:' + Math.max(6, pct) + '%;background:' + barColor + '">' +
          '<span class="wifi-channel-count">' + count + '</span>' +
        '</div>' +
        '<div class="wifi-channel-label' + (isBest ? ' wifi-ch-best-label' : '') + '">Ch ' + ch + '</div>' +
        '</div>';
    });
    html += '</div>';
    // Recommendation
    if (rec24.channel) {
      html += '<div class="wifi-channel-rec">Best channel: <strong>Ch ' + rec24.channel + '</strong>';
      if (rec24.reason) html += ' — ' + esc(rec24.reason);
      html += '</div>';
    }
    html += '<div class="wifi-channel-total">' + (ghz24.total_networks || 0) + ' networks on 2.4 GHz</div>';
    html += '</div>';
  }

  // 5 GHz channel map
  if (Object.keys(ch5).length) {
    const rec5 = ghz5.recommendation || {};
    const maxScore5 = Math.max(1, ...Object.values(ch5).map(d => d.score || 0));
    html += '<div class="wifi-channel-section">';
    html += '<div class="wifi-channel-title">📡 5 GHz Channel Map</div>';
    html += '<div class="wifi-channel-bars">';
    Object.entries(ch5).sort((a,b) => parseInt(a[0]) - parseInt(b[0])).forEach(([ch, data]) => {
      const count = data.count || 0;
      const score = data.score || 0;
      const pct = (score / maxScore5) * 100;
      const isBest = rec5.channel && String(rec5.channel) === ch;
      const barColor = count === 0 ? '#3b82f6' : score > maxScore5 * 0.7 ? '#ef4444' : score > maxScore5 * 0.3 ? '#eab308' : '#3b82f6';
      html += '<div class="wifi-channel-bar-wrap">' +
        '<div class="wifi-channel-bar' + (isBest ? ' wifi-ch-best' : '') + '" style="height:' + Math.max(6, pct) + '%;background:' + barColor + '">' +
          '<span class="wifi-channel-count">' + count + '</span>' +
        '</div>' +
        '<div class="wifi-channel-label' + (isBest ? ' wifi-ch-best-label' : '') + '">' + ch + '</div>' +
        '</div>';
    });
    html += '</div>';
    if (rec5.channel) {
      html += '<div class="wifi-channel-rec">Best channel: <strong>Ch ' + rec5.channel + '</strong>';
      if (rec5.reason) html += ' — ' + esc(rec5.reason);
      html += '</div>';
    }
    html += '<div class="wifi-channel-total">' + (ghz5.total_networks || 0) + ' networks on 5 GHz</div>';
    html += '</div>';
  }

  el.innerHTML = html;
}

function _showBestChannel(msg) {
  const ch24 = msg.best_2_4 || msg.best_24 || '?';
  const ch5  = msg.best_5 || '?';
  const reason24 = msg.reason_2_4 || msg.reason_24 || '';
  const reason5  = msg.reason_5 || '';

  let modal = document.getElementById('bestChannelModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'bestChannelModal';
    modal.className = 'pkt-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="pkt-modal" style="max-width:400px">' +
    '<div class="pkt-header"><span>Best Channel Recommendation</span>' +
    '<button class="btn-icon-only" onclick="document.getElementById(\'bestChannelModal\').style.display=\'none\'">&#10005;</button></div>' +
    '<div class="pkt-body" style="padding:16px">' +
      '<div class="wifi-best-ch-row">' +
        '<div class="wifi-best-ch-band">2.4 GHz</div>' +
        '<div class="wifi-best-ch-num">Channel ' + esc(String(ch24)) + '</div>' +
        (reason24 ? '<div class="wifi-best-ch-reason">' + esc(reason24) + '</div>' : '') +
      '</div>' +
      '<div class="wifi-best-ch-row">' +
        '<div class="wifi-best-ch-band">5 GHz</div>' +
        '<div class="wifi-best-ch-num">Channel ' + esc(String(ch5)) + '</div>' +
        (reason5 ? '<div class="wifi-best-ch-reason">' + esc(reason5) + '</div>' : '') +
      '</div>' +
    '</div></div>';
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

/* ═══════════════════════════════════
   CHART — RSSI Signal Monitor
   ═══════════════════════════════════ */
let wifiChart = null;
const _chartSeries = {};   // key -> [{ts, n}]
const _seriesColors = ['#00aaff','#ff9900','#22cc88','#ff4455','#aa55ff','#ffcc00','#00ddcc','#ff66aa'];
let _colorIdx = 0;

function initChart() {
  const canvas = document.getElementById('bleChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const cs = getComputedStyle(document.documentElement);
  const textDim = cs.getPropertyValue('--text-dim').trim() || '#7a8aaa';
  wifiChart = new Chart(canvas, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
      plugins: { legend: { labels: { color: textDim }, display: true } },
      scales: {
        x: { ticks: { color: textDim, maxTicksLimit: 10 }, grid: { color: textDim+'33' } },
        y: { ticks: { color: textDim }, grid: { color: textDim+'33' },
             suggestedMin: -100, suggestedMax: -20,
             title: { display: true, text: 'RSSI (dBm)', color: textDim } },
      }
    }
  });
}

function _getOrCreateSeries(key) {
  if (!key) key = '_default';
  if (!_chartSeries[key]) {
    const color = _seriesColors[_colorIdx % _seriesColors.length];
    _colorIdx++;
    _chartSeries[key] = { data: [], color };
    if (wifiChart) {
      wifiChart.data.datasets.push({
        label: key === '_default' ? 'WiFi RSSI' : key,
        data: [],
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2,
        pointRadius: 2,
        tension: .3,
        fill: false,
      });
    }
  }
  return _chartSeries[key];
}

function pushChartPoint(value, key) {
  if (ble.chartPaused) return;
  const n = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(n) || !isFinite(n)) return;
  const win = parseInt((document.getElementById('chartWindow')||{}).value || '60', 10);
  const ts = new Date().toLocaleTimeString();

  const series = _getOrCreateSeries(key);
  series.data.push({ts, n});
  if (series.data.length > win) series.data.shift();

  // Global chartData for stats
  ble.chartData.push({ts, n, key: key || '_default'});
  if (ble.chartData.length > win * Object.keys(_chartSeries).length) ble.chartData.shift();

  // Update stats
  const s = ble.stats;
  s.count++; s.sum += n;
  if (s.min === null || n < s.min) s.min = n;
  if (s.max === null || n > s.max) s.max = n;
  ['statMin','statMax','statAvg','statCount'].forEach(id => {
    const el = document.getElementById(id); if (!el) return;
    el.textContent = id === 'statMin' ? s.min.toFixed(1)
                   : id === 'statMax' ? s.max.toFixed(1)
                   : id === 'statAvg' ? (s.sum/s.count).toFixed(1)
                   : s.count;
  });

  if (!wifiChart) return;
  const showGrid = (document.getElementById('chartGrid')||{}).checked !== false;

  // Build unified time labels from all series
  const allTs = new Set();
  Object.values(_chartSeries).forEach(s => s.data.forEach(p => allTs.add(p.ts)));
  const labels = [...allTs].sort();
  wifiChart.data.labels = labels;

  // Update each dataset
  const keys = Object.keys(_chartSeries);
  keys.forEach((k, i) => {
    const ds = wifiChart.data.datasets[i];
    if (!ds) return;
    const dataMap = {};
    _chartSeries[k].data.forEach(p => dataMap[p.ts] = p.n);
    ds.data = labels.map(t => dataMap[t] ?? null);
  });

  wifiChart.options.scales.x.grid.display = showGrid;
  wifiChart.options.scales.y.grid.display = showGrid;
  wifiChart.options.plugins.legend.display = keys.length > 1;
  wifiChart.update('none');
}

function clearChart() {
  ble.chartData = []; ble.stats = {min:null, max:null, sum:0, count:0};
  Object.keys(_chartSeries).forEach(k => delete _chartSeries[k]);
  _colorIdx = 0;
  ['statMin','statMax','statAvg'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  const c = document.getElementById('statCount'); if (c) c.textContent = '0';
  if (wifiChart) { wifiChart.data.labels = []; wifiChart.data.datasets = []; wifiChart.update(); }
  log('🧹 Chart cleared','info');
}

let _rssiTrackingInterval = null;

function startRssiTracking(bssid, label) {
  // Stop any existing tracking
  if (_rssiTrackingInterval) { clearInterval(_rssiTrackingInterval); _rssiTrackingInterval = null; }

  // Ensure this network is selected
  ble.selectedNet = bssid;

  // Push initial point
  const net = _lastNetworks.find(n => n.bssid === bssid);
  if (net && net.rssi != null) pushChartPoint(net.rssi, label);

  // Start continuous tracking — poll every 2 seconds
  _rssiTrackingInterval = setInterval(() => {
    const n = _lastNetworks.find(x => x.bssid === bssid);
    if (n && n.rssi != null) pushChartPoint(n.rssi, label);
  }, 2000);

  // Also trigger a repeating scan if not already scanning
  if (!ble.scanActive) wifiScan();

  // Open the Monitor section and scroll to chart
  const monitorSection = document.querySelector('.section-monitor')?.closest('details');
  if (monitorSection && !monitorSection.open) monitorSection.open = true;
  setTimeout(() => {
    const chart = document.getElementById('bleChart');
    if (chart) chart.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 200);

  log('📊 Tracking RSSI for ' + label, 'success');
}

function stopRssiTracking() {
  if (_rssiTrackingInterval) { clearInterval(_rssiTrackingInterval); _rssiTrackingInterval = null; }
  log('📊 RSSI tracking stopped', 'info');
}

// Quiet version: starts tracking without auto-scan or scroll (used by selectNetwork)
function _startRssiTrackingQuiet(bssid, label) {
  if (_rssiTrackingInterval) { clearInterval(_rssiTrackingInterval); _rssiTrackingInterval = null; }
  ble.selectedNet = bssid;
  const net = _lastNetworks.find(n => n.bssid === bssid);
  if (net && net.rssi != null) pushChartPoint(net.rssi, label);
  _rssiTrackingInterval = setInterval(() => {
    const n = _lastNetworks.find(x => x.bssid === bssid);
    if (n && n.rssi != null) pushChartPoint(n.rssi, label);
  }, 2000);
  log('📊 Tracking RSSI for ' + label, 'success');
}

function exportChartData() {
  if (!ble.chartData.length) { log('No chart data','error'); return; }
  const csv = 'timestamp,value,network\n' + ble.chartData.map(p => p.ts + ',' + p.n + ',' + (p.key||'')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
  a.download = 'wifi_chart_' + Date.now() + '.csv'; a.click();
  log('💾 Chart exported','success');
}

/* ═══════════════════════════════════
   EXPORT LOGS FROM BACKEND
   ═══════════════════════════════════ */
async function exportLogsFromBackend() {
  const base = ((document.getElementById('backendURL')||{}).value || 'ws://localhost:8001/ws')
               .replace('ws://','http://').replace('wss://','https://').replace('/ws','');
  const fmt = (document.getElementById('logFormatSel')||{}).value || 'both';
  showToast('Downloading logs...', 3000);
  const targets = [];
  if (fmt === 'csv' || fmt === 'both')  targets.push({url: base+'/api/logs/csv',  name:'wifi_log.csv'  });
  if (fmt === 'json' || fmt === 'both') targets.push({url: base+'/api/logs/json', name:'wifi_log.jsonl'});
  for (const {url, name} of targets) {
    try {
      const res = await fetch(url); const text = await res.text();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
      a.download = name; a.click();
      log('✅ Downloaded '+name,'success');
    } catch(e) { log('Error downloading '+name+': '+e.message,'error'); }
  }
  hideToast();
}

/* ═══════════════════════════════════
   EXPORT NETWORKS TO CSV
   ═══════════════════════════════════ */
function exportNetworksCSV() {
  if (!_lastNetworks.length) { log('No networks to export.','error'); return; }
  const rows = [['SSID','BSSID','RSSI','Channel','Frequency','Band','Security','Bandwidth','Vendor','Hidden','FirstSeen','LastSeen']];
  _lastNetworks.forEach(n => {
    const bssid = n.bssid || '';
    const hist = _networkHistory.get(bssid);
    rows.push([
      n.ssid || '(hidden)',
      bssid,
      n.rssi != null ? n.rssi : '',
      n.channel || '',
      n.frequency || '',
      _getNetBand(n) || '',
      n.security || 'Open',
      n.bandwidth || '',
      _netVendor(n) || 'Unknown',
      n.hidden ? 'Yes' : 'No',
      hist ? new Date(hist.firstSeen).toISOString() : '',
      hist ? new Date(hist.lastSeen).toISOString() : '',
    ]);
  });
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wifi_networks_' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  log('Exported ' + _lastNetworks.length + ' networks to CSV.', 'success');
}

/* ═══════════════════════════════════
   EXPORT DEBUG SNAPSHOT
   ═══════════════════════════════════ */
function exportDebugSnapshot() {
  const snapshot = {
    timestamp: new Date().toISOString(),
    wsConnected: ble.wsConnected,
    backendURL: (document.getElementById('backendURL')||{}).value,
    bandFilter: ble.bandFilter,
    selectedNet: ble.selectedNet,
    chartPoints: ble.chartData.length,
    stats: { ...ble.stats, avg: ble.stats.count ? (ble.stats.sum/ble.stats.count).toFixed(2) : null },
    networkCount: _lastNetworks.length,
    historySize: _networkHistory.size,
    favorites: [..._favorites],
    timeline: _debug.timeline.map(e => ({ ts: e.ts.toISOString(), event: e.event, detail: e.detail, type: e.type })),
    networks: _lastNetworks.map(n => ({
      ssid: n.ssid, bssid: n.bssid, rssi: n.rssi,
      channel: n.channel, frequency: n.frequency, band: _getNetBand(n),
      security: n.security, bandwidth: n.bandwidth,
      vendor: _netVendor(n), hidden: n.hidden,
    })),
    channelData: ble.channelData,
    bestChannel: ble.bestChannel,
    chartSeries: Object.keys(_chartSeries),
    errors: _debug.timeline.filter(e => e.type === 'error').slice(-20),
  };
  const json = JSON.stringify(snapshot, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], {type:'application/json'}));
  a.download = 'wifi_debug_' + Date.now() + '.json';
  a.click();
  log('📸 Debug snapshot exported (' + (json.length/1024).toFixed(1) + ' KB)', 'success');
}

/* ═══════════════════════════════════
   CLEAR CACHE & RELOAD
   ═══════════════════════════════════ */
function clearCacheReload() {
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
  if (navigator.serviceWorker) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  location.reload(true);
}

/* ═══════════════════════════════════
   AUTO-RECONNECT / FILTER SYNC
   ═══════════════════════════════════ */
function syncFilterEvents() {
  // SSID filter: re-render on input
  const nameFilter = document.getElementById('deviceNameFilter');
  if (nameFilter) {
    nameFilter.addEventListener('input', () => {
      renderNetworkList();
    });
  }
  // RSSI filter: re-render on change
  const rssiFilter = document.getElementById('rssiFilter');
  if (rssiFilter) {
    rssiFilter.addEventListener('input', () => {
      renderNetworkList();
    });
  }
}

/* ═══════════════════════════════════
   NETWORK SIGNAL QUALITY ASSESSMENT
   ═══════════════════════════════════ */
function signalQuality(rssi) {
  if (rssi >= -50) return { label: 'Excellent', cls: 'wifi-quality-excellent', pct: 100 };
  if (rssi >= -60) return { label: 'Good',      cls: 'wifi-quality-good',      pct: 80 };
  if (rssi >= -70) return { label: 'Fair',       cls: 'wifi-quality-fair',      pct: 60 };
  if (rssi >= -80) return { label: 'Weak',       cls: 'wifi-quality-weak',      pct: 40 };
  if (rssi >= -90) return { label: 'Very Weak',  cls: 'wifi-quality-veryweak',  pct: 20 };
  return { label: 'No Signal', cls: 'wifi-quality-none', pct: 5 };
}

/** Estimated link speed from RSSI (very rough approximation) */
function estimatedSpeed(rssi, bandwidth) {
  let maxMbps = 54; // default 802.11g
  if (bandwidth) {
    const bw = String(bandwidth);
    if (bw.includes('160')) maxMbps = 1200;
    else if (bw.includes('80'))  maxMbps = 866;
    else if (bw.includes('40'))  maxMbps = 400;
    else if (bw.includes('20'))  maxMbps = 144;
  }
  const quality = signalQuality(rssi);
  return Math.round(maxMbps * quality.pct / 100);
}

/* ═══════════════════════════════════
   CHANNEL FREQUENCY MAPPING
   ═══════════════════════════════════ */
const CHANNEL_FREQ_MAP = {
  // 2.4 GHz
  1: 2412, 2: 2417, 3: 2422, 4: 2427, 5: 2432, 6: 2437, 7: 2442,
  8: 2447, 9: 2452, 10: 2457, 11: 2462, 12: 2467, 13: 2472, 14: 2484,
  // 5 GHz
  36: 5180, 40: 5200, 44: 5220, 48: 5240,
  52: 5260, 56: 5280, 60: 5300, 64: 5320,
  100: 5500, 104: 5520, 108: 5540, 112: 5560,
  116: 5580, 120: 5600, 124: 5620, 128: 5640,
  132: 5660, 136: 5680, 140: 5700, 144: 5720,
  149: 5745, 153: 5765, 157: 5785, 161: 5805, 165: 5825,
};

function channelToFreq(channel) {
  return CHANNEL_FREQ_MAP[channel] || null;
}

function freqToChannel(freq) {
  for (const [ch, f] of Object.entries(CHANNEL_FREQ_MAP)) {
    if (f === freq) return parseInt(ch);
  }
  return null;
}

/* ═══════════════════════════════════
   SECURITY ANALYSIS
   ═══════════════════════════════════ */
function securityLevel(security) {
  if (!security || security === 'OPEN' || security === 'NONE') return 0;
  const s = String(security).toUpperCase();
  if (s.includes('WEP')) return 1;
  if (s.includes('WPA3')) return 4;
  if (s.includes('WPA2')) return 3;
  if (s.includes('WPA')) return 2;
  return 1;
}

function securityAdvice(security) {
  const level = securityLevel(security);
  switch(level) {
    case 0: return 'This network has no encryption. Anyone can intercept traffic. Avoid for sensitive data.';
    case 1: return 'WEP encryption is outdated and easily cracked. Upgrade to WPA2 or WPA3.';
    case 2: return 'WPA is better than WEP but has known vulnerabilities. Consider upgrading to WPA2/WPA3.';
    case 3: return 'WPA2 provides strong encryption. Good for most use cases.';
    case 4: return 'WPA3 is the latest and most secure WiFi encryption standard.';
    default: return '';
  }
}

/* ═══════════════════════════════════
   NETWORK COMPARISON
   ═══════════════════════════════════ */
function compareNetworks(bssidA, bssidB) {
  const a = _lastNetworks.find(n => n.bssid === bssidA);
  const b = _lastNetworks.find(n => n.bssid === bssidB);
  if (!a || !b) return null;
  return {
    ssid:      { a: a.ssid, b: b.ssid },
    rssi:      { a: a.rssi, b: b.rssi, diff: (a.rssi||0) - (b.rssi||0) },
    channel:   { a: a.channel, b: b.channel },
    security:  { a: a.security, b: b.security, levelA: securityLevel(a.security), levelB: securityLevel(b.security) },
    band:      { a: _getNetBand(a), b: _getNetBand(b) },
    bandwidth: { a: a.bandwidth, b: b.bandwidth },
    vendor:    { a: _netVendor(a), b: _netVendor(b) },
    recommendation: (a.rssi||0) > (b.rssi||0)
      ? 'Network A (' + (a.ssid||a.bssid) + ') has stronger signal'
      : 'Network B (' + (b.ssid||b.bssid) + ') has stronger signal',
  };
}

/* ═══════════════════════════════════
   NETWORK STATISTICS SUMMARY
   ═══════════════════════════════════ */
function getNetworkSummary() {
  const nets = _lastNetworks;
  if (!nets.length) return null;

  const bands = { '2.4': 0, '5': 0, unknown: 0 };
  const security = { open: 0, wep: 0, wpa: 0, wpa2: 0, wpa3: 0, unknown: 0 };
  const channels = {};
  let rssiSum = 0, rssiCount = 0;
  let strongest = null, weakest = null;

  nets.forEach(n => {
    // Band
    const band = _getNetBand(n);
    if (band === '2.4') bands['2.4']++;
    else if (band === '5') bands['5']++;
    else bands.unknown++;

    // Security
    const sec = (n.security || '').toUpperCase();
    if (!sec || sec === 'OPEN' || sec === 'NONE') security.open++;
    else if (sec.includes('WPA3')) security.wpa3++;
    else if (sec.includes('WPA2')) security.wpa2++;
    else if (sec.includes('WPA')) security.wpa++;
    else if (sec.includes('WEP')) security.wep++;
    else security.unknown++;

    // Channels
    if (n.channel != null) {
      channels[n.channel] = (channels[n.channel] || 0) + 1;
    }

    // RSSI
    if (n.rssi != null) {
      rssiSum += n.rssi;
      rssiCount++;
      if (!strongest || n.rssi > strongest.rssi) strongest = n;
      if (!weakest || n.rssi < weakest.rssi) weakest = n;
    }
  });

  // Find most congested channel
  let congestedCh = null, congestedCount = 0;
  Object.entries(channels).forEach(([ch, count]) => {
    if (count > congestedCount) { congestedCh = ch; congestedCount = count; }
  });

  return {
    total: nets.length,
    bands,
    security,
    channels,
    avgRssi: rssiCount ? (rssiSum / rssiCount).toFixed(1) : null,
    strongest: strongest ? { ssid: strongest.ssid, bssid: strongest.bssid, rssi: strongest.rssi } : null,
    weakest: weakest ? { ssid: weakest.ssid, bssid: weakest.bssid, rssi: weakest.rssi } : null,
    congestedChannel: congestedCh ? { channel: parseInt(congestedCh), count: congestedCount } : null,
    hiddenCount: nets.filter(n => n.hidden || !n.ssid).length,
    vendorDistribution: (() => {
      const v = {};
      nets.forEach(n => {
        const vendor = _netVendor(n) || 'Unknown';
        v[vendor] = (v[vendor] || 0) + 1;
      });
      return v;
    })(),
  };
}

function renderNetworkSummary() {
  const el = document.getElementById('networkSummary');
  if (!el) return;
  const summary = getNetworkSummary();
  if (!summary) {
    el.innerHTML = '<div class="wifi-empty">No data. Run a scan first.</div>';
    return;
  }

  let html = '<div class="wifi-summary-grid">';
  html += '<div class="wifi-summary-stat"><span class="wifi-summary-num">' + summary.total + '</span><span class="wifi-summary-label">Total Networks</span></div>';
  html += '<div class="wifi-summary-stat"><span class="wifi-summary-num">' + summary.bands['2.4'] + '</span><span class="wifi-summary-label">2.4 GHz</span></div>';
  html += '<div class="wifi-summary-stat"><span class="wifi-summary-num">' + summary.bands['5'] + '</span><span class="wifi-summary-label">5 GHz</span></div>';
  if (summary.avgRssi) {
    html += '<div class="wifi-summary-stat"><span class="wifi-summary-num">' + summary.avgRssi + '</span><span class="wifi-summary-label">Avg RSSI (dBm)</span></div>';
  }
  html += '<div class="wifi-summary-stat"><span class="wifi-summary-num">' + summary.hiddenCount + '</span><span class="wifi-summary-label">Hidden</span></div>';
  html += '<div class="wifi-summary-stat"><span class="wifi-summary-num">' + summary.security.open + '</span><span class="wifi-summary-label">Open (Insecure)</span></div>';
  html += '</div>';

  if (summary.strongest) {
    html += '<div class="wifi-summary-detail">Strongest: <b>' + esc(summary.strongest.ssid || summary.strongest.bssid) + '</b> (' + summary.strongest.rssi + ' dBm)</div>';
  }
  if (summary.congestedChannel) {
    html += '<div class="wifi-summary-detail">Most congested: <b>Channel ' + summary.congestedChannel.channel + '</b> (' + summary.congestedChannel.count + ' networks)</div>';
  }

  // Vendor distribution
  if (summary.vendorDistribution && Object.keys(summary.vendorDistribution).length) {
    html += '<div class="wifi-summary-vendors">';
    Object.entries(summary.vendorDistribution)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([vendor, count]) => {
        html += '<span class="wifi-vendor-pill">' + esc(vendor) + ' <b>' + count + '</b></span>';
      });
    html += '</div>';
  }

  // Security breakdown
  html += '<div class="wifi-summary-security">';
  const secEntries = Object.entries(summary.security).filter(([k,v]) => v > 0);
  secEntries.forEach(([type, count]) => {
    const secColor = type === 'open' ? '#ef4444' : type === 'wep' ? '#f97316' : type === 'wpa' ? '#eab308' : type === 'wpa2' ? '#22cc88' : type === 'wpa3' ? '#3b82f6' : '#6b7280';
    html += '<span class="wifi-sec-pill" style="border-color:' + secColor + ';color:' + secColor + '">' + type.toUpperCase() + ': ' + count + '</span>';
  });
  html += '</div>';

  el.innerHTML = html;
}

/* ═══════════════════════════════════
   DEBUG UI INIT
   ═══════════════════════════════════ */
function _initDebugUI() {
  // Add Log Search bar to log panel header
  const logFilters = document.getElementById('logFilters');
  if (logFilters) {
    const searchWrap = document.createElement('div');
    searchWrap.className = 'log-search-wrap';
    searchWrap.innerHTML = '<input id="logSearch" type="text" class="ble-input" placeholder="Search logs..." style="font-size:.72rem;padding:3px 8px;max-width:180px" />';
    logFilters.appendChild(searchWrap);
    const searchInput = document.getElementById('logSearch');
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const entries = document.querySelectorAll('#logContainer .log-line');
      entries.forEach(e => {
        e.style.display = !q || e.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // Add Channel Analysis & Debug Tools sections
  const rowsContainer = document.querySelector('.rows-container');
  if (rowsContainer) {
    // ── Network Summary ──
    const summarySection = document.createElement('details');
    summarySection.className = 'collapsible';
    summarySection.innerHTML =
      '<summary><span class="icon">📊</span> Network Summary</summary>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">WiFi Environment Overview</div><div class="card-subtitle">Statistics about all detected networks</div></div>' +
          '<button class="button btn-sm primary" onclick="renderNetworkSummary()">Refresh</button>' +
        '</div>' +
        '<div id="networkSummary" class="wifi-summary"><div class="wifi-empty">Run a scan to see summary.</div></div>' +
      '</div>';
    rowsContainer.appendChild(summarySection);

    // ── Channel Analysis ──
    const channelSection = document.createElement('details');
    channelSection.className = 'collapsible';
    channelSection.innerHTML =
      '<summary><span class="icon">📻</span> Channel Analysis</summary>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">Channel Utilization</div><div class="card-subtitle">See which channels are crowded</div></div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
            '<button class="button btn-sm primary" onclick="requestChannelAnalysis()">Analyze</button>' +
            '<button class="button btn-sm" onclick="requestBestChannel()">Best Channel</button>' +
          '</div>' +
        '</div>' +
        '<div id="channelAnalysisBody" class="wifi-channel-body"><div class="wifi-empty">Click Analyze to scan channels.</div></div>' +
      '</div>';
    rowsContainer.appendChild(channelSection);

    // ── Network Detail Panel ──
    const detailSection = document.createElement('details');
    detailSection.className = 'collapsible';
    detailSection.open = false;
    detailSection.innerHTML =
      '<summary><span class="icon">📋</span> Network Details</summary>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">Selected Network</div><div class="card-subtitle">Click a network in the list to view details</div></div>' +
        '</div>' +
        '<div id="networkDetail" class="wifi-detail-container"><div class="wifi-empty">Select a network from the scan list.</div></div>' +
      '</div>';
    rowsContainer.appendChild(detailSection);

    // ── Debug Tools (Timeline) ──
    const debugSection = document.createElement('details');
    debugSection.className = 'collapsible';
    debugSection.innerHTML =
      '<summary><span class="icon">🔬</span> Debug Tools</summary>' +
      '<div class="card">' +
        '<div class="card-header">' +
          '<div><div class="card-title">Event Timeline</div><div class="card-subtitle">Visual event history with timestamps</div></div>' +
          '<div style="display:flex;gap:8px">' +
            '<button class="button btn-sm" onclick="_debug.timeline=[];_renderTimeline()">🧹 Clear</button>' +
            '<button class="button btn-sm" onclick="exportDebugSnapshot()">📸 Snapshot</button>' +
          '</div>' +
        '</div>' +
        '<div id="timelineBody" class="tl-body"></div>' +
      '</div>';
    rowsContainer.appendChild(debugSection);
  }
}

/* ═══════════════════════════════════
   INIT (after template init())
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Re-apply language to pick up WiFi i18n keys on dynamic elements
  const saved = (() => { try { return localStorage.getItem('wdiy-lang') || 'en'; } catch { return 'en'; } })();
  if (typeof setLanguage === 'function') setLanguage(saved);

  initChart();
  wsConnect();
  syncFilterEvents();
  _initDebugUI();

  // Pause chart on checkbox
  const pc = document.getElementById('chartPause');
  if (pc) pc.addEventListener('change', e => { ble.chartPaused = e.target.checked; });

  // Band filter buttons — inject if not present
  _injectBandFilterButtons();

  // Simulate button hook
  const simBtn = document.getElementById('simulateBtn');
  if (simBtn) simBtn.addEventListener('click', simulateNetworks);

  // Init radar zoom (wheel listener)
  _initRadarZoom();

  // Activate radar view on startup
  setTimeout(() => { if (!_radarMode) toggleRadarView(); }, 300);
  // Auto-start scan once WebSocket is connected (give it time)
  setTimeout(() => { wifiScan(); }, 1200);

  log('📡 WiFi Dashboard v1.0 ready','success');
  _timelineEvent('Dashboard Ready', 'v1.0', 'success');
});

/* ═══════════════════════════════════
   BAND FILTER BUTTONS INJECTION
   ═══════════════════════════════════ */
function _injectBandFilterButtons() {
  // Look for a container where we can add band filter buttons
  const filterArea = document.getElementById('scanFilters') || document.getElementById('deviceNameFilter')?.parentElement;
  if (!filterArea) return;

  // Check if already injected
  if (document.querySelector('.wifi-band-filter-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'wifi-band-filter-bar';
  bar.style.cssText = 'display:flex;gap:4px;align-items:center;margin:4px 0';

  const bands = [
    { label: 'All', value: 'all' },
    { label: '2.4G', value: '2.4' },
    { label: '5G', value: '5' },
  ];

  bands.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'wifi-band-btn button btn-sm' + (b.value === ble.bandFilter ? ' active' : '');
    btn.textContent = b.label;
    btn.dataset.band = b.value;
    btn.onclick = () => setBandFilter(b.value);
    bar.appendChild(btn);
  });

  // Simulate button
  const simBtn = document.createElement('button');
  simBtn.className = 'button btn-sm';
  simBtn.textContent = '🎲 Simulate';
  simBtn.title = 'Generate simulated WiFi scan data';
  simBtn.onclick = simulateNetworks;
  bar.appendChild(simBtn);

  // Export button
  const expBtn = document.createElement('button');
  expBtn.className = 'button btn-sm';
  expBtn.textContent = '📥 Export CSV';
  expBtn.title = 'Export networks to CSV';
  expBtn.onclick = exportNetworksCSV;
  bar.appendChild(expBtn);

  filterArea.parentElement.insertBefore(bar, filterArea.nextSibling);
}

/* ═══════════════════════════════════
   BACKWARD COMPATIBILITY STUBS
   Functions referenced by template
   ═══════════════════════════════════ */
// Aliases so HTML onclick="bleScan()" etc. still work
function bleScan() { wifiScan(); }
function bleStopScan() { wifiStopScan(); }
function bleConnectDevice() { log('WiFi scanning is passive — no connect needed.','info'); }
function bleDisconnect() { log('WiFi scanning is passive — no disconnect needed.','info'); }
function bleDiscoverServices() { log('WiFi scanning is passive — no service discovery.','info'); }
function populateServices() {}
function populateChars() {}
function bleLoadCharacteristics() {}
function updateCharButtons() {}
function onConnected() {}
function onDisconnected() {}
function showReadResult() {}
function renderDeviceList(devices) { renderNetworkList(devices); }
function addMultiDevice() {}
function removeMultiDevice() {}
function renderMultiDevices() {}
function syncAutoReconnect() { syncFilterEvents(); }
function exportDevicesCSV() { exportNetworksCSV(); }
function simulateDevices() { simulateNetworks(); }
function startWatchMode() { log('Watch mode not applicable to WiFi scanning.','info'); }
function stopWatchMode() {}
function copyUUID() {}

function clearDebugLog() {
  const el = document.getElementById('debugLogBody');
  if (el) el.innerHTML = '<div class="wifi-empty">Log cleared.</div>';
  log('🧹 Debug log cleared','info');
}

function exportDebugLog() {
  const el = document.getElementById('debugLogBody');
  const text = el ? el.innerText : '';
  if (!text.trim()) { log('No debug log to export','error'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'}));
  a.download = 'wifi_debug_' + Date.now() + '.txt'; a.click();
  log('💾 Debug log exported','success');
}

/* ═══════════════════════════════════
   UTILS — expose globals for HTML
   ═══════════════════════════════════ */
window.wifiScan = wifiScan;
window.wifiStopScan = wifiStopScan;
window.simulateNetworks = simulateNetworks;
window.setBandFilter = setBandFilter;
window.selectNetwork = selectNetwork;
window.toggleRadarView = toggleRadarView;
window.radarZoomIn = radarZoomIn;
window.radarZoomOut = radarZoomOut;
window.radarZoomReset = radarZoomReset;
window.toggleProximitySound = toggleProximitySound;
window.toggleFavorite = toggleFavorite;
window.clearChart = clearChart;
window.exportChartData = exportChartData;
window.startRssiTracking = startRssiTracking;
window.stopRssiTracking = stopRssiTracking;
window.exportLogsFromBackend = exportLogsFromBackend;
window.exportNetworksCSV = exportNetworksCSV;
window.exportDebugSnapshot = exportDebugSnapshot;
window.requestChannelAnalysis = requestChannelAnalysis;
window.requestBestChannel = requestBestChannel;
window.renderNetworkSummary = renderNetworkSummary;
window.clearCacheReload = clearCacheReload;
window.clearDebugLog = clearDebugLog;
window.exportDebugLog = exportDebugLog;
window.simulateDevices = simulateDevices;
window.exportDevicesCSV = exportDevicesCSV;
window.showRadarDetail = showRadarDetail;
window._copyNetworkInfo = _copyNetworkInfo;
window.bleScan = bleScan;
window.bleStopScan = bleStopScan;
window.renderDeviceList = renderDeviceList;
window.wsConnect = wsConnect;
window.renderRadarBlips = renderRadarBlips;
