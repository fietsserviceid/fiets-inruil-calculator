// Fiets Inruil Calculator – app.js (km-stand + lokale bronnen, activatie ongewijzigd)
const LIC_STORAGE_KEY = 'fsid_license_v1';
const CODES_SOURCE = '/codes.json';
const DATA_SOURCE  = '/data.json';

const fmtEUR = (v) =>
  new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);

async function fetchJSON(url) {
  const resp = await fetch(url, { cache: 'no-cache' });
  if (!resp.ok) throw new Error('Laden mislukt: ' + url);
  return await resp.json();
}

function getKmStandFactor(km, factors) {
  if (typeof km !== 'number' || isNaN(km) || km < 0) return 1.0;
  // factors: [{max_km, factor}, ...] oplopend
  for (const band of factors || []) {
    if (band.max_km === null) return band.factor; // catch-all boven de hoogste waarde
    if (km <= band.max_km) return band.factor;
  }
  return 1.0;
}

// ------------------- Licentie (ongewijzigd) -------------------
async function fetchLicenseList() { return fetchJSON(CODES_SOURCE); }

function saveLocalLicense(licCode, months = 12) {
  const now = new Date();
  const expires = new Date(now);
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
    if (new Date(lic.expiresAt) < new Date()) {
      localStorage.removeItem(LIC_STORAGE_KEY);
      return null;
    }
    return lic;
  } catch {
    return null;
  }
}
async function activateLicenseFromInput() {
  const input = document.getElementById('licCodeInput');
  const msg = document.getElementById('licMsg');
  msg.textContent = 'Bezig met valideren…';
  try {
    const code = (input.value || '').trim();
    if (!code) throw new Error('Geen code ingevuld');
    const list = await fetchLicenseList();
    const found = (list.codes || []).find(c => c.code === code && c.active !== false);
    if (!found) throw new Error('Code ongeldig of gedeactiveerd');
    const saved = saveLocalLicense(code, 12);
    msg.textContent = 'Licentie geactiveerd tot ' + new Date(saved.expiresAt).toLocaleDateString('nl-NL');
    closeLicenseGate();
  } catch (e) {
    msg.textContent = e.message || 'Activatie mislukt';
  }
}
async function pasteFromClipboard() {
  const input = document.getElementById('licCodeInput');
  const msg = document.getElementById('licMsg');
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
// ---------------------------------------------------------------

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
  const typeSel = document.getElementById('typeSelect');
  const brandSel = document.getElementById('brandSelect');
  const stateSel = document.getElementById('stateSelect');
  const accuStateSel = document.getElementById('accuStateSelect');
  const hasAccuSel = document.getElementById('hasAccuSelect');
  const ageInput = document.getElementById('ageInput');
  const priceInput = document.getElementById('priceInput');
  const kmStandInput = document.getElementById('kmStandInput');

  const typeName = typeSel.value;
  const typeObj = DATA.types.find(t => t.type === typeName);
  const override = hasAccuSel.value;
  const hasAccu = effectiveHasAccu(typeObj, override);

  const refPrice = parseFloat(priceInput.value) > 0 ? parseFloat(priceInput.value) : (typeObj?.ref_price || 0);
  const age = Math.min(15, Math.max(0, parseInt(ageInput.value || '0', 10)));
  const restTab = hasAccu ? DATA.restwaarde.metaccu : DATA.restwaarde.zonderaccu;
  const ageFactor = Number(restTab[String(age)] || 0);
  const stateFactor = Number(DATA.cond_factors[stateSel.value] || 1);
  const brandFactor = Number((DATA.brands[typeName] || {})[brandSel.value] || 1);
  const accuFactor = hasAccu ? Number(DATA.accu_state_factors[accuStateSel.value] || 1) : 1;

  // Km-stand factor: alleen bij elektrische types (has_accu_default true)
  const isElectricType = !!(typeObj?.has_accu_default);
  const km = kmStandInput ? parseInt(kmStandInput.value || '0', 10) : 0;
  const kmFactor = isElectricType ? getKmStandFactor(km, DATA.km_stand_factors || []) : 1.0;

  let value = refPrice * ageFactor * stateFactor * brandFactor * accuFactor * kmFactor;
  value = Math.max(0, Math.round(value));

  document.getElementById('resultValue').textContent = fmtEUR(value);
  document.getElementById('factorAge').textContent = ageFactor.toFixed(2);
  document.getElementById('factorState').textContent = stateFactor.toFixed(2);
  document.getElementById('factorAccu').textContent = accuFactor.toFixed(2);
  document.getElementById('factorBrand').textContent = brandFactor.toFixed(2);
  const kmEl = document.getElementById('factorKmStand');
  if (kmEl) kmEl.textContent = kmFactor.toFixed(2);

  // (optioneel: velden voor offerte kunnen hier ook gezet worden)
  document.getElementById('resultCard').hidden = false;
}

