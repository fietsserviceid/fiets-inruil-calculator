// Fiets Inruil Calculator – app.js (km-stand + lokale bronnen, activatie ongewijzigd) const LIC_STORAGE_KEY = 'fsid_license_v1'; const CODES_SOURCE = './codes.json'; const DATA_SOURCE = '/data.json'; const fmtEUR = (v) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v); async function fetchJSON(url) { const resp = await fetch(url, { cache: 'no-cache' }); if (!resp.ok) throw new Error('Laden mislukt: ' + url); return await resp.json(); } // v9.6 - helper: toon/verberg Km-stand in offerte op basis van type function setOfferKmVisibility(isElectricType, km){ try{ const offerKmEl = document.getElementById('offerKm'); if (!offerKmEl) return; const offerKmLabelEl = offerKmEl.previousElementSibling; // 
Km-stand:
 if (isElectricType){ offerKmEl.style.display = ''; if (offerKmLabelEl) offerKmLabelEl.style.display = ''; if (km != null && !Number.isNaN(km)){ try { offerKmEl.textContent = Number(km).toLocaleString('nl-NL') + ' km'; } catch { offerKmEl.textContent = String(km) 

 ''; } } } else { offerKmEl.textContent = ''; offerKmEl.style.display = 'none'; if (offerKmLabelEl) offerKmLabelEl.style.display = 'none'; } }catch(e){ /* noop */ } } function getKmStandFactor(km, factors) { if (typeof km !== 'number' 

 isNaN(km) 

 km < 0) return 1.0; // factors: [{max_km, factor}, ...] oplopend for (const band of factors 

 []) { if (band.max_km === null) return band.factor; // catch-all boven de hoogste waarde if (km <= band.max_km) return band.factor; } return 1.0; } // ------------------ Licentie (ongewijzigd) ------------------ async function fetchLicenseList() { return fetchJSON(CODES_SOURCE); } function saveLocalLicense(licCode, months = 12) { const now = new Date(); const expires = new Date(now); expires.setMonth(expires.getMonth() + months); const payload = { code: licCode, activatedAt: now.toISOString(), expiresAt: expires.toISOString() }; localStorage.setItem(LIC_STORAGE_KEY, JSON.stringify(payload)); return payload; } function getLocalLicense() { try { const raw = localStorage.getItem(LIC_STORAGE_KEY); if (!raw) return null; const lic = JSON.parse(raw); if (new Date(lic.expiresAt) < new Date()) { localStorage.removeItem(LIC_STORAGE_KEY); return null; } return lic; } catch { return null; } }

function isServerLicenseValid(serverEntry) {
  if (!serverEntry) return false;
  if (serverEntry.active === false) return false;
  if (serverEntry.valid_until) {
    const until = new Date(serverEntry.valid_until);
    if (!Number.isNaN(+until) && until < new Date()) return false;
  }
  return true;
}

async function revalidateLocalLicenseAgainstServer() {
  const lic = getLocalLicense();
  if (!lic) return false;
  try {
    const list = await fetchJSON(`${CODES_SOURCE}?t=${Date.now()}`);
    const entry = (list.codes ?? []).find(c => c.code === lic.code);
    if (!isServerLicenseValid(entry)) {
      localStorage.removeItem(LIC_STORAGE_KEY);
      return false;
    }
    if (entry?.valid_until) {
      const serverExp = new Date(entry.valid_until);
      if (!Number.isNaN(+serverExp)) {
        const local = JSON.parse(localStorage.getItem(LIC_STORAGE_KEY));
        const localExp = new Date(local.expiresAt);
        if (serverExp < localExp) {
          local.expiresAt = serverExp.toISOString();
          localStorage.setItem(LIC_STORAGE_KEY, JSON.stringify(local));
        }
      }
    }
    return true;
  } catch {
    return true;
  }
}
 async function activateLicenseFromInput() { const input = document.getElementById('licCodeInput'); const msg = document.getElementById('licMsg'); msg.textContent = 'Bezig met valideren…'; try { const code = (input.value 

 '').trim(); if (!code) throw new Error('Geen code ingevuld'); const list = await fetchLicenseList(); const found = (list.codes 

 []).find(c => c.code === code && c.active !== false); if (!found) throw new Error('Code ongeldig of gedeactiveerd'); const saved = saveLocalLicense(code, 12);
// Begrens lokaal op server-einddatum (indien opgegeven)
if (found?.valid_until) {
  const serverExp = new Date(found.valid_until);
  if (!Number.isNaN(+serverExp)) {
    const local = JSON.parse(localStorage.getItem(LIC_STORAGE_KEY));
    const localExp = new Date(local.expiresAt);
    if (serverExp < localExp) {
      local.expiresAt = serverExp.toISOString();
      localStorage.setItem(LIC_STORAGE_KEY, JSON.stringify(local));
    }
  }
}
const newLic = JSON.parse(localStorage.getItem(LIC_STORAGE_KEY));
msg.textContent = 'Licentie geactiveerd tot ' + new Date(newLic.expiresAt).toLocaleDateString('nl-NL');
closeLicenseGate(); } catch (e) { msg.textContent = e.message 

 'Activatie mislukt'; } } async function pasteFromClipboard() { const input = document.getElementById('licCodeInput'); const msg = document.getElementById('licMsg'); try { const text = await navigator.clipboard.readText(); input.value = (text 

 '').trim(); msg.textContent = 'Code geplakt'; } catch { msg.textContent = 'Plakken wordt door de browser geblokkeerd. Plak handmatig (lang indrukken) of typ de code.'; } } function closeLicenseGate() { const gateEl = document.getElementById('licenseGate'); const banner = document.getElementById('licenseBanner'); const footer = document.getElementById('licenseFooter'); if (gateEl) { gateEl.hidden = true; gateEl.style.display = 'none'; } if (banner) banner.style.display = 'none'; if (footer) footer.textContent = ''; } // ------------------------------------------------------------ let DATA = null; function populateSelect(sel, items) { sel.innerHTML = ''; items.forEach((v) => { const opt = document.createElement('option'); if (typeof v === 'string') { opt.value = v; opt.textContent = v; } else { opt.value = v.value; opt.textContent = v.label ?? v.value; } sel.appendChild(opt); }); } function effectiveHasAccu(typeObj, override) { if (override === 'ja') return true; if (override === 'nee') return false; return !!(typeObj?.has_accu_default); } function recalc() { if (!DATA) return; const typeSel = document.getElementById('typeSelect'); const brandSel = document.getElementById('brandSelect'); const stateSel = document.getElementById('stateSelect'); const accuStateSel = document.getElementById('accuStateSelect'); const hasAccuSel = document.getElementById('hasAccuSelect'); const ageInput = document.getElementById('ageInput'); const priceInput = document.getElementById('priceInput'); const kmStandInput = document.getElementById('kmStandInput'); const typeName = typeSel.value; const typeObj = DATA.types.find(t => t.type === typeName); const override = hasAccuSel.value; const hasAccu = effectiveHasAccu(typeObj, override); const refPrice = parseFloat(priceInput.value) > 0 ? parseFloat(priceInput.value) : (typeObj?.ref_price 

 0); const age = Math.min(15, Math.max(0, parseInt(ageInput.value 

 '0', 10))); const restTab = hasAccu ? DATA.restwaarde.metaccu : DATA.restwaarde.zonderaccu; const ageFactor = Number(restTab[String(age)] 

 0); const stateFactor = Number(DATA.cond_factors[stateSel.value] 

 1); const brandFactor = Number((DATA.brands[typeName] 

 {}))[brandSel.value] 

 1); const accuFactor = hasAccu ? Number(DATA.accu_state_factors[accuStateSel.value] 

 1) : 1; // Km-stand factor: alleen bij elektrische types (has_accu_default true) const isElectricType = !!(typeObj?.has_accu_default); const km = kmStandInput ? parseInt(kmStandInput.value 

 '0', 10) : 0; const kmFactor = isElectricType ? getKmStandFactor(km, DATA.km_stand_factors 

 []) : 1.0; let value = refPrice * ageFactor * stateFactor * brandFactor * accuFactor * kmFactor; value = Math.max(0, Math.round(value)); document.getElementById('resultValue').textContent = fmtEUR(value); document.getElementById('factorAge').textContent = ageFactor.toFixed(2); document.getElementById('factorState').textContent = stateFactor.toFixed(2); document.getElementById('factorAccu').textContent = accuFactor.toFixed(2); document.getElementById('factorBrand').textContent = brandFactor.toFixed(2); const kmEl = document.getElementById('factorKmStand'); if (kmEl) kmEl.textContent = kmFactor.toFixed(2); // (optioneel: velden voor offerte kunnen hier ook gezet worden) document.getElementById('resultCard').hidden = false; // v9.6 - fix: fill extra offerte fields including km-stand (formatted) const offerTotal = document.getElementById('offerTotal'); if (offerTotal) offerTotal.textContent = fmtEUR(value); const offerType = document.getElementById('offerType'); if (offerType) offerType.textContent = typeName ?? ''; const offerBrand = document.getElementById('offerBrand'); if (offerBrand) offerBrand.textContent = brandSel.value ?? ''; const offerState = document.getElementById('offerState'); if (offerState) offerState.textContent = stateSel.value ?? ''; const offerAge = document.getElementById('offerAge'); if (offerAge) offerAge.textContent = age + ' jaar'; const offerKm = document.getElementById('offerKm'); if (offerKm && kmStandInput) { const kmVal = kmStandInput.value ? Number(kmStandInput.value) : 0; offerKm.textContent = kmVal.toLocaleString('nl-NL') + ' km'; } } async function initData() { DATA = await fetchJSON(DATA_SOURCE); const typeSel = document.getElementById('typeSelect'); const brandSel = document.getElementById('brandSelect'); const stateSel = document.getElementById('stateSelect'); const accuStateSel = document.getElementById('accuStateSelect'); const hasAccuSel = document.getElementById('hasAccuSelect'); const refHint = document.getElementById('refPriceHint'); const accuWrap = document.getElementById('accuStateWrap'); const kmWrap = document.getElementById('kmStandWrap'); populateSelect(typeSel, DATA.types.map(t => t.type)); populateSelect(stateSel, Object.keys(DATA.cond_factors)); populateSelect(accuStateSel, Object.keys(DATA.accu_state_factors)); function updateTypeDependent() { const t = DATA.types.find(x => x.type === typeSel.value); const override = hasAccuSel.value; const hasAccu = effectiveHasAccu(t, override); const brandsForType = Object.keys(DATA.brands[typeSel.value] 

 { Overig: 1 }); populateSelect(brandSel, brandsForType); refHint.textContent = 'Referentieprijs voor ' + typeSel.value + ': ' + fmtEUR(t?.ref_price 

 0); accuWrap.style.display = hasAccu ? 'block' : 'none'; // Km-stand veld alleen tonen bij elektrische types if (kmWrap) { const isElectricType = !!(t?.has_accu_default); kmWrap.style.display = isElectricType ? 'block' : 'none'; // direct sync offerte Km-stand bij wissel (waarde wordt bij recalc gezet) setOfferKmVisibility(isElectricType, 0); } } typeSel.addEventListener('change', () => { updateTypeDependent(); try{ recalc(); }catch(e){} }); hasAccuSel.addEventListener('change', () => { updateTypeDependent(); try{ recalc(); }catch(e){} }); updateTypeDependent(); document.getElementById('calcBtn').addEventListener('click', recalc); try{ document.getElementById('kmStandInput')?.addEventListener('input', recalc);}catch(e){} document.getElementById('year').textContent = new Date().getFullYear(); // (optioneel) printknop const printBtn = document.getElementById('printOfferBtn'); if (printBtn) printBtn.addEventListener('click', () => { try { recalc(); } catch(e){} const dEl = document.getElementById('offerDate'); if (dEl) dEl.textContent = new Date().toLocaleDateString('nl-NL'); setTimeout(() => window.print(), 50); }); } function bindLicenseUI() { const actBtn = document.getElementById('activateLicBtn'); const pasteBtn = document.getElementById('pasteLicBtn'); const input = document.getElementById('licCodeInput'); actBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); activateLicenseFromInput(); }); pasteBtn?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); pasteFromClipboard(); }); input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); activateLicenseFromInput(); } }); } // PWA install-knop beheer — verberg in PWA, toon alleen wanneer installprompt beschikbaar is (function installButtonManager(){ const installBtn = document.getElementById('installBtn'); const banner = document.getElementById('licenseBanner'); let deferredPrompt = null; const isIOS = /iphone
