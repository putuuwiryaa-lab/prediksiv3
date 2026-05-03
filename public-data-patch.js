/* ============================================
   Public endpoint compatibility patch.
   Keeps UI working with get-public-markets response.
   ============================================ */

function getPublicLastResult(market) {
  if (market?.last_result) return String(market.last_result);

  const tokens = getHistoryTokens(market?.history_data);
  return tokens.length ? tokens[tokens.length - 1] : '----';
}

function getPublicDataCount(market) {
  const count = Number(market?.data_count);
  if (Number.isFinite(count) && count > 0) return count;

  return getHistoryTokens(market?.history_data).length;
}

function buildPublicSnapshot(market) {
  const snapshot = Array.isArray(market?.prediction_snapshot)
    ? (market.prediction_snapshot[0] || {})
    : (market?.prediction_snapshot || {});

  return {
    ai4: snapshot.ai4 || market?.ai4 || [],
    bbfs8: snapshot.bbfs8 || market?.bbfs8 || [],
    poltar_as: snapshot.poltar_as || market?.poltar_as || [],
    poltar_kop: snapshot.poltar_kop || market?.poltar_kop || [],
    poltar_kepala: snapshot.poltar_kepala || market?.poltar_kepala || [],
    poltar_ekor: snapshot.poltar_ekor || market?.poltar_ekor || []
  };
}

function getMarketSnapshot(market) {
  return buildPublicSnapshot(market);
}

function renderMarkets(markets) {
  const list = document.getElementById('marketList');
  if (!markets.length) {
    list.innerHTML = '<div class="empty-state">Tidak ada pasaran ditemukan</div>';
    return;
  }

  list.innerHTML = markets.map((m, i) => {
    const lastResult = getPublicLastResult(m);
    const count = getPublicDataCount(m);
    const dataStatus = count >= 169 ? 'READY' : `${count}/169`;

    return `
      <div class="market-card" data-market-id="${safeId(m.id)}" style="animation-delay:${i * 0.026}s">
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

async function openMarket(id) {
  const market = allMarkets.find(m => String(m.id) === String(id));
  if (!market) return;

  showLoading(`ANALISA ${market.name}...`);
  await sleep(200);

  const results = parseHistory(market.history_data, 169);
  const dataCount = getPublicDataCount(market);
  const hasPublicPrediction =
    toDigitList(market?.bbfs8).length ||
    toDigitList(market?.ai4).length ||
    toDigitList(market?.poltar_kepala).length ||
    toDigitList(market?.poltar_ekor).length ||
    toDigitList(buildPublicSnapshot(market).bbfs8).length;

  if (dataCount < 21 && !hasPublicPrediction) {
    document.getElementById('resultTitle').textContent = market.name;
    document.getElementById('resultBody').innerHTML = buildInsufficientDataHTML(dataCount);
    hideLoading();
    showResultPanel();
    return;
  }

  const prediksi = createDisplayPrediction(market, results);

  document.getElementById('resultTitle').textContent = market.name;
  document.getElementById('resultBody').innerHTML = buildResultHTML(results, prediksi, market);

  hideLoading();
  showResultPanel();
}

fetchMarkets();
