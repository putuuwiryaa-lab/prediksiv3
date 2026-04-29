const SUPPORT_WA_NUMBER = '6285792030642';

function supportWhatsappUrl(type) {
  const isBug = type === 'bug';
  const text = isBug
    ? `Halo Admin ANGKA PRO, saya ingin melaporkan bug/error.\n\nPasaran:\nMasalah:\nScreenshot:\nDevice:`
    : `Halo Admin ANGKA PRO, saya ingin memberi kritik/saran.\n\nSaran:\nBagian aplikasi:`;
  return `https://wa.me/${SUPPORT_WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

function openSupportCenter() {
  const overlay = document.getElementById('supportOverlay');
  if (overlay) overlay.classList.add('show');
}

function closeSupportCenter() {
  const overlay = document.getElementById('supportOverlay');
  if (overlay) overlay.classList.remove('show');
}

function openSupportWhatsapp(type) {
  window.open(supportWhatsappUrl(type), '_blank', 'noopener,noreferrer');
  closeSupportCenter();
}

function setupSupportCenter() {
  if (document.getElementById('supportFab')) return;

  const fab = document.createElement('button');
  fab.id = 'supportFab';
  fab.className = 'support-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Support Center');
  fab.innerHTML = '<span class="support-fab-icon">✦</span><span>SUPPORT</span>';
  fab.addEventListener('click', openSupportCenter);

  const overlay = document.createElement('div');
  overlay.id = 'supportOverlay';
  overlay.className = 'support-overlay';
  overlay.innerHTML = `
    <div class="support-sheet" role="dialog" aria-modal="true" aria-label="Support Center">
      <div class="support-sheet-head">
        <div>
          <div class="support-sheet-title">SUPPORT CENTER</div>
          <div class="support-sheet-subtitle">Laporkan kendala atau kirim masukan untuk pengembangan ANGKA PRO.</div>
        </div>
        <button class="support-close" type="button" aria-label="Tutup">×</button>
      </div>
      <button class="support-option" type="button" data-support-type="bug">
        <span class="support-option-icon">⚠</span>
        <span>
          <span class="support-option-title">BUG / ERROR</span>
          <span class="support-option-desc">Laporkan kendala aplikasi, data, atau tampilan.</span>
        </span>
      </button>
      <button class="support-option" type="button" data-support-type="suggestion">
        <span class="support-option-icon">✦</span>
        <span>
          <span class="support-option-title">KRITIK & SARAN</span>
          <span class="support-option-desc">Kirim masukan untuk fitur dan pengalaman aplikasi.</span>
        </span>
      </button>
    </div>
  `;

  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeSupportCenter();
  });

  overlay.querySelector('.support-close')?.addEventListener('click', closeSupportCenter);
  overlay.querySelectorAll('[data-support-type]').forEach(button => {
    button.addEventListener('click', () => openSupportWhatsapp(button.getAttribute('data-support-type')));
  });

  document.body.appendChild(fab);
  document.body.appendChild(overlay);
}

function syncSupportVisibility() {
  const fab = document.getElementById('supportFab');
  if (!fab) return;
  const shouldShow = !document.getElementById('resultPanel')?.classList.contains('show')
    && !document.getElementById('historyPage')?.classList.contains('show');
  fab.style.display = shouldShow ? 'inline-flex' : 'none';
  if (!shouldShow) closeSupportCenter();
}

window.openSupportCenter = openSupportCenter;
window.closeSupportCenter = closeSupportCenter;
window.openSupportWhatsapp = openSupportWhatsapp;

window.addEventListener('load', () => {
  setupSupportCenter();
  syncSupportVisibility();
  setInterval(syncSupportVisibility, 400);
});
