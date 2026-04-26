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
    const res = await fetch(MARKETS_API_URL);
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

function normalizeScores(rawScores) {
  const maxScore = Math.max(...Object.values(rawScores)) || 1;
  const normalized = {};
  for (let d = 0; d <= 9; d++) {
    normalized[d] = maxScore > 0 ? rawScores[d] / maxScore : 0;
  }
  return normalized;
}

// ════════════════════════════════════════════
// ENGINE ENSEMBLE - REVERSE EXTREME POLTAR MODE
// Fokus utama: ranking AS, KOP, KEPALA, EKOR.
// Skor rendah dianggap paling kuat.
// ════════════════════════════════════════════
function runEnsemble(results) {
  const n = results.length;
  const transitions = n - 1;
  const posLabels = ['AS', 'KOP', 'KEPALA', 'EKOR'];
  const posData = [];

  const WEIGHTS = {
    markov: 0.40,
    recency: 0.35,
    momentum: 0.15,
    frequency: 0.07,
    gap: 0.03
  };

  const MARKOV_ALPHA = 0.35;
  const RECENCY_DECAY = 22;
  const MOMENTUM_WINDOW = 12;

  for (let posOut = 0; posOut < 4; posOut++) {
    const scores = {};
    for (let d = 0; d <= 9; d++) scores[d] = 0;

    // ── METODE 1: MULTI-SOURCE SMOOTHED MARKOV ──
    const markovRaw = {};
    for (let d = 0; d <= 9; d++) markovRaw[d] = 0;

    let totalSourceStrength = 0;

    for (let posPat = 0; posPat < 4; posPat++) {
      const freqMap = {};
      for (let k = 0; k <= 9; k++) freqMap[k] = {};

      for (let i = 0; i < transitions; i++) {
        const pat = parseInt(results[i][posPat]);
        const nxt = parseInt(results[i + 1][posOut]);
        freqMap[pat][nxt] = (freqMap[pat][nxt] || 0) + 1;
      }

      const lastPat = parseInt(results[n - 1][posPat]);
      const counter = freqMap[lastPat] || {};
      const total = Object.values(counter).reduce((a, b) => a + b, 0);

      const candidate = {};
      for (let d = 0; d <= 9; d++) {
        candidate[d] = ((counter[d] || 0) + MARKOV_ALPHA) / (total + MARKOV_ALPHA * 10);
      }

      const sortedCandidate = Object.entries(candidate).sort((a, b) => b[1] - a[1]);
      const edge = sortedCandidate[0][1] - sortedCandidate[1][1];
      const sourceStrength = Math.max(0.15, total * edge);
      totalSourceStrength += sourceStrength;

      for (let d = 0; d <= 9; d++) {
        markovRaw[d] += candidate[d] * sourceStrength;
      }
    }

    if (totalSourceStrength > 0) {
      for (let d = 0; d <= 9; d++) markovRaw[d] /= totalSourceStrength;
    }

    const markovScore = normalizeScores(markovRaw);

    // ── METODE 2: POSITION RECENCY ──
    const recencyRaw = {};
    for (let d = 0; d <= 9; d++) recencyRaw[d] = 0;
    for (let i = 0; i < n; i++) {
      const digit = parseInt(results[i][posOut]);
      const age = n - 1 - i;
      const weight = Math.exp(-age / RECENCY_DECAY);
      recencyRaw[digit] += weight;
    }
    const recencyScore = normalizeScores(recencyRaw);

    // ── METODE 3: SHORT MOMENTUM ──
    const momentumRaw = {};
    for (let d = 0; d <= 9; d++) momentumRaw[d] = 0;
    const startMomentum = Math.max(0, n - MOMENTUM_WINDOW);
    for (let i = startMomentum; i < n; i++) {
      const digit = parseInt(results[i][posOut]);
      const age = n - 1 - i;
      const weight = (MOMENTUM_WINDOW - age) / MOMENTUM_WINDOW;
      momentumRaw[digit] += Math.max(weight, 0.1);
    }
    const momentumScore = normalizeScores(momentumRaw);

    // ── METODE 4: LONG-TERM FREQUENCY ──
    const frequencyRaw = {};
    for (let d = 0; d <= 9; d++) frequencyRaw[d] = 0;
    for (let i = 0; i < n; i++) {
      frequencyRaw[parseInt(results[i][posOut])]++;
    }
    const frequencyScore = normalizeScores(frequencyRaw);

    // ── METODE 5: CONTROLLED GAP ──
    const lastSeen = {};
    const gapRaw = {};
    for (let d = 0; d <= 9; d++) {
      lastSeen[d] = -1;
      gapRaw[d] = 0;
    }
    for (let i = 0; i < n; i++) {
      lastSeen[parseInt(results[i][posOut])] = i;
    }
    for (let d = 0; d <= 9; d++) {
      const gap = lastSeen[d] === -1 ? n : (n - 1 - lastSeen[d]);
      gapRaw[d] = Math.log1p(gap) / Math.log1p(n);
    }
    const gapScore = normalizeScores(gapRaw);

    // ── FINAL POLTAR SCORE ──
    for (let d = 0; d <= 9; d++) {
      scores[d] += markovScore[d] * WEIGHTS.markov;
      scores[d] += recencyScore[d] * WEIGHTS.recency;
      scores[d] += momentumScore[d] * WEIGHTS.momentum;
      scores[d] += frequencyScore[d] * WEIGHTS.frequency;
      scores[d] += gapScore[d] * WEIGHTS.gap;
    }

    // Normalisasi final ke 0-10 agar format UI tetap sama.
    // Mode reverse: angka dengan skor lebih rendah ditampilkan sebagai yang terkuat.
    const normalized = {};
    const maxScore = Math.max(...Object.values(scores)) || 1;
    for (let d = 0; d <= 9; d++) {
      normalized[d] = (scores[d] / maxScore) * 10;
    }

    const sorted = Object.entries(normalized)
      .sort((a, b) => a[1] - b[1])
      .map(([digit, score]) => ({ digit: parseInt(digit), score: parseFloat(score.toFixed(2)) }));

    posData.push({ label: posLabels[posOut], sorted, normalized });
  }

  // BBFS 8D & AI 4D dari gabungan KEP+EKR ikut mode reverse: skor rendah dianggap kuat
  const combined = {};
  for (let d = 0; d <= 9; d++) {
    combined[d] = (posData[2].normalized[d] + posData[3].normalized[d]) / 2;
  }
  const bbfs8 = Object.entries(combined).sort((a, b) => a[1] - b[1])
    .slice(0, 8).map(([d]) => d).sort((a, b) => a - b);
  const ai4 = Object.entries(combined).sort((a, b) => a[1] - b[1])
    .slice(0, 4).map(([d]) => d).sort((a, b) => a - b);

  // Backtest winrate tetap sama sesuai permintaan
  let winBBFS = 0, winAI = 0;
  for (let i = 0; i < transitions; i++) {
    const nxtKep = results[i + 1][2];
    const nxtEkr = results[i + 1][3];
    if (bbfs8.includes(nxtKep) && bbfs8.includes(nxtEkr)) winBBFS++;
    if (ai4.includes(nxtKep) || ai4.includes(nxtEkr)) winAI++;
  }

  return { posData, bbfs8, ai4, winBBFS, winAI, totalTransisi: transitions, dataCount: n };
}