ipad
ipod/i.test(navigator.userAgent); function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches 

 window.navigator.standalone === true; // iOS } function hideInstall(){ if (installBtn) installBtn.hidden = true; } function showInstall(){ if (installBtn) installBtn.hidden = false; } async function detectInstalledRelatedApps(){ try { if (!navigator.getInstalledRelatedApps) return false; const related = await navigator.getInstalledRelatedApps(); return Array.isArray(related) && related.length > 0; } catch { return false; } } async function updateInstallVisibility(){ // In de PWA zelf altijd weg if (isStandalone()) { try { localStorage.setItem('pwaInstalled', '1'); } catch {} hideInstall(); return; } // Als al geïnstalleerd gemarkeerd -> weg (ook in browser) if (localStorage.getItem('pwaInstalled') === '1') { hideInstall(); return; } // Extra detectie op Android/Chrome indien beschikbaar if (await detectInstalledRelatedApps()) { try { localStorage.setItem('pwaInstalled', '1'); } catch {} hideInstall(); return; } // iOS: geen beforeinstallprompt -> toon instructie, verberg knop if (isIOS) { if (banner) { banner.innerHTML = 'Op iPhone: tik Deel ▸ Zet op beginscherm.'; banner.style.display = 'block'; } hideInstall(); return; } // Desktop/Android: toon knop alleen als prompt beschikbaar is if (deferredPrompt) showInstall(); else hideInstall(); } window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; // async functie aanroepen updateInstallVisibility(); }); installBtn?.addEventListener('click', async () => { if (!deferredPrompt) return; try { await deferredPrompt.prompt(); const choice = await deferredPrompt.userChoice; if (choice && choice.outcome === 'accepted') { try { localStorage.setItem('pwaInstalled', '1'); } catch {} } } catch {} deferredPrompt = null; await updateInstallVisibility(); }); window.addEventListener('appinstalled', async () => { try { localStorage.setItem('pwaInstalled', '1'); } catch {} deferredPrompt = null; await updateInstallVisibility(); }); document.addEventListener('DOMContentLoaded', () => { updateInstallVisibility(); }); window.addEventListener('pageshow', () => { updateInstallVisibility(); }); window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateInstallVisibility(); }); setTimeout(updateInstallVisibility, 500); setTimeout(updateInstallVisibility, 1500); updateInstallVisibility(); })(); // Opstart window.addEventListener('DOMContentLoaded', async () => { // Prijs uit codes.json (ongewijzigd gedrag) try { const list = await fetchLicenseList(); const price = (list.price_eur_per_year ?? 99).toFixed(2); const priceHeader = document.getElementById('licensePriceHeader'); const priceBody = document.getElementById('licensePriceBody'); if (priceHeader) priceHeader.textContent = price; if (priceBody) priceBody.textContent = price; } catch {} // Licentie overlay tonen of verbergen (ongewijzigd) const lic = getLocalLicense(); const gateEl= document.getElementById('licenseGate'); const banner= document.getElementById('licenseBanner'); const footer= document.getElementById('licenseFooter'); if (!lic) { if (gateEl) gateEl.hidden = false; if (banner) { banner.textContent = 'Licentie vereist voor gebruik.'; banner.style.display = 'block'; } if (footer) footer.textContent = ''; } else {
  const ok = await revalidateLocalLicenseAgainstServer();
  if (ok) {
    closeLicenseGate();
  } else {
    if (gateEl) gateEl.hidden = false;
    if (banner) { banner.textContent = 'Licentie ongeldig of verlopen.'; banner.style.display = 'block'; }
    if (footer) footer.textContent = '';
  }
} bindLicenseUI(); await initData(); }); // --- PDF Generator (luxe zonder logo, dunne lijnen) --- function downloadOffertePDF(){ const root = window.jspdf 

 {}; const jsPDF = root.jsPDF 

 (root.jsPDF && root.jsPDF.jsPDF); if(!jsPDF){ alert('PDF-module is nog niet geladen. Probeer nogmaals.'); return; } const doc = new jsPDF({unit:'mm',format:'a4'}); const blue=[0,51,128]; doc.setFont('Helvetica','bold'); doc.setFontSize(24); doc.setTextColor(...blue); doc.text('Offerte – Inruilvoorstel',20,20); doc.setDrawColor(...blue); doc.setLineWidth(0.6); doc.line(20,25,190,25); doc.setFontSize(16); doc.text('Klant & Fietsgegevens',20,35); doc.setLineWidth(0.25); doc.line(20,37,90,37); const klant=(document.getElementById('offerName')?.value)

