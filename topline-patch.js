/* TOP LINE compact chip display + numeric ascending copy order + WhatsApp share */
(function () {
  function sortTopLine(lines) {
    return [...(lines || [])]
      .map(line => String(line).padStart(2, '0'))
      .sort((a, b) => Number(a) - Number(b));
  }

  function getCurrentMarketName() {
    const title = document.getElementById('resultTitle')?.textContent || '';
    return title.trim() || 'PASARAN';
  }

  function getCurrentPredictionData() {
    return window.__currentPredictionShareData || { ai4: [], bbfs8: [] };
  }

  window.shareTopLine = function shareTopLine(encodedText, button) {
    const lineText = decodeURIComponent(encodedText || '');
    if (!lineText) return;

    const marketName = getCurrentMarketName();
    const data = getCurrentPredictionData();
    const aiText = Array.isArray(data.ai4) ? data.ai4.join('') : '';
    const bbfsText = Array.isArray(data.bbfs8) ? data.bbfs8.join('') : '';

    const message = [
  ' ✦✦ *ANGKA PRO* ✦✦',
  '━━━━━━━━━━━━━━',
  `${marketName}`,
  '',
  `AI : ${aiText}`,
  `BBFS : ${bbfsText}`,
  'TOP LINE :',
  lineText
].join('\n');

    const url = 'https://wa.me/' + '?text=' + encodeURIComponent(message);
    window.open(url, '_blank', 'noopener,noreferrer');

    if (button) {
      const oldText = button.textContent;
      button.textContent = 'OPEN WA';
      setTimeout(() => {
        button.textContent = oldText || 'BAGIKAN';
      }, 1200);
    }
  };

  if (typeof window.getTopLineData === 'function') {
    const originalGetTopLineData = window.getTopLineData;
    window.getTopLineData = function patchedGetTopLineData(pred, market) {
      window.__currentPredictionShareData = {
        ai4: Array.isArray(pred?.ai4) ? pred.ai4.map(String) : [],
        bbfs8: Array.isArray(pred?.bbfs8) ? pred.bbfs8.map(String) : []
      };
      const data = originalGetTopLineData(pred, market) || { lines: [], text: '' };
      const lines = sortTopLine(data.lines);
      return {
        ...data,
        lines,
        text: lines.join('*')
      };
    };
  }

  window.buildTopLineHTML = function patchedBuildTopLineHTML(topLine) {
    const lines = sortTopLine(topLine?.lines || []);
    const copyText = lines.join('*');
    const encodedText = encodeURIComponent(copyText);
    const chips = lines.length
      ? lines.map(line => `<span class="top-line-chip">${escapeHTML(line)}</span>`).join('')
      : '<span class="top-line-empty">-</span>';

    return `
      <div class="section-title">TOP LINE</div>
      <div class="next-poltar-card top-line-card">
        <div class="top-line-chip-wrap">${chips}</div>
        <div class="top-line-footer">
          <div class="top-line-count">${lines.length} LINE TERPILIH</div>
          <div class="top-line-actions">
            <button class="top-line-copy" onclick="copyTopLine('${encodedText}', this)" type="button" ${copyText ? '' : 'disabled'}>COPY</button>
          </div>
        </div>
        <button class="top-line-share top-line-share-wide" onclick="shareTopLine('${encodedText}', this)" type="button" ${copyText ? '' : 'disabled'}>BAGIKAN KE WHATSAPP</button>
      </div>
    `;
  };

  const style = document.createElement('style');
  style.textContent = `
    .top-line-chip-wrap {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      padding: 10px;
      border-radius: 12px;
      background: rgba(255,255,255,0.032);
      border: 1px solid rgba(255,255,255,0.065);
    }
    .top-line-chip {
      min-width: 34px;
      height: 28px;
      padding: 0 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      background: var(--surface2);
      border: 1px solid rgba(240,192,64,0.18);
      color: var(--strong);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.8px;
      line-height: 1;
    }
    .top-line-empty {
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
    }
    .top-line-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }
    .top-line-share {
      border: 1px solid rgba(240,192,64,0.38);
      background: rgba(240,192,64,0.14);
      color: var(--gold);
      border-radius: 999px;
      padding: 9px 13px;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 1px;
      cursor: pointer;
    }
    .top-line-share-wide {
      width: 100%;
      margin-top: 12px;
      padding: 12px 14px;
      background: linear-gradient(135deg, rgba(240,192,64,0.22), rgba(255,138,0,0.12));
      box-shadow: 0 0 22px rgba(240,192,64,0.10);
    }
    .top-line-share:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .top-line-share:active:not(:disabled) {
      transform: scale(0.96);
    }
  `;
  document.head.appendChild(style);
})();
