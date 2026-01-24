
let APPDATA = null;
const fmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Optionele bedrijfsregels (uit): zet waarden om te activeren
const MIN_INRUIL = null;        // bijv. 25
const MAX_PCT_VAN_NIEUW = null; // bijv. 0.9

async function load() {
  const res = await fetch('./data.json');
  APPDATA = await res.json();
  initUI();
}

function initUI() {
  const typeSel = document.getElementById('typeSelect');
  typeSel.innerHTML = '';
  (APPDATA.types || []).forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.type; opt.textContent = t.type; typeSel.appendChild(opt);
  });

  const states = Object.keys(APPDATA.cond_factors || {});
  const stateSel = document.getElementById('stateSelect');
  stateSel.innerHTML = '';
  states.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; stateSel.appendChild(o); });

  const accuStates = Object.keys(APPDATA.accu_state_factors || {});
  const accuSel = document.getElementById('accuStateSelect');
  accuSel.innerHTML = '';
  accuStates.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; accuSel.appendChild(o); });

  document.getElementById('typeSelect').addEventListener('change', onTypeChange);
  document.getElementById('hasAccuSelect').addEventListener('change', updateAccuVisibility);
  document.getElementById('calcBtn').addEventListener('click', calculate);
  document.getElementById('printOfferBtn').addEventListener('click', showOffer);

  onTypeChange();
  updateAccuVisibility();
  document.getElementById('year').textContent = new Date().getFullYear();
}

function onTypeChange() {
  const t = document.getElementById('typeSelect').value;
  const brandsMap = (APPDATA.brands && APPDATA.brands[t]) || {};
  const brandSel = document.getElementById('brandSelect');
  brandSel.innerHTML = '';
  const brandKeys = Object.keys(brandsMap);
  if (brandKeys.length === 0) {
    const o = document.createElement('option');
    o.value = 'Overig'; o.textContent = 'Overig'; brandSel.appendChild(o);
  } else {
    brandKeys.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; brandSel.appendChild(o); });
  }
  if (!brandSel.value && brandSel.options.length > 0) brandSel.value = brandSel.options[0].value;

  // referentieprijs hint
  const tcfg = (APPDATA.types || []).find(x => x.type === t);
  const hint = document.getElementById('refPriceHint');
  if (tcfg && typeof tcfg.ref_price === 'number') {
    hint.textContent = `Referentie nieuwprijs voor ${t}: ${fmt.format(Math.round(tcfg.ref_price))}`;
  } else {
    hint.textContent = '';
  }
}

function updateAccuVisibility() {
  const wrap = document.getElementById('accuStateWrap');
  const t = document.getElementById('typeSelect').value;
  const tcfg = (APPDATA.types || []).find(x => x.type === t);
  const override = document.getElementById('hasAccuSelect').value; // auto/ja/nee
  let hasAccu = tcfg?.has_accu_default;
  if (override === 'ja') hasAccu = true; else if (override === 'nee') hasAccu = false;
  wrap.style.display = hasAccu ? 'flex' : 'none';
}

function calculate() {
  const t = document.getElementById('typeSelect').value;
  const brandSel = document.getElementById('brandSelect');
  const brand = brandSel.value;
  const state = document.getElementById('stateSelect').value;
  const accuState = document.getElementById('accuStateSelect').value;

  const rawAge = parseInt((document.getElementById('ageInput').value || '0'), 10);
  const age = Math.max(0, Math.min(15, isNaN(rawAge) ? 0 : rawAge));

  const priceInput = document.getElementById('priceInput').value;
  const tcfg = (APPDATA.types || []).find(x => x.type === t);
  const price = priceInput ? Math.max(0, parseFloat(priceInput)) : (tcfg?.ref_price || 0);

  // hasAccu decision + accufactor
  const override = document.getElementById('hasAccuSelect').value; // auto/ja/nee
  let hasAccu = tcfg?.has_accu_default;
  if (override === 'ja') hasAccu = true; else if (override === 'nee') hasAccu = false;

  const ageFactor = (APPDATA.restwaarde?.zonderaccu && APPDATA.restwaarde.zonderaccu[String(age)]) ?? 0;
  const condFactor = (APPDATA.cond_factors && APPDATA.cond_factors[state]) ?? 1;

  let accuFactor = 1;
  if (hasAccu === true) {
    accuFactor = (APPDATA.accu_state_factors && APPDATA.accu_state_factors[accuState]) ?? 1;
  } else {
    // Als het type normaal een accu heeft maar deze ontbreekt => zwaar afwaarderen
    if (tcfg?.has_accu_default) {
      accuFactor = (APPDATA.accu_state_factors && APPDATA.accu_state_factors['Defect/Geen accu']) ?? 0.01;
    } else {
      accuFactor = 1; // niet-elektrische fiets
    }
  }

  const brandsMap = (APPDATA.brands && APPDATA.brands[t]) || {};
  let brandFactor = 1;
  if (brand in brandsMap) brandFactor = brandsMap[brand];
  else if ('Overig' in brandsMap) {
    console.warn('Onbekend merk, val terug op Overig:', brand);
    brandFactor = brandsMap['Overig'];
  } else {
    console.warn('Onbekend merk en geen Overig, gebruik milde default 0.95 voor type:', t);
    brandFactor = 0.95;
  }

  let value = price * ageFactor * condFactor * accuFactor * brandFactor;

  // Floor/ceiling optioneel toepassen
  if (typeof MAX_PCT_VAN_NIEUW === 'number') {
    value = Math.min(value, price * MAX_PCT_VAN_NIEUW);
  }
  if (typeof MIN_INRUIL === 'number') {
    value = Math.max(value, MIN_INRUIL);
  }

  const rounded = Math.round(value);
  document.getElementById('resultValue').textContent = fmt.format(rounded);
  document.getElementById('resultCard').hidden = false;

  // Factors tonen (2 decimalen waar zinvol)
  const nf2 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 });
  document.getElementById('factorAge').textContent = nf2.format(ageFactor);
  document.getElementById('factorState').textContent = nf2.format(condFactor);
  document.getElementById('factorAccu').textContent = nf2.format(accuFactor);
  document.getElementById('factorBrand').textContent = nf2.format(brandFactor);

  // Offertevelden
  document.getElementById('offerType').textContent = t;
  document.getElementById('offerBrand').textContent = brand;
  document.getElementById('offerState').textContent = state + (hasAccu ? `, accustaat: ${accuState}` : '');
  document.getElementById('offerAge').textContent = `${age} jaar`;
  document.getElementById('offerTotal').textContent = fmt.format(rounded);
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  document.getElementById('offerDate').textContent = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
}

function showOffer() {
  // Laat de offerte op scherm staan en print direct
  document.getElementById('offerCard').scrollIntoView({behavior:'smooth'});
  window.print();
}

// PWA install prompt (ongewijzigd)
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.hidden = true;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
});

window.addEventListener('load', load);
