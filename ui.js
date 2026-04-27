/* ============================================
   PREDIKSI 4D PRO - ui.js
   User Interface & DOM Manipulations
   ============================================ */

const DOT_COLORS = [
  '#f0c040','#40c0f0','#f04060','#a040f0', '#40f0a0','#f08040','#40a0f0','#f040c0',
  '#80f040','#4080f0','#f0a040','#00c8a0'
];

const PREMIUM_APP_URL = 'https://analisaangka.online';
const HISTORY_PREFIX = 'prediksiv3_eval_';
const DEFAULT_POLTAR_LIMIT = 7;
const MAX_EVALUATION_HISTORY = 14;

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

function setupPremiumBanner() {
  const app = document.querySelector('.app');
  const searchWrap = document.querySelector('.search-wrap');
  if (!app || !searchWrap || document.getElementById('premiumAd')) return;

  const banner = document.createElement('div');
  banner.id = 'premiumAd';
  banner.className = 'premium-ad';
  banner.setAttribute('role', 'button');
  banner.setAttribute('tabindex', '0');
  banner.innerHTML = `
    <div class="premium-ad-top">
      <div class="premium-ad-badge">PREMIUM</div>
      <div class="premium-ad-title">ANALISA ANGKA</div>
    </div>
    <div class="premium-ad-text">Versi lebih lengkap dari Prediksi 4D: Angka Ikut, Angka Mati, Jumlah, Shio & Rekap.</div>
    <div class="premium-ad-cta">BUKA APLIKASI PREMIUM →</div>
  `;
  banner.addEventListener('click', openPremiumApp);
  banner.addEventListener('keydown', event => {
    if (event.key === 'Enter') openPremiumApp();
  });
  app.insertBefore(banner, searchWrap);
}

function openPremiumApp() {
  if (!PREMIUM_APP_URL || PREMIUM_APP_URL === '#') {
    alert('Link aplikasi premium belum diatur.');
    return;
  }
  window.open(PREMIUM_APP_URL, '_blank', 'noopener,noreferrer');
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

  if (resultPanelOpen) closeResult(true);
});

function toggleEvaluationHistory() {
  const panel = document.getElementById('evaluationHistoryPanel');
  const btn = document.getElementById('evaluationHistoryBtn');
  if (!panel) return;
  const isOpen = panel.classList.toggle('show');
  if (btn) btn.textContent = isOpen ? 'TUTUP RIWAYAT EVALUASI' : 'LIHAT RIWAYAT EVALUASI';
}

// ════════════════════════════════════════════
// PREDICTION HISTORY / EVALUATION
// ════════════════════════════════════════════
function getMarketHistoryKey(marketId) {
  return `${HISTORY_PREFIX}${marketId}`;
}

function trimEvaluations(evaluations) {
  return (Array.isArray(evaluations) ? evaluations : []).slice(0, MAX_EVALUATION_HISTORY);
}

function loadMarketHistory(marketId) {
  try {
    const raw = localStorage.getItem(getMarketHistoryKey(marketId));
    if (!raw) return { evaluations: [] };
    const parsed = JSON.parse(raw);
    return {
      lastBaseResult: parsed.lastBaseResult || null,
      lastPrediction: parsed.lastPrediction || null,
      lastEvaluation: parsed.lastEvaluation || null,
      evaluations: trimEvaluations(parsed.evaluations)
    };
  } catch {
    return { evaluations: [] };
  }
}

function saveMarketHistory(marketId, history) {
  try {
    history.evaluations = trimEvaluations(history.evaluations);
    localStorage.setItem(getMarketHistoryKey(marketId), JSON.stringify(history));
  } catch {
    // localStorage bisa penuh/private mode. Abaikan agar app tetap jalan.
  }
}

function makePredictionSnapshot(pred, baseResult) {
  return {
    baseResult,
    savedAt: new Date().toISOString(),
    bbfs8: pred.bbfs8.map(String),
    ai4: pred.ai4.map(String),
    poltar: {
      as: pred.posData[0].sorted.map(item => String(item.digit)),
      kop: pred.posData[1].sorted.map(item => String(item.digit)),
      kepala: pred.posData[2].sorted.map(item => String(item.digit)),
      ekor: pred.posData[3].sorted.map(item => String(item.digit))
    }
  };
}

function evaluateBBFS(bbfs8, result) {
  const set = new Set((bbfs8 || []).map(String));
  const asHit = set.has(result[0]);
  const kopHit = set.has(result[1]);
  const kepalaHit = set.has(result[2]);
  const ekorHit = set.has(result[3]);

  let status = 'ZONK';
  if (asHit && kopHit && kepalaHit && ekorHit) status = '4D';
  else if (kopHit && kepalaHit && ekorHit) status = '3D';
  else if (kepalaHit && ekorHit) status = '2D';

  return { status, hits: { as: asHit, kop: kopHit, kepala: kepalaHit, ekor: ekorHit } };
}

