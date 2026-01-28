
(function(){
  const PRICE_DEFAULTS = { 'Stadsfiets': 800, 'E-bike': 2500, 'Racefiets': 1800, 'MTB': 1500 };
  const BRANDS = ['Gazelle', 'Koga', 'Cortina', 'Batavus', 'Cube', 'Specialized'];
  const STATES = [
    { key: 'nieuw', label: 'Zo goed als nieuw', factor: 1.0 },
    { key: 'goed', label: 'Goed', factor: 0.85 },
    { key: 'redelijk', label: 'Redelijk', factor: 0.7 },
    { key: 'matig', label: 'Matig', factor: 0.55 }
  ];
  const ACCU_STATES = [
    { label: 'Uitmuntend', factor: 1.0 },
    { label: 'Goed', factor: 0.9 },
    { label: 'Redelijk', factor: 0.8 },
    { label: 'Matig', factor: 0.65 }
  ];

  const qs = sel => document.querySelector(sel);
  const fmtEUR = v => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

  // Year in footer
  qs('#year').textContent = new Date().getFullYear();

  // Populate selects
  const typeSelect = qs('#typeSelect');
  ['Stadsfiets','E-bike','Racefiets','MTB'].forEach(t => {
    const opt = document.createElement('option'); opt.value = t; opt.textContent = t; typeSelect.appendChild(opt);
  });
  const brandSelect = qs('#brandSelect');
  BRANDS.forEach(b => { const opt = document.createElement('option'); opt.value = b; opt.textContent = b; brandSelect.appendChild(opt); });
  const stateSelect = qs('#stateSelect');
  STATES.forEach(s => { const opt = document.createElement('option'); opt.value = s.key; opt.textContent = s.label; stateSelect.appendChild(opt); });
  const accuStateSelect = qs('#accuStateSelect');
  ACCU_STATES.forEach(a => { const opt = document.createElement('option'); opt.value = a.label; opt.textContent = a.label; accuStateSelect.appendChild(opt); });

  // Show/hide accu state depending on type/hasAccu
  function updateAccuVisibility(){
    const type = typeSelect.value;
    const hasAccu = qs('#hasAccuSelect').value;
    const show = (type === 'E-bike') ? (hasAccu !== 'nee') : (hasAccu === 'ja');
    qs('#accuStateWrap').style.display = show ? '' : 'none';
  }
  typeSelect.addEventListener('change', () => {
    const t = typeSelect.value; qs('#refPriceHint').textContent = `Referentie nieuwprijs: € ${PRICE_DEFAULTS[t] ?? 0}`; updateAccuVisibility();
  });
  qs('#hasAccuSelect').addEventListener('change', updateAccuVisibility);
  typeSelect.value = 'E-bike';
  typeSelect.dispatchEvent(new Event('change'));

  // Calculator
  qs('#calcBtn').addEventListener('click', () => {
    const type = typeSelect.value;
    const brand = brandSelect.value;
    const stateKey = stateSelect.value;
    const age = Math.max(0, Math.min(15, parseInt(qs('#ageInput').value || '0', 10)));
    const priceInput = parseFloat(qs('#priceInput').value || '0');
    const ref = PRICE_DEFAULTS[type] || 0;
    const base = priceInput > 0 ? priceInput : ref;

    const stateFactor = (STATES.find(s => s.key === stateKey)?.factor) || 0.7;
    const brandFactor = (brand === 'Gazelle' || brand === 'Koga') ? 1.05 : 1.0;
    const ageFactor = Math.max(0.25, (1 - (age * 0.05)));

    let accuFactor = 1.0;
    const hasAccu = qs('#hasAccuSelect').value;
    const isEbike = type === 'E-bike';
    if ((isEbike && hasAccu !== 'nee') || (!isEbike && hasAccu === 'ja')) {
      const accLabel = qs('#accuStateSelect').value || 'Goed';
      accuFactor = (ACCU_STATES.find(a => a.label === accLabel)?.factor) || 0.9;
    }

    const value = Math.round(base * stateFactor * brandFactor * ageFactor * accuFactor * 0.35);

    qs('#resultValue').textContent = fmtEUR(value);
    qs('#factorAge').textContent = `${Math.round(ageFactor*100)}%`;
    qs('#factorState').textContent = `${Math.round(stateFactor*100)}%`;
    qs('#factorAccu').textContent = `${Math.round(accuFactor*100)}%`;
    qs('#factorBrand').textContent = `${Math.round(brandFactor*100)}%`;

    qs('#offerType').textContent = type;
    qs('#offerBrand').textContent = brand;
    qs('#offerState').textContent = STATES.find(s => s.key === stateKey)?.label || stateKey;
    qs('#offerAge').textContent = `${age} jaar`;
    qs('#offerTotal').textContent = fmtEUR(value);
    qs('#offerDate').textContent = new Date().toLocaleDateString('nl-NL');

    qs('#resultCard').hidden = false;
  });

  qs('#printOfferBtn').addEventListener('click', () => {
    window.print();
  });

  let deferredPrompt = null;
  const installBtn = qs('#installBtn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener('click', async () => {
    installBtn.hidden = true;
    try { if (deferredPrompt) { await deferredPrompt.prompt(); await deferredPrompt.userChoice; } }
    catch (err) { console.error(err); }
    deferredPrompt = null;
  });

  const LICENSE_KEY = 'fsid_license_active_until';
  const INSTALL_CODES_URL = 'https://raw.githubusercontent.com/FSID-BV/fiets-inruil-calculator/main/codes.json';
  const LICENSE_DURATION_DAYS = 365;
  const licenseGate = qs('#licenseGate');
  const licenseBanner = qs('#licenseBanner');
  const licMsg = qs('#licMsg');

  function isLicenseActive(){
    const until = parseInt(localStorage.getItem(LICENSE_KEY) || '0', 10);
    return (until > Date.now());
  }
  function setLicenseActive(days){
    const until = Date.now() + days*24*60*60*1000;
    localStorage.setItem(LICENSE_KEY, String(until));
  }
  function updateLicenseUI(){
    if (isLicenseActive()) {
      licenseGate.hidden = true;
      licenseBanner.textContent = 'Licentie: actief';
      qs('#licenseFooter').textContent = 'Licentie actief — Fiets Service ID';
    } else {
      licenseGate.hidden = false;
      licenseBanner.textContent = 'Licentie: vereist';
      qs('#licenseFooter').textContent = 'Geen actieve licentie — Activeer met code';
    }
  }

  async function validateCode(code){
    licMsg.textContent = '';
    if (code === 'FSID-TEST-CODE') return true;
    try {
      const res = await fetch(INSTALL_CODES_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('Codes lijst niet bereikbaar');
      const data = await res.json();
      const ok = Array.isArray(data?.codes) ? data.codes.includes(code) : Boolean(data[code]);
      return ok;
    } catch (err) {
      console.warn('Licentie controle niet gelukt:', err);
      licMsg.textContent = 'Kon codes.json niet laden; probeer opnieuw of gebruik FSID-TEST-CODE voor test.';
      return false;
    }
  }

  qs('#activateLicBtn').addEventListener('click', async () => {
    const code = qs('#licCodeInput').value.trim();
    licMsg.textContent = 'Controleert code…';
    const ok = await validateCode(code);
    if (ok) {
      setLicenseActive(LICENSE_DURATION_DAYS);
      licMsg.textContent = 'Licentie geactiveerd';
      updateLicenseUI();
    } else {
      licMsg.textContent = 'Ongeldige code';
    }
  });
  qs('#pasteLicBtn').addEventListener('click', async () => {
    try { const text = await navigator.clipboard.readText(); if (text) qs('#licCodeInput').value = text.trim(); } catch {}
  });
  qs('#saveDraftBtn').addEventListener('click', () => {
    const fields = ['licBedrijfsnaam','licContact','licEmail','licTel','licAdres','licPostcode','licPlaats','licKvK','licBTW'];
    const data = Object.fromEntries(fields.map(id => [id, qs('#'+id).value]));
    localStorage.setItem('fsid_lic_draft', JSON.stringify(data));
    alert('Gegevens opgeslagen op dit apparaat.');
  });

  updateLicenseUI();
})();
