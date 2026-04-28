/* ============================================
   PREDIKSI 4D PRO - ui.js
   User Interface & DOM Manipulations
   ============================================ */

const DOT_COLORS = [
  '#f0c040','#40c0f0','#f04060','#f040c0', '#40f0a0','#f08040','#40a0f0','#f040c0',
  '#80f040','#4080f0','#f0a040','#00c8a0'
];

const DEFAULT_POLTAR_LIMIT = 7;
const POLTAR_RANGE_SIZE = 3;
const MAX_EVALUATION_HISTORY = 14;

let resultPanelOpen = false;
let historyPageOpen = false;
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

function toDigitList(value) {
  return Array.isArray(value) ? value.map(v => String(v)) : [];
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

  if (historyPageOpen) closeHistoryPage(true);

  if (resultPanelOpen) {
    resultPanelOpen = false;
    if (!skipHistoryBack && location.hash === '#result') {
      internalClosing = true;
      history.back();
    }
  }
}

function openHistoryPage(marketId) {
  const market = allMarkets.find(m => String(m.id) === String(marketId));
  const page = document.getElementById('historyPage');
  const body = document.getElementById('historyPageBody');
  const title = document.getElementById('historyTitle');
  if (!page || !body) return;

  const evaluations = getMarketEvaluations(market);
  if (title) title.textContent = market ? `RIWAYAT ${market.name}` : 'RIWAYAT EVALUASI';
  body.innerHTML = buildHistoryPageContent(evaluations);
  page.classList.add('show');

  if (!historyPageOpen) {
    historyPageOpen = true;
    history.pushState({ panel: 'history' }, '', '#history');
  }
}