function evaluateAI(ai4, result) {
  const set = new Set((ai4 || []).map(String));
  const masuk = result.split('').some(d => set.has(d));
  return { status: masuk ? 'MASUK' : 'ZONK' };
}

function findRank(list, digit) {
  const idx = (list || []).map(String).findIndex(d => d === String(digit));
  return idx >= 0 ? idx + 1 : null;
}

function evaluatePoltar(poltar, result) {
  return {
    as: findRank(poltar?.as, result[0]),
    kop: findRank(poltar?.kop, result[1]),
    kepala: findRank(poltar?.kepala, result[2]),
    ekor: findRank(poltar?.ekor, result[3])
  };
}

function buildEvaluation(previousPrediction, newResult) {
  const bbfs = evaluateBBFS(previousPrediction.bbfs8, newResult);
  const ai = evaluateAI(previousPrediction.ai4, newResult);
  const poltarRanks = evaluatePoltar(previousPrediction.poltar, newResult);

  return {
    fromResult: previousPrediction.baseResult,
    newResult,
    bbfsStatus: bbfs.status,
    bbfsHits: bbfs.hits,
    aiStatus: ai.status,
    poltarRanks,
    evaluatedAt: new Date().toISOString()
  };
}

function processPredictionHistory(market, results, pred) {
  const latestResult = results[results.length - 1];
  const history = loadMarketHistory(market.id);
  let evaluation = history.lastEvaluation || null;

  if (history.lastPrediction && history.lastBaseResult && history.lastBaseResult !== latestResult) {
    const alreadyEvaluated = history.lastEvaluation &&
      history.lastEvaluation.fromResult === history.lastBaseResult &&
      history.lastEvaluation.newResult === latestResult;

    if (!alreadyEvaluated) {
      evaluation = buildEvaluation(history.lastPrediction, latestResult);
      history.lastEvaluation = evaluation;
      history.evaluations = trimEvaluations([evaluation, ...(history.evaluations || [])]);
    }
  }

  if (!history.lastBaseResult || history.lastBaseResult !== latestResult) {
    history.lastBaseResult = latestResult;
    history.lastPrediction = makePredictionSnapshot(pred, latestResult);
  }

  saveMarketHistory(market.id, history);
  return { evaluation, history };
}

function getPoltarLimits(evaluations) {
  const limits = { as: DEFAULT_POLTAR_LIMIT, kop: DEFAULT_POLTAR_LIMIT, kepala: DEFAULT_POLTAR_LIMIT, ekor: DEFAULT_POLTAR_LIMIT };
  const keys = Object.keys(limits);
  const recent = trimEvaluations(evaluations);

  keys.forEach(key => {
    const ranks = recent
      .map(e => e?.poltarRanks?.[key])
      .filter(rank => Number.isFinite(rank) && rank > 0);

    if (!ranks.length) return;

    if (ranks.length === 1) {
      limits[key] = Math.max(3, Math.min(10, ranks[0]));
      return;
    }

    let selected = DEFAULT_POLTAR_LIMIT;
    for (let k = 3; k <= 10; k++) {
      const coverage = ranks.filter(rank => rank <= k).length / ranks.length;
      if (coverage >= 0.70) {
        selected = k;
        break;
      }
    }

    limits[key] = Math.max(3, Math.min(10, selected));
  });

  return limits;
}

function getNextPoltarChoices(pred, history) {
  const limits = getPoltarLimits(history?.evaluations || []);
  const map = [
    ['as', pred.posData[0]], ['kop', pred.posData[1]],
    ['kepala', pred.posData[2]], ['ekor', pred.posData[3]]
  ];

  const choices = {};
  map.forEach(([key, pos]) => {
    choices[key] = pos.sorted.slice(0, limits[key]).map(item => item.digit);
  });

  return choices;
}

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
    card.addEventListener('click', () => openMarket(decodeURIComponent(card.dataset.marketId || '')));
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
  const historyState = processPredictionHistory(market, results, prediksi);

  document.getElementById('resultTitle').textContent = market.name;
  document.getElementById('resultBody').innerHTML = buildResultHTML(results, prediksi, market, historyState);

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

