/* ============================================
   PREDIKSI 4D PRO - engine.js
   Core Logic, Data Fetching & Math Models
   ============================================ */

const MARKETS_API_URL = 'https://ldeofmwxttdjcvylhabu.supabase.co/functions/v1/get-markets';
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
// HELPERS
// ════════════════════════════════════════════
function parseHistory(raw, limit) {
  if (!raw) return [];
  const tokens = raw.trim().split(/\s+/);
  const valid = tokens.filter(t => /^\d{4}$/.test(t));
  return valid.slice(-limit);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ════════════════════════════════════════════
// ENGINE ENSEMBLE
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
