
/* =====================================================
   FSID – APP.JS (definitief)
   - Laadt data.json
   - Vult UI dropdowns
   - Berekent inruilwaarde (originele formule)
   - Vult offerte & footer (dealer)
   - Werkt samen met installatie-gate
   ===================================================== */

'use strict';

let APPDATA = null;
const fmt = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

// Kleine helper
const $ = (id) => document.getElementById(id);

/* -----------------------------------------------------
   1) Start: laad data.json en initialiseer UI
   ----------------------------------------------------- */
async function load() {
  try {
    // Laad data.json (no-cache om verouderde SW-caches te vermijden)
    const res = await fetch('./data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`data.json niet gevonden (${res.status})`);
    APPDATA = await res.json();

    initUI();
    injectDealerFromLocalStorage();
  } catch (err) {
    console.error('Kon data.json niet laden:', err);
    const hint = $('refPriceHint');
    if (hint) {
      hint.textContent = 'Kon data niet laden. Vernieuw de pagina of controleer data.json.';
    }
  }
}

/* -----------------------------------------------------
   2) UI initialisatie
   ----------------------------------------------------- */
function initUI() {
  if (!APPDATA) return;

  // Type
  const typeSel = $('typeSelect');
  if (typeSel) {
    typeSel.innerHTML = '';
    APPDATA.types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.type;
      opt.textContent = t.type;
      typeSel.appendChild(opt);
    });
  }

  // Staat (conditie)
  const states = Object.keys(APPDATA.cond_factors || {});
  const stateSel = $('stateSelect');
  if (stateSel) {
    stateSel.innerHTML = '';
    states.forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      stateSel.appendChild(o);
    });
  }

  // Accu-staat
  const accuStates = Object.keys(APPDATA.accu_state_factors || {});
  const accuSel = $('accuStateSelect');
  if (accuSel) {
    accuSel.innerHTML = '';
    accuStates.forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      accuSel.appendChild(o);
    });
  }

  // Listeners
  if (typeSel) typeSel.addEventListener('change', onTypeChange);
  const hasAccuSel = $('hasAccuSelect');
  if (hasAccuSel) hasAccuSel.addEventListener('change', updateAccuVisibility);

  // Alleen listener toevoegen als er géén inline onclick staat
  const calcBtn = $('calcBtn');
  if (calcBtn && !calcBtn.getAttribute('onclick')) {
    calcBtn.addEventListener('click', calculate);
  }

  const printBtn = $('printOfferBtn');
  if (printBtn) {
    printBtn.addEventListener('click', showOffer);
  }

  // Eerste state
  onTypeChange();
  updateAccuVisibility();

  // Jaar in footer
  const yearEl = $('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* -----------------------------------------------------
   3) Type-wijziging → merken + referentieprijs
   ----------------------------------------------------- */
function onTypeChange() {
  if (!APPDATA) return;

  const t = $('typeSelect')?.value;
  const brandsMap = (APPDATA.brands && t) ? (APPDATA.brands[t] || {}) : {};
  const brandSel = $('brandSelect');

  if (brandSel) {
    brandSel.innerHTML = '';
    Object.keys(brandsMap).forEach(b => {
      const o = document.createElement('option');
      o.value = b;
      o.textContent = b;
      brandSel.appendChild(o);
    });
    if (!brandSel.value && brandSel.options.length > 0) {
      brandSel.value = brandSel.options[0].value;
    }
  }

  // Referentieprijs-hint
  const tcfg = APPDATA.types.find(x => x.type === t);
  const hint = $('refPriceHint');
  if (hint && tcfg) {
    hint.textContent = `Referentie nieuwprijs voor ${t}: € ${Math.round(tcfg.ref_price).toLocaleString('nl-NL')}`;
  }
}

/* -----------------------------------------------------
   4) Accu-veld tonen/verbergen
   ----------------------------------------------------- */
function updateAccuVisibility() {
  if (!APPDATA) return;

  const wrap = $('accuStateWrap');
  const t = $('typeSelect')?.value;
  const tcfg = APPDATA.types.find(x => x.type === t);
  const override = $('hasAccuSelect')?.value; // auto/ja/nee

  let hasAccu = tcfg?.has_accu_default;
  if (override === 'ja') hasAccu = true;
  else if (override === 'nee') hasAccu = false;

  if (wrap) wrap.style.display = hasAccu ? 'flex' : 'none';
}