''; const type=(document.getElementById('offerType')?.textContent)

''; const merk=(document.getElementById('offerBrand')?.textContent)

''; const staat=(document.getElementById('offerState')?.textContent)

''; const leeftijd=(document.getElementById('offerAge')?.textContent)

''; const kmEl=document.getElementById('offerKm'); const km=((kmEl && kmEl.style.display!=='none')? (kmEl.textContent

'') : '')

''; const prijs=(document.getElementById('offerTotal')?.textContent)

''; let y=48; doc.setFont('Helvetica',''); doc.setFontSize(12); const fields=[["Naam klant:",klant],["Type fiets:",type],["Merk:",merk],["Staat:",staat],["Leeftijd:",leeftijd]]; fields.forEach(f=>{ doc.text(f[0],20,y); doc.text(f[1],60,y); y+=10; }); if(km){ doc.text('Km-stand:',20,y); doc.text(km,60,y); y+=10; } doc.setFont('Helvetica','bold'); doc.setFontSize(16); doc.setTextColor(...blue); doc.text('Inruilprijs:',20,y); doc.text(prijs,60,y); doc.setTextColor(0,0,0); y+=15; doc.setFont('Helvetica',''); doc.setFontSize(10); doc.text('Deze inruilwaarde is gebaseerd op type fiets, leeftijd, staat, km-stand en overige factoren.',20,y); y+=20; doc.setFontSize(12); doc.text('Handtekening klant:',20,y); doc.setLineWidth(0.2); doc.line(70,y+1,150,y+1); y+=20; doc.text('Handtekening dealer:',20,y); doc.setLineWidth(0.2); doc.line(70,y+1,150,y+1); y+=20; doc.text('Datum:',20,y); doc.text(new Date().toLocaleDateString('nl-NL'), 40, y); doc.save('Offerte-FietsServiceID.pdf'); } (function(){ function bind(){ const b=document.getElementById('downloadPdfBtn'); if(b && !b.dataset.pdfBound){ b.addEventListener('click', downloadOffertePDF); b.dataset.pdfBound='1'; return true;} return false; } if(!bind()){ document.addEventListener('DOMContentLoaded', bind, { once: true }); } })();