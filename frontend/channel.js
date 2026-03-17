/**
 * channel.js — WiFi Channel Analyzer visualization
 * Renders 2.4GHz overlap map, 5GHz channel bars, congestion heatmap,
 * and best channel recommendation.
 */

/* ═══════════════════════════════════
   STATE
   ═══════════════════════════════════ */
let _channelData = null; // last channel_analysis response
let _activeChannelBand = '2.4GHz';

/* requestChannelAnalysis is defined in wifi.js (with logging + timeline) */

/* ═══════════════════════════════════
   HANDLE RESPONSE
   ═══════════════════════════════════ */
function handleChannelAnalysis(msg) {
  _channelData = msg;
  renderChannel24(msg.ghz24);
  renderChannel5(msg.ghz5);
  renderBestChannel24(msg.ghz24 ? msg.ghz24.recommendation : null);
  renderBestChannel5(msg.ghz5 ? msg.ghz5.recommendation : null);
}

/* ═══════════════════════════════════
   2.4 GHz CHANNEL MAP
   ═══════════════════════════════════ */
function renderChannel24(data) {
  const canvas = document.getElementById('channel24Canvas');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return; // Collapsed — will redraw when opened
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const channels = data.channels || {};
  const maxScore = Math.max(...Object.values(channels).map(c => c.score || 0), 0.5);

  // Draw channel bars with overlap visualization
  const barWidth = (w - 30) / 13;
  const colors = {
    low: '#22c55e',
    mid: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };

  for (let ch = 1; ch <= 13; ch++) {
    const info = channels[String(ch)] || { count: 0, score: 0 };
    const x = 15 + (ch - 1) * barWidth;
    const score = info.score || 0;
    const pct = score / maxScore;
    const barH = Math.max(2, pct * (h - 30));

    // Bar color by congestion level
    let color = colors.low;
    if (pct > 0.7) color = colors.critical;
    else if (pct > 0.4) color = colors.high;
    else if (pct > 0.15) color = colors.mid;

    // Bar
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + 2, h - 15 - barH, barWidth - 4, barH);
    ctx.globalAlpha = 1;

    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, h - 15 - barH, barWidth - 4, barH);

    // Channel label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(ch), x + barWidth / 2, h - 3);

    // Network count on top
    if (info.count > 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(String(info.count), x + barWidth / 2, h - 18 - barH);
    }
  }

  // Highlight non-overlapping channels (1, 6, 11)
  [1, 6, 11].forEach(ch => {
    const x = 15 + (ch - 1) * barWidth;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x, 0, barWidth, h - 15);
    ctx.setLineDash([]);
  });
}

/* ═══════════════════════════════════
   5 GHz CHANNEL MAP
   ═══════════════════════════════════ */
function renderChannel5(data) {
  const canvas = document.getElementById('channel5Canvas');
  if (!canvas || !data) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = 2;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return; // Collapsed — will redraw when opened
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const channels = data.channels || {};
  const chList = Object.keys(channels).map(Number).sort((a, b) => a - b);
  if (!chList.length) {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No 5 GHz data — scan to populate', w / 2, h / 2);
    return;
  }

  const maxScore = Math.max(...chList.map(c => (channels[String(c)] || {}).score || 0), 0.5);
  const barWidth = Math.min(24, (w - 20) / chList.length);
  const gap = (w - 20 - barWidth * chList.length) / Math.max(1, chList.length - 1);

  // Group separators
  const groups = [
    { label: 'UNII-1', start: 36, end: 48 },
    { label: 'UNII-2', start: 52, end: 64 },
    { label: 'UNII-2e', start: 100, end: 144 },
    { label: 'UNII-3', start: 149, end: 165 },
  ];

  chList.forEach((ch, i) => {
    const info = channels[String(ch)] || { count: 0, score: 0 };
    const x = 10 + i * (barWidth + gap);
    const pct = (info.score || 0) / maxScore;
    const barH = Math.max(2, pct * (h - 30));

    let color = '#22c55e';
    if (pct > 0.7) color = '#ef4444';
    else if (pct > 0.4) color = '#f97316';
    else if (pct > 0.15) color = '#eab308';

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x, h - 15 - barH, barWidth, barH);
    ctx.globalAlpha = 1;

    // Channel label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(ch), x + barWidth / 2, h - 3);

    if (info.count > 0) {
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(String(info.count), x + barWidth / 2, h - 18 - barH);
    }
  });
}

/* ═══════════════════════════════════
   BEST CHANNEL RECOMMENDATION
   ═══════════════════════════════════ */
function renderBestChannel24(rec) {
  const el = document.getElementById('bestChannel24');
  if (!el) return;
  if (!rec) {
    el.innerHTML = '<div style="opacity:.5;font-size:.7rem">Scan networks first, then analyze</div>';
    return;
  }
  el.innerHTML =
    '<div class="channel-rec">' +
      '<span class="channel-rec-icon">📡</span>' +
      '<div>' +
        '<div class="channel-rec-label">Best 2.4 GHz Channel</div>' +
        '<div class="channel-rec-ch">Ch ' + rec.channel + '</div>' +
      '</div>' +
      '<div class="channel-rec-reason">' + _esc(rec.reason) + '</div>' +
    '</div>';
}