/* -----------------------------------------------------
   5) BEREKENING – jouw originele formule
   ----------------------------------------------------- */
function calculate() {
  if (!APPDATA) return;

  const t         = $('typeSelect')?.value;
  const brand     = $('brandSelect')?.value;
  const state     = $('stateSelect')?.value;
  const accuState = $('accuStateSelect')?.value;

  const ageRaw = $('ageInput')?.value || '0';
  const age = Math.max(0, Math.min(15, parseInt(ageRaw, 10)));

  const priceInput = $('priceInput')?.value;
  const tcfg = APPDATA.types.find(x => x.type === t);
  const price = priceInput ? parseFloat(priceInput) : (tcfg?.ref_price || 0);

  // Heeft deze fiets (nu) een accu?
  const override = $('hasAccuSelect')?.value; // auto/ja/nee
  let hasAccu = tcfg?.has_accu_default;
  if (override === 'ja') hasAccu = true;
  else if (override === 'nee') hasAccu = false;

  // Factoren
  const ageFactor   = (APPDATA.restwaarde?.zonderaccu?.[age]) ?? 0;        // leeftijdsfactor
  const condFactor  = (APPDATA.cond_factors?.[state]) ?? 1;                 // conditie
  const accuFactor  = hasAccu ? ((APPDATA.accu_state_factors?.[accuState]) ?? 1) : 1; // accu
  const brandFactor =
    (APPDATA.brands?.[t] && APPDATA.brands[t][brand])
      ? APPDATA.brands[t][brand]
      : (APPDATA.brands?.[t]?.Overig ?? 0.85);

  // Waarde
  let value = price * ageFactor * condFactor * accuFactor * brandFactor;
  const rounded = Math.round(value);

  // UI – resultaat
  const resultValue = $('resultValue');
  const resultCard  = $('resultCard');
  if (resultValue) resultValue.textContent = fmt.format(rounded);
  if (resultCard)  resultCard.hidden = false;

  // UI – detailfactoren
  const setTxt = (id, v) => { const el = $(id); if (el) el.textContent = (v ?? 0).toLocaleString('nl-NL'); };
  setTxt('factorAge',   ageFactor);
  setTxt('factorState', condFactor);
  setTxt('factorAccu',  accuFactor);
  setTxt('factorBrand', brandFactor);

  // UI – offertevelden
  const offerStateTxt = hasAccu ? `${state}, accustaat: ${accuState}` : state;
  const d = new Date(), pad = (n) => String(n).padStart(2, '0');

  const mapOffer = {
    offerType:  t,
    offerBrand: brand,
    offerState: offerStateTxt,
    offerAge:   `${age} jaar`,
    offerTotal: fmt.format(rounded),
    offerDate:  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  };

  Object.entries(mapOffer).forEach(([id, val]) => { const el = $(id); if (el) el.textContent = val; });
}

/* -----------------------------------------------------
   6) Offerte tonen
   ----------------------------------------------------- */
function showOffer() {
  const card = $('offerCard');
  if (card) {
    card.scrollIntoView({ behavior: 'smooth' });
    card.classList.add('print');
  }
}

/* -----------------------------------------------------
   7) Dealer uit installatie in footer & offerte
   ----------------------------------------------------- */
function injectDealerFromLocalStorage() {
  try {
    const meta = JSON.parse(localStorage.getItem('fsid_install_meta') || 'null');
    if (!meta || !meta.dealer) return;

    const footer = $('dealerFooter');
    if (footer) footer.textContent = `Dealer: ${meta.dealer}`;

    const offerDealer = $('offerDealer');
    if (offerDealer) offerDealer.textContent = `Dealer: ${meta.dealer}`;
  } catch (e) {
    console.warn('Kon dealer/meta niet lezen', e);
  }
}

/* -----------------------------------------------------
   8) PWA-install prompt (optioneel, zoals in oude versie)
   ----------------------------------------------------- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = $('installBtn');
  if (!btn) return;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
});

/* -----------------------------------------------------
   9) Start de app
   ----------------------------------------------------- */
window.addEventListener('load', load);
