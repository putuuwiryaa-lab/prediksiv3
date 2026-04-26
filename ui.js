/* ============================================
   PREDIKSI 4D PRO - ui.js
   User Interface & DOM Manipulations
   ============================================ */

const DOT_COLORS = [
  '#f0c040','#40c0f0','#f04060','#a040f0',
  '#40f0a0','#f08040','#40a0f0','#f040c0',
  '#80f040','#4080f0','#f0a040','#00c8a0'
];

let resultPanelOpen = false;
let internalClosing = false;

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeId(value) {
  return encodeURIComponent(String(value ?? ''));
}

function getHistoryTokens(raw) {
  return (raw || '').trim().split(/\s+/).filter(t => /^\d{4}$/.test(t));
}

function showResultPanel() {
  const panel = document.getElementById('resultPanel');
  panel.classList.add('show');

  if (!resultPanelOpen) {
    resultPanelOpen = true;
    history.pushState({ panel: 'result' }, '', '#result');
  }
}

function closeResult(skipHistoryBack = false) {
  const panel = document.getElementById('resultPanel');
  panel.classList.remove('show');

  if (resultPanelOpen) {
    resultPanelOpen = false;
    if (!skipHistoryBack && location.hash === '#result') {
      internalClosing = true;
      history.back();
    }
  }
}

window.addEventListener('popstate', () => {
  if (internalClosing) {
    internalClosing = false;
    return;
  }

  if (resultPanelOpen) {
    closeResult(true);
  }
});

