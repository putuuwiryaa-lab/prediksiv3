/* ============================================
   PREDIKSI 4D PRO - script.js
   Clean & Modern Edition (Final Layout)
   ============================================ */

const SUPABASE_URL = 'https://ldeofmwxttdjcvylhabu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZW9mbXd4dHRkamN2eWxoYWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMTM2NDYsImV4cCI6MjA5MjU4OTY0Nn0.MBl-9xqRmm0FxCuzuQR68zFKGkWY_yVV4I05yI1KM2U';

const DOT_COLORS = [
  '#f0c040','#40c0f0','#f04060','#a040f0',
  '#40f0a0','#f08040','#40a0f0','#f040c0',
  '#80f040','#4080f0','#f0a040','#00c8a0'
];

let allMarkets = [];

// ════════════════════════════════════════════
// DATA FETCH
// ════════════════════════════════════════════

async function fetchMarkets() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/markets?select=id,name,history_data,order,updated_at&order=order.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) throw new Error('Fetch failed');
    allMarkets = await res.json();
    renderMarkets(allMarkets);

    document.getElementById('statsRow').style.display = 'flex';
    document.getElementById('statTotal').textContent = allMarkets.length;

    const latest = allMarkets.reduce((a, b) =>
      new Date(a.updated_at) > new Date(b.updated_at) ? a : b, allMarkets[0]);
    if (latest) {
      const d = new Date(latest.updated_at);
      document.getElementById('statUpdated').textContent =
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) {
    document.getElementById('marketList').innerHTML =
      `<div class="empty-state">❌ Gagal memuat data.<br>${e.message}</div>`;
  }
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
    const tokens = (m.history_data || '').trim().split(/\s+/).filter(t => /^\d{4}$/.test(t));
    const lastResult = tokens.length ? tokens[tokens.length - 1] : '----';
    return `
      <div class="market-card" onclick="openMarket('${m.id}')" style="animation-delay:${i * 0.03}s">
        <div class="market-top">
          <div class="dot" style="background:${DOT_COLORS[i % DOT_COLORS.length]}"></div>
          <div class="market-name">${m.name}</div>
        </div>
        <div class="market-result">${lastResult}</div>
      </div>
    `;
  }).join('');
}

function filterMarkets() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const filtered = allMarkets.filter(m => m.name.toLowerCase().includes(q));
  renderMarkets(filtered);
}

// ════════════════════════════════════════════
// OPEN MARKET → ANALISA
// ════════════════════════════════════════════

async function openMarket(id) {
  const market = allMarkets.find(m => m.id === id);
  if (!market) return;

  showLoading(`ANALISA ${market.name}...`);
  await sleep(200);

  const results = parseHistory(market.history_data, 169);

  if (results.length < 21) {
    hideLoading();
    alert('Data tidak cukup untuk analisa (min 21 result)');
    return;
  }

  const prediksi = runEnsemble(results);

  document.getElementById('resultTitle').textContent = market.name;
  
  // MENGHILANGKAN TEXT SUBTITLE (DATA & TRANSISI)
  document.getElementById('resultSubtitle').textContent = ""; 
  
  document.getElementById('resultBody').innerHTML = buildResultHTML(results, prediksi, market);

  hideLoading();
  document.getElementById('resultPanel').classList.add('show');
}

function closeResult() {
  document.getElementById('resultPanel').classList.remove('show');
}

// ════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════