async function initData() {
  DATA = await fetchJSON(DATA_SOURCE);

  const typeSel = document.getElementById('typeSelect');
  const brandSel = document.getElementById('brandSelect');
  const stateSel = document.getElementById('stateSelect');
  const accuStateSel = document.getElementById('accuStateSelect');
  const hasAccuSel = document.getElementById('hasAccuSelect');
  const refHint = document.getElementById('refPriceHint');
  const accuWrap = document.getElementById('accuStateWrap');
  const kmWrap = document.getElementById('kmStandWrap');

  populateSelect(typeSel, DATA.types.map(t => t.type));
  populateSelect(stateSel, Object.keys(DATA.cond_factors));
  populateSelect(accuStateSel, Object.keys(DATA.accu_state_factors));

  function updateTypeDependent() {
    const t = DATA.types.find(x => x.type === typeSel.value);
    const override = hasAccuSel.value;
    const hasAccu = effectiveHasAccu(t, override);
    const brandsForType = Object.keys(DATA.brands[typeSel.value] || { Overig: 1 });
    populateSelect(brandSel, brandsForType);
    refHint.textContent = 'Referentieprijs voor ' + typeSel.value + ': ' + fmtEUR(t?.ref_price || 0);
    accuWrap.style.display = hasAccu ? 'block' : 'none';

    // Km-stand veld alleen tonen bij elektrische types
    if (kmWrap) {
      const isElectricType = !!(t?.has_accu_default);
      kmWrap.style.display = isElectricType ? 'block' : 'none';
    }
  }

  typeSel.addEventListener('change', updateTypeDependent);
  hasAccuSel.addEventListener('change', updateTypeDependent);
  updateTypeDependent();

  document.getElementById('calcBtn').addEventListener('click', recalc);
  document.getElementById('year').textContent = new Date().getFullYear();

  // (optioneel) printknop
  const printBtn = document.getElementById('printOfferBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
}

function bindLicenseUI() {
  const actBtn = document.getElementById('activateLicBtn');
  const pasteBtn = document.getElementById('pasteLicBtn');
  const input = document.getElementById('licCodeInput');
  actBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); activateLicenseFromInput(); });
  pasteBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); pasteFromClipboard(); });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); activateLicenseFromInput(); } });
}

// PWA install‑hint beheer (ongewijzigd)
(function installButtonManager(){
  const installBtn = document.getElementById('installBtn');
  const banner     = document.getElementById('licenseBanner');
  let deferredPrompt = null;

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // iOS
  }

  function hideInstall(){ if (installBtn) installBtn.hidden = true; }
  function showInstall(){ if (installBtn) installBtn.hidden = false; }

  function updateInstallVisibility(){
    // 1) Als we standalone draaien: altijd verbergen + markeer als geïnstalleerd
    if (isStandalone()) {
      try { localStorage.setItem('pwaInstalled', '1'); } catch {}
      hideInstall();
      return;
    }

    // 2) Als we al markeerden als geïnstalleerd: verbergen
    if (localStorage.getItem('pwaInstalled') === '1') {
      hideInstall();
      return;
    }

    // 3) iOS: geen beforeinstallprompt/appinstalled -> toon instructie, verberg knop
    if (isIOS) {
      if (banner) {
        banner.innerHTML = 'Op iPhone: tik <strong>Deel</strong> ▸ <strong>Zet op beginscherm</strong>.';
        banner.style.display = 'block';
      }
      hideInstall();
      return;
    }

    // 4) Android/desktop (Chromium): knop alleen tonen als prompt beschikbaar is
    if (deferredPrompt) showInstall();
    else hideInstall();
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
      try { localStorage.setItem('pwaInstalled', '1'); } catch {}
    } catch {}
    deferredPrompt = null;
    updateInstallVisibility();
  });

  window.addEventListener('appinstalled', () => {
    try { localStorage.setItem('pwaInstalled', '1'); } catch {}
    deferredPrompt = null;
    updateInstallVisibility();
  });

  document.addEventListener('DOMContentLoaded', updateInstallVisibility);
  window.addEventListener('pageshow', updateInstallVisibility);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') updateInstallVisibility();
  });

  setTimeout(updateInstallVisibility, 500);
  setTimeout(updateInstallVisibility, 1500);
})();

// Opstart
window.addEventListener('DOMContentLoaded', async () => {
  // Prijs uit codes.json (ongewijzigd gedrag)
  try {
    const list = await fetchLicenseList();
    const price = (list.price_eur_per_year ?? 99).toFixed(2);
    const priceHeader = document.getElementById('licensePriceHeader');
    const priceBody = document.getElementById('licensePriceBody');
    if (priceHeader) priceHeader.textContent = price;
    if (priceBody) priceBody.textContent = price;
  } catch {}

  // Licentie overlay tonen of verbergen (ongewijzigd)
  const lic = getLocalLicense();
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
