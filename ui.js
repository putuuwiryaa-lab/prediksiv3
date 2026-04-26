/* ============================================
   PREDIKSI 4D PRO - ui.js
   User Interface & DOM Manipulations
   ============================================ */

const DOT_COLORS = [
  '#f0c040','#40c0f0','#f04060','#a040f0',
  '#40f0a0','#f08040','#40a0f0','#f040c0',
  '#80f040','#4080f0','#f0a040','#00c8a0'
];

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
// UI INTERACTIONS
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
  document.getElementById('resultSubtitle').textContent = ""; 
  document.getElementById('resultBody').innerHTML = buildResultHTML(results, prediksi, market);

  hideLoading();
  document.getElementById('resultPanel').classList.add('show');
}

function closeResult() {
  document.getElementById('resultPanel').classList.remove('show');
}

function showLoading(txt) {
  document.getElementById('loadingText').textContent = txt;
  document.getElementById('loadingScreen').classList.add('show');
}

function hideLoading() {
  document.getElementById('loadingScreen').classList.remove('show');
}

// ════════════════════════════════════════════
// BUILD RESULT HTML (CHART ATAS, ANGKA BAWAH)
// ════════════════════════════════════════════
function buildResultHTML(results, pred, market) {
  const posColors = ['var(--accent)', 'var(--accent2)', 'var(--accent4)', 'var(--accent3)'];

  // 1. GENERATE CHARTS (BAGIAN ATAS)
  const chartsHTML = pred.posData.map((pos, pi) => {
    const maxScore = pos.sorted[0].score || 1;
    
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
// INIT SISTEM 
// (Menjalankan fungsi fetch dari engine.js)
// ════════════════════════════════════════════
fetchMarkets();
