/* TOP LINE compact chip display + numeric ascending copy order */
(function () {
  function sortTopLine(lines) {
    return [...(lines || [])]
      .map(line => String(line).padStart(2, '0'))
      .sort((a, b) => Number(a) - Number(b));
  }

  if (typeof window.getTopLineData === 'function') {
    const originalGetTopLineData = window.getTopLineData;
    window.getTopLineData = function patchedGetTopLineData(pred, market) {
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
          <button class="top-line-copy" onclick="copyTopLine('${encodedText}', this)" type="button" ${copyText ? '' : 'disabled'}>COPY</button>
        </div>
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
  `;
  document.head.appendChild(style);
})();