function closeHistoryPage(skipHistoryBack = false) {
  const page = document.getElementById('historyPage');
  if (page) page.classList.remove('show');

  if (historyPageOpen) {
    historyPageOpen = false;
    if (!skipHistoryBack && location.hash === '#history') {
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

  if (historyPageOpen) {
    closeHistoryPage(true);
    return;
  }

  if (resultPanelOpen) closeResult(true);
});

function trimEvaluations(evaluations) {
  return (Array.isArray(evaluations) ? evaluations : []).slice(0, MAX_EVALUATION_HISTORY);
}

function normalizeEvaluation(row) {
  if (!row) return null;

  return {
    fromResult: row.from_result ?? row.fromResult,
    newResult: row.new_result ?? row.newResult,
    bbfsStatus: row.bbfs_status ?? row.bbfsStatus,
    aiStatus: row.ai_status ?? row.aiStatus,
    evaluatedAt: row.evaluated_at ?? row.evaluatedAt,
    poltarRanks: {
      as: row.rank_as ?? row.poltarRanks?.as ?? null,
      kop: row.rank_kop ?? row.poltarRanks?.kop ?? null,
      kepala: row.rank_kepala ?? row.poltarRanks?.kepala ?? null,
      ekor: row.rank_ekor ?? row.poltarRanks?.ekor ?? null
    }
  };
}

function getMarketEvaluations(market) {
  const rows = trimEvaluations(market?.prediction_evaluations || []);
  return rows
    .map(normalizeEvaluation)
    .filter(Boolean)
    .sort((a, b) => new Date(b.evaluatedAt || 0) - new Date(a.evaluatedAt || 0));
}

function getLatestEvaluation(market) {
  return getMarketEvaluations(market)[0] || null;
}

function getMarketSnapshot(market) {
  return market?.prediction_snapshot || null;
}

function getDenseRankRange(ranks) {
  if (!ranks.length) {
    return { start: 1, end: DEFAULT_POLTAR_LIMIT };
  }

  if (ranks.length === 1) {
    const rank = ranks[0].rank;
    return {
      start: Math.max(1, rank - 1),
      end: Math.min(10, rank + 1)
    };
  }

  let best = { start: 1, end: POLTAR_RANGE_SIZE, score: -1, distance: Infinity };
  const maxStart = 10 - POLTAR_RANGE_SIZE + 1;

  for (let start = 1; start <= maxStart; start++) {
    const end = start + POLTAR_RANGE_SIZE - 1;
    const center = (start + end) / 2;
    let score = 0;
    let distance = 0;

    ranks.forEach((item, index) => {
      const recencyWeight = 1 / (index + 1);
      if (item.rank >= start && item.rank <= end) score += recencyWeight;
      distance += Math.abs(item.rank - center) * recencyWeight;
    });

    if (score > best.score || (score === best.score && distance < best.distance)) {
      best = { start, end, score, distance };
    }
  }

  return { start: best.start, end: best.end };
}

function getPoltarRankRanges(evaluations) {
  const ranges = {
    as: { start: 1, end: DEFAULT_POLTAR_LIMIT },
    kop: { start: 1, end: DEFAULT_POLTAR_LIMIT },
    kepala: { start: 1, end: DEFAULT_POLTAR_LIMIT },
    ekor: { start: 1, end: DEFAULT_POLTAR_LIMIT }
  };

  const recent = trimEvaluations(evaluations);

  Object.keys(ranges).forEach(key => {
    const ranks = recent
      .map((e, index) => ({ rank: e?.poltarRanks?.[key], index }))
      .filter(item => Number.isFinite(item.rank) && item.rank > 0 && item.rank <= 10);

    ranges[key] = getDenseRankRange(ranks);
  });

  return ranges;
}

function getFallbackPoltarLists(pred) {
  return {
    as: pred.posData[0].sorted.map(item => String(item.digit)),
    kop: pred.posData[1].sorted.map(item => String(item.digit)),
    kepala: pred.posData[2].sorted.map(item => String(item.digit)),
    ekor: pred.posData[3].sorted.map(item => String(item.digit))
  };
}

function getSnapshotPoltarLists(snapshot, pred) {
  const fallback = getFallbackPoltarLists(pred);
  if (!snapshot) return fallback;

  return {
    as: toDigitList(snapshot.poltar_as).length ? toDigitList(snapshot.poltar_as) : fallback.as,
    kop: toDigitList(snapshot.poltar_kop).length ? toDigitList(snapshot.poltar_kop) : fallback.kop,
    kepala: toDigitList(snapshot.poltar_kepala).length ? toDigitList(snapshot.poltar_kepala) : fallback.kepala,
    ekor: toDigitList(snapshot.poltar_ekor).length ? toDigitList(snapshot.poltar_ekor) : fallback.ekor
  };
}

function getNextPoltarChoices(pred, market) {
  const evaluations = getMarketEvaluations(market);
  const ranges = getPoltarRankRanges(evaluations);
  const lists = getSnapshotPoltarLists(getMarketSnapshot(market), pred);

  const choices = {};
  Object.keys(lists).forEach(key => {
    const range = ranges[key];
    choices[key] = lists[key].slice(range.start - 1, range.end).map(d => String(d));
  });

  return choices;
}

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
        <div class="eval-note">Belum ada evaluasi terbaru. Riwayat akan muncul otomatis setelah result berikutnya tersedia.</div>
      </div>
    `;
  }

  return `
    <div class="eval-card">
      <div class="eval-title">EVALUASI PREDIKSI TERAKHIR</div>
      <div class="eval-subtitle">Transisi result: <strong>${escapeHTML(evaluation.fromResult)} → ${escapeHTML(evaluation.newResult)}</strong></div>
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

function buildHistoryRows(evaluations) {
  const items = trimEvaluations(evaluations);
  if (!items.length) return '<div class="history-empty">Belum ada riwayat evaluasi tersimpan.</div>';

  return items.map((evaluation) => `
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
}

function buildHistoryPageContent(evaluations) {
  const items = trimEvaluations(evaluations);
  return `
    <div class="history-page-summary">Menyimpan maksimal ${MAX_EVALUATION_HISTORY} evaluasi terakhir. Riwayat ini membantu memantau pola performa dari transisi result sebelumnya.</div>
    <div class="history-panel show page-mode">
      <div class="history-panel-title">RIWAYAT EVALUASI TERSIMPAN (${items.length}/14)</div>
      ${buildHistoryRows(items)}
    </div>
  `;
}

function buildEvaluationHistoryButton(marketId, evaluations) {
  const items = trimEvaluations(evaluations);
  const disabled = items.length ? '' : 'disabled';
  return `
    <button class="history-toggle" onclick="openHistoryPage('${escapeHTML(String(marketId))}')" type="button" ${disabled}>
      BUKA HALAMAN RIWAYAT EVALUASI
    </button>
  `;
}

function buildNextPoltarHTML(choices) {
  const row = (label, digits) => `
    <div class="next-row">
      <div class="next-label">${label}</div>
      <div class="next-digits">
        ${digits.map(d => `<div class="next-digit">${escapeHTML(d)}</div>`).join('')}
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

function buildResultHTML(results, pred, market) {
  const posColors = ['var(--accent)', 'var(--accent2)', 'var(--accent4)', 'var(--accent3)'];
  const evaluations = getMarketEvaluations(market);
  const evaluation = getLatestEvaluation(market);
  const nextChoices = getNextPoltarChoices(pred, market);

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
    ${buildNextPoltarHTML(nextChoices)}
    ${buildEvaluationHTML(evaluation)}
    ${buildEvaluationHistoryButton(market.id, evaluations)}
  `;
}

fetchMarkets();
