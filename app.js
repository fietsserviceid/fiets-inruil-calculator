// ==============================
//  Fiets Inruil Calculator - app.js
//  Versie: 8.0 — 2026-01-26
// ==============================

// ====== Config ======
const LIC_STORAGE_KEY = 'fsid_license_v1';
const CODES_SOURCE = './codes.json';
const DATA_SOURCE  = './data.json';

// ====== Helpers ======
const fmtEUR = (v) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);

async function fetchJSON(url) {
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error('Laden mislukt: ' + url);
  return await resp.json();
}

// ====== Licentie ======
async function fetchLicenseList() { return fetchJSON(CODES_SOURCE); }

function saveLocalLicense(licCode, months = 12) {
  const now = new Date(); const expires = new Date(now);
  expires.setMonth(expires.getMonth() + months);
  const payload = { code: licCode, activatedAt: now.toISOString(), expiresAt: expires.toISOString() };
  localStorage.setItem(LIC_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

function getLocalLicense() {
  try {
    const raw = localStorage.getItem(LIC_STORAGE_KEY);
    if (!raw) return null;
    const lic = JSON.parse(raw);
    if (new Date(lic.expiresAt) < new Date()) { localStorage.removeItem(LIC_STORAGE_KEY); return null; }
    return lic;
  } catch { return null; }
}

async function activateLicenseFromInput() {
  const input = document.getElementById('licCodeInput');
  const msg   = document.getElementById('licMsg');
  msg.textContent = 'Bezig met valideren…';
  try {
    const code = (input.value || '').trim();
    if (!code) throw new Error('Geen code ingevuld');
    const list  = await fetchLicenseList();
    const found = (list.codes || []).find(c => c.code === code && c.active !== false);
    if (!found) throw new Error('Code ongeldig of gedeactiveerd');
    const saved = saveLocalLicense(code, 12);
    msg.textContent = 'Licentie geactiveerd tot ' + new Date(saved.expiresAt).toLocaleDateString('nl-NL');
    closeLicenseGate();
  } catch (e) { msg.textContent = e.message || 'Activatie mislukt'; }
}

async function pasteFromClipboard() {
  const input = document.getElementById('licCodeInput');
  const msg   = document.getElementById('licMsg');
  try {
    const text = await navigator.clipboard.readText();
    input.value = (text || '').trim();
    msg.textContent = 'Code geplakt';
  } catch {
    msg.textContent = 'Plakken wordt door de browser geblokkeerd. Plak handmatig (lang indrukken) of typ de code.';
  }
}

function closeLicenseGate() {
  const gateEl = document.getElementById('licenseGate');
  const banner = document.getElementById('licenseBanner');
  const footer = document.getElementById('licenseFooter');
  if (gateEl) { gateEl.hidden = true; gateEl.style.display = 'none'; }
  if (banner) banner.style.display = 'none';
  if (footer) footer.textContent = '';
}

// ====== Calculator ======
let DATA = null;

function populateSelect(sel, items) {
  sel.innerHTML = '';
  items.forEach((v) => {
    const opt = document.createElement('option');
    if (typeof v === 'string') { opt.value = v; opt.textContent = v; }
    else { opt.value = v.value; opt.textContent = v.label ?? v.value; }
    sel.appendChild(opt);
  });
}

function effectiveHasAccu(typeObj, override) {
  if (override === 'ja') return true;
  if (override === 'nee') return false;
  return !!(typeObj?.has_accu_default);
}

function recalc() {
  if (!DATA) return;

  const typeSel      = document.getElementById('typeSelect');
  const brandSel     = document.getElementById('brandSelect');
  const stateSel     = document.getElementById('stateSelect');
  const accuStateSel = document.getElementById('accuStateSelect');
  const hasAccuSel   = document.getElementById('hasAccuSelect');
  const ageInput     = document.getElementById('ageInput');
  const priceInput   = document.getElementById('priceInput');

  const typeName = typeSel.value;
  const typeObj  = DATA.types.find(t => t.type === typeName);

  const override = hasAccuSel.value;
  const hasAccu  = effectiveHasAccu(typeObj, override);

  const refPrice =
    parseFloat(priceInput.value) > 0 ? parseFloat(priceInput.value) : (typeObj?.ref_price || 0);

  const age = Math.min(15, Math.max(0, parseInt(ageInput.value || '0', 10)));

  const restTab     = hasAccu ? DATA.restwaarde.metaccu : DATA.restwaarde.zonderaccu;
  const ageFactor   = Number(restTab[String(age)] || 0);
  const stateFactor = Number(DATA.cond_factors[stateSel.value] || 1);
  const brandFactor = Number((DATA.brands[typeName] || {})[brandSel.value] || 1);
  const accuFactor  = hasAccu ? Number(DATA.accu_state_factors[accuStateSel.value] || 1) : 1;

  let value = refPrice * ageFactor * stateFactor * brandFactor * accuFactor;
  value = Math.max(0, Math.round(value));

  document.getElementById('resultValue').textContent = fmtEUR(value);
  document.getElementById('factorAge').textContent   = ageFactor.toFixed(2);
  document.getElementById('factorState').textContent = stateFactor.toFixed(2);
  document.getElementById('factorAccu').textContent  = accuFactor.toFixed(2);
  document.getElementById('factorBrand').textContent = brandFactor.toFixed(2);

  document.getElementById('resultCard').hidden = false;

  document.getElementById('offerType').textContent  = typeName;
  document.getElementById('offerBrand').textContent = brandSel.value;
  document.getElementById('offerState').textContent = stateSel.value;
  document.getElementById('offerAge').textContent   = age + ' jaar';
  document.getElementById('offerTotal').textContent = fmtEUR(value);
  document.getElementById('offerDate').textContent  = new Date().toLocaleDateString('nl-NL');
}

async function initData() {
  DATA = await fetchJSON(DATA_SOURCE);

  const typeSel      = document.getElementById('typeSelect');
  const brandSel     = document.getElementById('brandSelect');
  const stateSel     = document.getElementById('stateSelect');
  const accuStateSel = document.getElementById('accuStateSelect');
  const hasAccuSel   = document.getElementById('hasAccuSelect');
  const refHint      = document.getElementById('refPriceHint');
  const accuWrap     = document.getElementById('accuStateWrap');

  populateSelect(typeSel,      DATA.types.map(t => t.type));
  populateSelect(stateSel,     Object.keys(DATA.cond_factors));
  populateSelect(accuStateSel, Object.keys(DATA.accu_state_factors));

  function updateTypeDependent() {
    const t        = DATA.types.find(x => x.type === typeSel.value);
    const override = hasAccuSel.value;
    const hasAccu  = effectiveHasAccu(t, override);

    const brandsForType = Object.keys(DATA.brands[typeSel.value] || { Overig: 1 });
    populateSelect(brandSel, brandsForType);

    refHint.textContent = 'Referentieprijs voor ' + typeSel.value + ': ' + fmtEUR(t?.ref_price || 0);
    accuWrap.style.display = hasAccu ? 'block' : 'none';
  }

  typeSel.addEventListener('change', updateTypeDependent);
  hasAccuSel.addEventListener('change', updateTypeDependent);
  updateTypeDependent();

  document.getElementById('calcBtn').addEventListener('click', recalc);
  document.getElementById('printOfferBtn').addEventListener('click', () => window.print());
  document.getElementById('year').textContent = new Date().getFullYear();
}

// ====== Licentie UI Bindings ======
function bindLicenseUI() {
  const actBtn   = document.getElementById('activateLicBtn') || document.getElementById('licActivateBtn');
  const pasteBtn = document.getElementById('pasteLicBtn')    || document.getElementById('licPasteBtn');
  const input    = document.getElementById('licCodeInput');
  const form     = document.getElementById('licForm');

  actBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); activateLicenseFromInput(); });
  pasteBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); pasteFromClipboard(); });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); activateLicenseFromInput(); } });
  form?.addEventListener('submit', (e) => { e.preventDefault(); activateLicenseFromInput(); });
}

