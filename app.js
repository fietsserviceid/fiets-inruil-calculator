
'use strict';

let APPDATA = null;
const $ = (id) => document.getElementById(id);

const fmt = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

async function load() {
  const res = await fetch('./data.json', { cache: 'no-cache' });
  APPDATA = await res.json();
  initUI();
  injectDealer();
}

function initUI() {
  fillSelect('typeSelect', APPDATA.types.map(t => t.type));
  fillSelect('stateSelect', Object.keys(APPDATA.cond_factors));
  fillSelect('accuStateSelect', Object.keys(APPDATA.accu_state_factors));

  $('typeSelect').onchange = onTypeChange;
  $('hasAccuSelect').onchange = updateAccuVisibility;
  $('calcBtn').onclick = calculate;

  onTypeChange();
  updateAccuVisibility();
  $('year').textContent = new Date().getFullYear();
}

function fillSelect(id, values) {
  const el = $(id);
  el.innerHTML = '';
  values.forEach(v => el.add(new Option(v, v)));
}

function onTypeChange() {
  const t = $('typeSelect').value;
  const brands = APPDATA.brands[t] || { Overig: 0.75 };
  fillSelect('brandSelect', Object.keys(brands));

  const cfg = APPDATA.types.find(x => x.type === t);
  $('refPriceHint').textContent =
    `Referentieprijs: € ${cfg.ref_price.toLocaleString('nl-NL')}`;
}

function updateAccuVisibility() {
  const t = $('typeSelect').value;
  const cfg = APPDATA.types.find(x => x.type === t);
  let hasAccu = cfg.has_accu_default;

  const override = $('hasAccuSelect').value;
  if (override === 'ja') hasAccu = true;
  if (override === 'nee') hasAccu = false;

  $('accuStateWrap').style.display = hasAccu ? '' : 'none';
}

function calculate() {
  const t = $('typeSelect').value;
  const brand = $('brandSelect').value;
  const state = $('stateSelect').value;
  const accuState = $('accuStateSelect').value;

  const age = Math.min(15, Math.max(0, +$('ageInput').value || 0));
  const cfg = APPDATA.types.find(x => x.type === t);
  const price = +$('priceInput').value || cfg.ref_price;

  const override = $('hasAccuSelect').value;
  let hasAccu = cfg.has_accu_default;
  if (override === 'ja') hasAccu = true;
  if (override === 'nee') hasAccu = false;

  const ageFactor = hasAccu
    ? APPDATA.restwaarde.metaccu[age]
    : APPDATA.restwaarde.zonderaccu[age];

  const value =
    price *
    ageFactor *
    APPDATA.cond_factors[state] *
    (hasAccu ? APPDATA.accu_state_factors[accuState] : 1) *
    (APPDATA.brands[t][brand] || 0.75);

  $('resultValue').textContent = fmt.format(Math.round(value));
  $('resultCard').hidden = false;
}

function injectDealer() {
  const meta = JSON.parse(localStorage.getItem('fsid_install_meta') || 'null');
  if (meta?.dealer) {
    $('dealerFooter').textContent = `Dealer: ${meta.dealer}`;
  }
}

window.addEventListener('load', load);