function parseHistory(raw, limit) {
  if (!raw) return [];
  const tokens = raw.trim().split(/\s+/);
  const valid = tokens.filter(t => /^\d{4}$/.test(t));
  return valid.slice(-limit);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showLoading(txt) {
  document.getElementById('loadingText').textContent = txt;
  document.getElementById('loadingScreen').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingScreen').classList.remove('show');
}

// ════════════════════════════════════════════
// ENGINE ENSEMBLE
// Markov 40% + Gap/Overdue 30% + Recency 30%
// ════════════════════════════════════════════

function runEnsemble(results) {
  const n = results.length;
  const transitions = n - 1;
  const posLabels = ['AS', 'KOP', 'KEPALA', 'EKOR'];
  const posData = [];

  for (let posOut = 0; posOut < 4; posOut++) {
    const scores = {};
    for (let d = 0; d <= 9; d++) scores[d] = 0;

    // ── METODE 1: MARKOV (bobot 40%) ──
    let bestMarkovScore = -1;
    let bestMarkovDigits = null;

    for (let posPat = 0; posPat < 4; posPat++) {
      const freqMap = {};
      for (let k = 0; k <= 9; k++) freqMap[k] = {};

      for (let i = 0; i < transitions; i++) {
        const pat = parseInt(results[i][posPat]);
        const nxt = parseInt(results[i + 1][posOut]);
        freqMap[pat][nxt] = (freqMap[pat][nxt] || 0) + 1;
      }

      const lastPat = parseInt(results[n - 1][posPat]);
      const counter = freqMap[lastPat];
      const total = Object.values(counter).reduce((a, b) => a + b, 0);

      if (total >= 3) {
        const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
        const topScore = sorted[0] ? sorted[0][1] : 0;
        if (topScore > bestMarkovScore) {
          bestMarkovScore = topScore;
          bestMarkovDigits = { counter, total };
        }
      }
    }

    if (bestMarkovDigits) {
      const { counter, total } = bestMarkovDigits;
      for (let d = 0; d <= 9; d++) {
        scores[d] += ((counter[d] || 0) / total) * 4.0;
      }
    }

    // ── METODE 2: GAP/OVERDUE (bobot 30%) ──
    const lastSeen = {};
    for (let d = 0; d <= 9; d++) lastSeen[d] = -1;
    for (let i = 0; i < n; i++) {
      lastSeen[parseInt(results[i][posOut])] = i;
    }
    for (let d = 0; d <= 9; d++) {
      const gap = lastSeen[d] === -1 ? n : (n - 1 - lastSeen[d]);
      scores[d] += (gap / n) * 3.0;
    }

    // ── METODE 3: RECENCY 20 data terakhir (bobot 30%) ──
    // Tetap menggunakan 16-data recency sesuai koreksi sebelumnya jika Anda sudah menerapkannya, 
    // jika belum, ini tetap 20 sesuai script asli Anda agar engine tidak rusak.
    const recent = results.slice(-20);
    const recencyCount = {};
    for (let d = 0; d <= 9; d++) recencyCount[d] = 0;
    for (const r of recent) recencyCount[parseInt(r[posOut])]++;
    const recMax = Math.max(...Object.values(recencyCount)) || 1;
    for (let d = 0; d <= 9; d++) {
      scores[d] += (recencyCount[d] / recMax) * 3.0;
    }

    // Normalisasi ke 0-10
    const maxScore = Math.max(...Object.values(scores)) || 1;
    const normalized = {};
    for (let d = 0; d <= 9; d++) {
      normalized[d] = (scores[d] / maxScore) * 10;
    }

    const sorted = Object.entries(normalized)
      .sort((a, b) => b[1] - a[1])
      .map(([digit, score]) => ({ digit: parseInt(digit), score: parseFloat(score.toFixed(2)) }));

    posData.push({ label: posLabels[posOut], sorted, normalized });
  }

  // BBFS 8D & AI 4D dari gabungan KEP+EKR
  const combined = {};
  for (let d = 0; d <= 9; d++) {
    combined[d] = (posData[2].normalized[d] + posData[3].normalized[d]) / 2;
  }
  const bbfs8 = Object.entries(combined).sort((a, b) => b[1] - a[1])
    .slice(0, 8).map(([d]) => d).sort((a, b) => a - b);
  const ai4 = Object.entries(combined).sort((a, b) => b[1] - a[1])
    .slice(0, 4).map(([d]) => d).sort((a, b) => a - b);

  // Backtest winrate
  let winBBFS = 0, winAI = 0;
  for (let i = 0; i < transitions; i++) {
    const nxtKep = results[i + 1][2];
    const nxtEkr = results[i + 1][3];
    if (bbfs8.includes(nxtKep) && bbfs8.includes(nxtEkr)) winBBFS++;
    if (ai4.includes(nxtKep) || ai4.includes(nxtEkr)) winAI++;
  }

  return { posData, bbfs8, ai4, winBBFS, winAI, totalTransisi: transitions, dataCount: n };
}

// ════════════════════════════════════════════
// BUILD RESULT HTML (CHART DI ATAS, ANGKA DI BAWAH)
// ════════════════════════════════════════════

function buildResultHTML(results, pred, market) {
  const posColors = ['var(--accent)', 'var(--accent2)', 'var(--accent4)', 'var(--accent3)'];

  // 1. GENERATE CHARTS (BAGIAN ATAS)
  const chartsHTML = pred.posData.map((pos, pi) => {
    const maxScore = pos.sorted[0].score || 1;
    
    // Barisan Chart 0-9
    const barRows = Array.from({length: 10}, (_, i) => i).map(digit => {
      const score = pos.normalized[digit] || 0;
      const pct = (score / maxScore * 100).toFixed(0);
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
        <div class="pos-label" style="color:${posColors[pi]}">${pos.label}</div>
        <div class="chart-container">${barRows}</div>
      </div>`;
  }).join('');

  // 2. GENERATE DIGITS (BAGIAN BAWAH)
  const digitRowsHTML = pred.posData.map((pos, pi) => {
    // Render kotak angka (3 teratas diberi gaya khusus 'top')
    const boxes = pos.sorted.map((item, rank) => 
      `<div class="digit-box ${rank < 3 ? 'top' : ''}">${item.digit}</div>`
    ).join('');
    
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

    <div class="summary-section">
      ${digitRowsHTML}
      
      <div style="border-top: 1px dashed var(--border); padding-top: 15px;">
        <div class="row-label">BBFS 8 DIGIT</div>
        <div class="digit-scroll">
          ${pred.bbfs8.map(d => `<div class="digit-box top">${d}</div>`).join('')}
        </div>
        <div class="wr-tag">WINRATE: ${bbfsWR}%</div>
      </div>

      <div>
        <div class="row-label">ANGKA IKUT 4 DIGIT</div>
        <div class="digit-scroll">
          ${pred.ai4.map(d => `<div class="digit-box" style="color:var(--accent4); border:1px solid var(--accent4)">${d}</div>`).join('')}
        </div>
        <div class="wr-tag">WINRATE: ${aiWR}%</div>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════
fetchMarkets();