// ====== iOS viewport fix ======
(function iosViewportPolyfill(){
  const supportsDvh = CSS && CSS.supports && CSS.supports('height', '100dvh');
  if (supportsDvh) return;
  function setVh(){ const vh = window.innerHeight * 0.01; document.documentElement.style.setProperty('--vh', vh + 'px'); }
  setVh(); window.addEventListener('resize', setVh); window.addEventListener('orientationchange', setVh);
})();

// ====== PWA Install Button Manager ======
(function installButtonManager(){
  const installBtn = document.getElementById('installBtn');
  const banner     = document.getElementById('licenseBanner');
  let deferredPrompt = null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function hideInstall(){ if (installBtn) installBtn.hidden = true; }
  function showInstall(){ if (installBtn) installBtn.hidden = false; }

  function updateInstallVisibility() {
    if (isStandalone() || localStorage.getItem('pwaInstalled') === '1') {
      hideInstall();
      return;
    }
    if (isIOS) {
      if (banner) {
        banner.innerHTML = 'Op iPhone: tik <strong>Deel</strong> ▸ <strong>Zet op beginscherm</strong>.';
        banner.style.display = 'block';
      }
      hideInstall();
    } else {
      if (deferredPrompt) showInstall(); else hideInstall();
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateInstallVisibility();
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {}
    deferredPrompt = null;
    updateInstallVisibility();
  });

  window.addEventListener('appinstalled', () => {
    localStorage.setItem('pwaInstalled', '1');
    deferredPrompt = null;
    updateInstallVisibility();
  });

  document.addEventListener('DOMContentLoaded', updateInstallVisibility);
  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateInstallVisibility(); });
  setTimeout(updateInstallVisibility, 1000);
})();

// ====== App Boot ======
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const list  = await fetchLicenseList();
    const price = (list.price_eur_per_year ?? 99).toFixed(2);
    const priceHeader = document.getElementById('licensePriceHeader');
    const priceBody   = document.getElementById('licensePriceBody');
    if (priceHeader) priceHeader.textContent = price;
    if (priceBody)   priceBody.textContent   = price;
  } catch {}

  const lic   = getLocalLicense();
  const gateEl= document.getElementById('licenseGate');
  const banner= document.getElementById('licenseBanner');
  const footer= document.getElementById('licenseFooter');

  if (!lic) {
    if (gateEl) gateEl.hidden = false;
    if (banner) { banner.textContent = 'Licentie vereist voor gebruik.'; banner.style.display = 'block'; }
    if (footer) footer.textContent = '';
  } else {
    closeLicenseGate();
  }

  bindLicenseUI();
  await initData();
});
