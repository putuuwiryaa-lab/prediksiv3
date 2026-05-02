/* ============================================
   ANGKA PRO - Favorite Markets
   Local per-device favorite market support.
   ============================================ */

const FAVORITE_MARKETS_STORAGE_KEY = 'angka_pro_favorite_markets';

function getFavoriteMarketIds() {
  try {
    const raw = localStorage.getItem(FAVORITE_MARKETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch (_) {
    return [];
  }
}

function saveFavoriteMarketIds(ids) {
  localStorage.setItem(FAVORITE_MARKETS_STORAGE_KEY, JSON.stringify(ids));
}

function isFavoriteMarket(marketId) {
  return getFavoriteMarketIds().includes(String(marketId));
}

function toggleFavoriteMarket(marketId) {
  const id = String(marketId);
  const current = getFavoriteMarketIds();
  const next = current.includes(id)
    ? current.filter(item => item !== id)
    : [id, ...current];

  saveFavoriteMarketIds(next);

  const q = document.getElementById('searchBox')?.value?.toLowerCase() || '';
  const filtered = allMarkets.filter(m => String(m.name || '').toLowerCase().includes(q));
  renderMarkets(filtered);
}

function sortFavoriteMarkets(markets) {
  const favorites = new Set(getFavoriteMarketIds());
  const favoriteMarkets = [];
  const regularMarkets = [];

  markets.forEach(market => {
    if (favorites.has(String(market.id))) favoriteMarkets.push(market);
    else regularMarkets.push(market);
  });

  // Penting: jangan sort berdasarkan nama/order di sini.
  // Urutan asli dari scraper harus tetap dipertahankan.
  return [...favoriteMarkets, ...regularMarkets];
}

function buildFavoriteButton(market) {
  const active = isFavoriteMarket(market.id);
  const title = active ? 'Hapus dari favorit' : 'Tambah ke favorit';
  return `
    <button class="favorite-btn ${active ? 'active' : ''}" data-favorite-id="${safeId(market.id)}" type="button" title="${title}" aria-label="${title}">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36 6.3 20.36l1.09-6.35-4.62-4.5 6.38-.93L12 2.8z"></path>
      </svg>
    </button>
  `;
}

function renderMarkets(markets) {
  const list = document.getElementById('marketList');
  const sortedMarkets = sortFavoriteMarkets(markets);

  if (!sortedMarkets.length) {
    list.innerHTML = '<div class="empty-state">Tidak ada pasaran ditemukan</div>';
    return;
  }

  list.innerHTML = sortedMarkets.map((m, i) => {
    const tokens = getHistoryTokens(m.history_data);
    const lastResult = tokens.length ? tokens[tokens.length - 1] : '----';
    const dataStatus = tokens.length >= 169 ? 'READY' : `${tokens.length}/169`;
    const favorite = isFavoriteMarket(m.id);

    return `
      <div class="market-card ${favorite ? 'favorite-market' : ''}" data-market-id="${safeId(m.id)}" style="animation-delay:${i * 0.026}s">
        ${buildFavoriteButton(m)}
        <div class="market-top">
          <div class="dot" style="background:${DOT_COLORS[i % DOT_COLORS.length]}"></div>
          <div class="market-name">${escapeHTML(m.name)}</div>
        </div>
        <div class="market-result">${escapeHTML(lastResult)}</div>
        <div class="market-meta">${favorite ? 'FAVORIT' : `DATA: ${escapeHTML(dataStatus)}`}</div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.market-card').forEach(card => {
    card.addEventListener('click', () => openMarket(decodeURIComponent(card.dataset.marketId || '')));
  });

  list.querySelectorAll('.favorite-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      toggleFavoriteMarket(decodeURIComponent(button.dataset.favoriteId || ''));
    });
  });
}

function filterMarkets() {
  const q = document.getElementById('searchBox').value.toLowerCase();
  const filtered = allMarkets.filter(m => String(m.name || '').toLowerCase().includes(q));
  renderMarkets(filtered);
}

window.renderMarkets = renderMarkets;
window.filterMarkets = filterMarkets;
window.toggleFavoriteMarket = toggleFavoriteMarket;

if (Array.isArray(window.allMarkets) && window.allMarkets.length) {
  renderMarkets(window.allMarkets);
}