// ════════════════════════════════════════════
// RENDER MARKET LIST
// ════════════════════════════════════════════
function renderMarkets(markets) {
  const list = document.getElementById('marketList');
  if (!markets.length) {
    list.innerHTML = '<div class="empty-state">Tidak ada pasaran ditemukan</div>';
    return;
  }
  list.innerHTML = markets.map((m, i) => {
    const tokens = getHistoryTokens(m.history_data);
    const lastResult = tokens.length ? tokens[tokens.length - 1] : '----';
    const dataStatus = tokens.length >= 169 ? 'READY' : `${tokens.length}/169`;
    return `
      <div class="market-card" data-market-id="${safeId(m.id)}" style="animation-delay:${i * 0.03}s">
        <div class="market-top">
          <div class="dot" style="background:${DOT_COLORS[i % DOT_COLORS.length]}"></div>
          <div class="market-name">${escapeHTML(m.name)}</div>
        </div>
        <div class="market-result">${escapeHTML(lastResult)}</div>
        <div class="market-meta">DATA: ${escapeHTML(dataStatus)}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.market-card').forEach(card => {
    card.addEventListener('click', () => {
      openMarket(decodeURIComponent(card.dataset.marketId || ''));
    });
  });
}

function filterMarkets() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const filtered = allMarkets.filter(m => String(m.name || '').toLowerCase().includes(q));
  renderMarkets(filtered);
}

async function refreshMarkets() {
  const btn = document.getElementById('syncBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'SYNC...';
  }
  await fetchMarkets();
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'SYNC';
  }
}

// ════════════════════════════════════════════
// UI INTERACTIONS
// ════════════════════════════════════════════
async function openMarket(id) {
  const market = allMarkets.find(m => m.id === id);
  if (!market) return;

  showLoading(`ANALISA ${market.name}...`);
  await sleep(200);

  const results = parseHistory(market.history_data, 169);

  if (results.length < 21) {
    document.getElementById('resultTitle').textContent = market.name;
    document.getElementById('resultBody').innerHTML = buildInsufficientDataHTML(results.length);
    hideLoading();
    showResultPanel();
    return;
  }

  const prediksi = runEnsemble(results);

  document.getElementById('resultTitle').textContent = market.name;
  document.getElementById('resultBody').innerHTML = buildResultHTML(results, prediksi, market);

  hideLoading();
  showResultPanel();
}

function showLoading(txt) {
  document.getElementById('loadingText').textContent = txt;
  document.getElementById('loadingScreen').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingScreen').classList.remove('show');
}

function buildInsufficientDataHTML(count) {
  return `
    <div class="data-warning-card">
      <div class="warning-icon">!</div>
      <div class="warning-title">DATA BELUM CUKUP</div>
      <div class="warning-text">Minimal 21 result untuk analisa awal.</div>
      <div class="warning-count">TERSEDIA: ${count} RESULT</div>
      <button class="warning-sync" onclick="closeResult(); refreshMarkets();" type="button">SYNC DATA</button>
    </div>
  `;
}

// ════════════════════════════════════════════
// BUILD RESULT HTML (CHART ATAS, AREA TERPISAH)
// ════════════════════════════════════════════
function buildResultHTML(results, pred, market) {
  const posColors = ['var(--accent)', 'var(--accent2)', 'var(--accent4)', 'var(--accent3)'];

  const modeInfo = `
    <div class="mode-strip">
      <div class="mode-chip">REVERSE EXTREME</div>
      <div class="mode-text">SKOR RENDAH = KUAT • BAR TINGGI = KUAT • DATA: ${results.length}</div>
    </div>
  `;

  // 1. GENERATE CHARTS (PALING ATAS)
  const chartsHTML = pred.posData.map((pos, pi) => {
    const scoreValues = Object.values(pos.normalized || {});
    const minScore = Math.min(...scoreValues);
    const maxScore = Math.max(...scoreValues) || 1;
    const scoreRange = Math.max(maxScore - minScore, 0.0001);
    
    const barRows = Array.from({length: 10}, (_, i) => i).map(digit => {
      const score = pos.normalized[digit] || 0;
      const pct = Math.max(8, ((maxScore - score) / scoreRange) * 100).toFixed(0);
      return `
        <div class="bar-col">
          <div class="bar-wrapper">
            <div class="bar-fill" style="height:${pct}%; background:${posColors[pi]}"></div>
          </div>
          <div class="bar-label">${digit}</div>
        </div>`;
    }).join('');

    return `
      <div class="chart-card">
        <div class="chart-head">
          <div class="pos-label" style="color:${posColors[pi]}">${pos.label}</div>
          <div class="chart-hint">TINGGI = KUAT</div>
        </div>
        <div class="chart-container">${barRows}</div>
      </div>`;
  }).join('');

  // 2. GENERATE DIGITS POLTAR (TOP 3 HIGHLIGHT)
  const digitRowsHTML = pred.posData.map((pos) => {
    const boxes = pos.sorted.map((item, idx) => {
      const rankClass = idx === 0 ? 'rank-1' : idx < 3 ? 'rank-top' : idx > 6 ? 'rank-low' : '';
      return `<div class="digit-box ${rankClass}">${item.digit}</div>`;
    }).join('');
    
    return `
      <div>
        <div class="row-label">${pos.label} <span>TERKUAT ➔ TERLEMAH</span></div>
        <div class="digit-scroll">${boxes}</div>
      </div>`;
  }).join('');

  const bbfsWR = ((pred.winBBFS / pred.totalTransisi) * 100).toFixed(1);
  const aiWR = ((pred.winAI / pred.totalTransisi) * 100).toFixed(1);

  return `
    ${modeInfo}
    <div class="chart-section">${chartsHTML}</div>

    <div class="section-title">POLTAR 4D</div>
    <div class="summary-section">
      ${digitRowsHTML}
      <div class="advisory-text">Manajemen Risiko: Pilih jumlah digit sesuai modal & target profit Anda.</div>
    </div>

    <div class="divider"></div>

    <div class="section-title bonus-title">BONUS OUTPUT</div>
    <div class="summary-section bonus-section">
      <div>
        <div class="row-label">BBFS 8 DIGIT</div>
        <div class="digit-scroll">
          ${pred.bbfs8.map(d => `<div class="digit-box bonus-box">${d}</div>`).join('')}
        </div>
        <div class="wr-tag">WINRATE: ${bbfsWR}%</div>
      </div>

      <div>
        <div class="row-label">ANGKA IKUT 4 DIGIT</div>
        <div class="digit-scroll">
          ${pred.ai4.map(d => `<div class="digit-box bonus-box">${d}</div>`).join('')}
        </div>
        <div class="wr-tag">WINRATE: ${aiWR}%</div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════
// INIT SISTEM
// ════════════════════════════════════════════
fetchMarkets();