function buildRankGrid(poltarRanks) {
  const rankItem = (label, rank) => `
    <div class="rank-item">
      <span>${label}</span>
      <strong>${rank ? `#${rank}` : '-'}</strong>
    </div>
  `;
  return `
    <div class="rank-grid">
      ${rankItem('AS', poltarRanks?.as)}
      ${rankItem('KOP', poltarRanks?.kop)}
      ${rankItem('KEPALA', poltarRanks?.kepala)}
      ${rankItem('EKOR', poltarRanks?.ekor)}
    </div>
  `;
}

function buildEvaluationHTML(evaluation) {
  if (!evaluation) {
    return `
      <div class="eval-card muted-eval">
        <div class="eval-title">EVALUASI PREDIKSI TERAKHIR</div>
        <div class="eval-note">Belum ada result baru untuk dievaluasi. Prediksi saat ini sudah disimpan untuk result berikutnya.</div>
      </div>
    `;
  }

  return `
    <div class="eval-card">
      <div class="eval-title">EVALUASI PREDIKSI TERAKHIR</div>
      <div class="eval-subtitle">Terhadap result baru: <strong>${escapeHTML(evaluation.newResult)}</strong></div>
      <div class="eval-grid">
        <div class="eval-pill ${evaluation.bbfsStatus === 'ZONK' ? 'bad' : 'good'}">
          <span>BBFS</span><strong>${escapeHTML(evaluation.bbfsStatus)}</strong>
        </div>
        <div class="eval-pill ${evaluation.aiStatus === 'ZONK' ? 'bad' : 'good'}">
          <span>AI</span><strong>${escapeHTML(evaluation.aiStatus)}</strong>
        </div>
      </div>
      ${buildRankGrid(evaluation.poltarRanks)}
    </div>
  `;
}

function buildEvaluationHistoryHTML(evaluations) {
  const items = trimEvaluations(evaluations);
  const disabled = items.length ? '' : 'disabled';
  const emptyText = items.length ? '' : '<div class="history-empty">Belum ada riwayat evaluasi tersimpan.</div>';

  const rows = items.map((evaluation) => `
    <div class="history-card">
      <div class="history-title">TRANSISI RESULT ${escapeHTML(evaluation.fromResult)} → ${escapeHTML(evaluation.newResult)}</div>
      <div class="eval-grid compact">
        <div class="eval-pill ${evaluation.bbfsStatus === 'ZONK' ? 'bad' : 'good'}">
          <span>BBFS</span><strong>${escapeHTML(evaluation.bbfsStatus)}</strong>
        </div>
        <div class="eval-pill ${evaluation.aiStatus === 'ZONK' ? 'bad' : 'good'}">
          <span>AI</span><strong>${escapeHTML(evaluation.aiStatus)}</strong>
        </div>
      </div>
      ${buildRankGrid(evaluation.poltarRanks)}
    </div>
  `).join('');

  return `
    <button class="history-toggle" id="evaluationHistoryBtn" onclick="toggleEvaluationHistory()" type="button" ${disabled}>
      LIHAT RIWAYAT EVALUASI
    </button>
    <div class="history-panel" id="evaluationHistoryPanel">
      <div class="history-panel-title">RIWAYAT EVALUASI TERSIMPAN (${items.length}/14)</div>
      ${emptyText}
      ${rows}
    </div>
  `;
}

function buildNextPoltarHTML(choices) {
  const row = (label, digits) => `
    <div class="next-row">
      <div class="next-label">${label}</div>
      <div class="next-digits">
        ${digits.map(d => `<div class="next-digit">${d}</div>`).join('')}
      </div>
    </div>
  `;

  return `
    <div class="section-title">PILIHAN POLTAR SELANJUTNYA</div>
    <div class="next-poltar-card">
      ${row('AS', choices.as)}
      ${row('KOP', choices.kop)}
      ${row('KEPALA', choices.kepala)}
      ${row('EKOR', choices.ekor)}
    </div>
  `;
}

// ════════════════════════════════════════════
// BUILD RESULT HTML (CHART ATAS, AREA TERPISAH)
// ════════════════════════════════════════════
function buildResultHTML(results, pred, market, historyState) {
  const posColors = ['var(--accent)', 'var(--accent2)', 'var(--accent4)', 'var(--accent3)'];
  const nextChoices = getNextPoltarChoices(pred, historyState?.history || {});
  const evaluations = historyState?.history?.evaluations || [];

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

    <div class="divider"></div>
    ${buildEvaluationHTML(historyState?.evaluation)}
    ${buildEvaluationHistoryHTML(evaluations)}
    ${buildNextPoltarHTML(nextChoices)}
  `;
}

// ════════════════════════════════════════════
// INIT SISTEM
// ════════════════════════════════════════════
setupPremiumBanner();
fetchMarkets();