function renderBestChannel5(rec) {
  const el = document.getElementById('bestChannel5');
  if (!el) return;
  if (!rec) {
    el.innerHTML = '<div style="opacity:.5;font-size:.7rem">Scan 5GHz networks first</div>';
    return;
  }
  el.innerHTML =
    '<div class="channel-rec">' +
      '<span class="channel-rec-icon">📡</span>' +
      '<div>' +
        '<div class="channel-rec-label">Best 5 GHz Channel</div>' +
        '<div class="channel-rec-ch">Ch ' + rec.channel + '</div>' +
      '</div>' +
      '<div class="channel-rec-reason">' + _esc(rec.reason) + '</div>' +
    '</div>';
}

/* ═══════════════════════════════════
   CONGESTION OVERVIEW (inline in Command Center)
   ═══════════════════════════════════ */
function renderCongestionOverview(networks) {
  const el = document.getElementById('congestionOverview');
  if (!el) return;
  if (networks && networks.length) el.style.display = '';

  // Quick local analysis for real-time display
  const chCounts = {};
  for (let c = 1; c <= 14; c++) chCounts[c] = { count: 0, maxRssi: -100 };

  (networks || []).forEach(n => {
    if (n.channel >= 1 && n.channel <= 14) {
      chCounts[n.channel].count++;
      chCounts[n.channel].maxRssi = Math.max(chCounts[n.channel].maxRssi, n.rssi || -100);
    }
  });

  // 5 GHz channel counts
  const ch5Counts = {};
  (networks || []).forEach(n => {
    const ch = n.channel;
    if (ch > 14) {
      if (!ch5Counts[ch]) ch5Counts[ch] = { count: 0, maxRssi: -100 };
      ch5Counts[ch].count++;
      ch5Counts[ch].maxRssi = Math.max(ch5Counts[ch].maxRssi, n.rssi || -100);
    }
  });

  const maxCount = Math.max(...Object.values(chCounts).map(c => c.count), 1);
  let html = '<div style="font-size:.6rem;color:#94a3b8;font-weight:700;margin-bottom:4px">2.4 GHz</div>';
  for (let ch = 1; ch <= 14; ch++) {
    const info = chCounts[ch];
    const pct = (info.count / maxCount) * 100;
    let color = '#22c55e';
    if (info.count > 4) color = '#ef4444';
    else if (info.count > 2) color = '#f97316';
    else if (info.count > 0) color = '#eab308';

    html += '<div class="congestion-row">' +
      '<span class="congestion-ch">' + ch + '</span>' +
      '<div class="congestion-bar-wrap"><div class="congestion-bar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<span class="congestion-count">' + info.count + '</span>' +
    '</div>';
  }

  // 5 GHz section
  const ch5List = Object.keys(ch5Counts).map(Number).sort((a, b) => a - b);
  if (ch5List.length) {
    const max5 = Math.max(...ch5List.map(c => ch5Counts[c].count), 1);
    html += '<div style="font-size:.6rem;color:#94a3b8;font-weight:700;margin:8px 0 4px">5 GHz</div>';
    ch5List.forEach(ch => {
      const info = ch5Counts[ch];
      const pct = (info.count / max5) * 100;
      let color = '#22c55e';
      if (info.count > 4) color = '#ef4444';
      else if (info.count > 2) color = '#f97316';
      else if (info.count > 0) color = '#eab308';
      html += '<div class="congestion-row">' +
        '<span class="congestion-ch">' + ch + '</span>' +
        '<div class="congestion-bar-wrap"><div class="congestion-bar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<span class="congestion-count">' + info.count + '</span>' +
      '</div>';
    });
  }

  el.innerHTML = html;
}

/* ═══════════════════════════════════
   HELPERS
   ═══════════════════════════════════ */
function _esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

/* ═══════════════════════════════════
   INIT
   ═══════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Analyze button
  const btn = document.getElementById('channelAnalyzeBtn');
  if (btn) btn.onclick = requestChannelAnalysis;

  // Resize handlers
  window.addEventListener('resize', () => {
    if (_channelData) {
      renderChannel24(_channelData.ghz24);
      renderChannel5(_channelData.ghz5);
    }
  });

  // Redraw canvases when Channel Analyzer section opens (0x0 when collapsed)
  document.addEventListener('toggle', (e) => {
    if (e.target.classList && e.target.classList.contains('section-channel') && e.target.open && _channelData) {
      setTimeout(() => {
        renderChannel24(_channelData.ghz24);
        renderChannel5(_channelData.ghz5);
      }, 50);
    }
  }, true);
});
