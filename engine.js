/* ============================================
   ANGKA PRO - engine.js
   Public display layer only.
   Prediction logic is not shipped to the browser.
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

function snapshotDigits(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map(v => String(v).trim())
    .filter(v => /^\d$/.test(v));
}

function uniqueDigits(values) {
  const seen = new Set();
  const output = [];
  values.forEach(value => {
    const digit = String(value).trim();
    if (/^\d$/.test(digit) && !seen.has(digit)) {
      seen.add(digit);
      output.push(digit);
    }
  });
  return output;
}

function completeDigitList(values) {
  const digits = uniqueDigits(values);
  for (let d = 0; d <= 9; d++) {
    const digit = String(d);
    if (!digits.includes(digit)) digits.push(digit);
  }
  return digits.slice(0, 10);
}

function buildDisplayPosition(label, values) {
  const digits = completeDigitList(values);
  const normalized = {};
  const sorted = digits.map((digit, index) => {
    normalized[digit] = index;
    return { digit: Number(digit), score: index };
  });

  return { label, sorted, normalized };
}

function createDisplayPrediction(market, results) {
  const snapshot = market?.prediction_snapshot || {};

  const poltarAs = snapshotDigits(snapshot.poltar_as);
  const poltarKop = snapshotDigits(snapshot.poltar_kop);
  const poltarKepala = snapshotDigits(snapshot.poltar_kepala);
  const poltarEkor = snapshotDigits(snapshot.poltar_ekor);

  const posData = [
    buildDisplayPosition('AS', poltarAs),
    buildDisplayPosition('KOP', poltarKop),
    buildDisplayPosition('KEPALA', poltarKepala),
    buildDisplayPosition('EKOR', poltarEkor)
  ];

  const fallbackBBFS = uniqueDigits([...poltarKepala, ...poltarEkor]).slice(0, 8);
  const bbfs8 = (snapshotDigits(snapshot.bbfs8).length ? snapshotDigits(snapshot.bbfs8) : fallbackBBFS)
    .slice(0, 8)
    .sort((a, b) => Number(a) - Number(b));

  const fallbackAI = bbfs8.slice(0, 4);
  const ai4 = (snapshotDigits(snapshot.ai4).length ? snapshotDigits(snapshot.ai4) : fallbackAI)
    .slice(0, 4)
    .sort((a, b) => Number(a) - Number(b));

  return {
    posData,
    bbfs8,
    ai4,
    winBBFS: 0,
    winAI: 0,
    totalTransisi: Math.max(0, (results || []).length - 1),
    dataCount: (results || []).length,
    snapshotOnly: true
  };
}
