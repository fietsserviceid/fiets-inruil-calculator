// license_mailto_naw.js – aanvraag via mailto met alleen NAW-gegevens; activatie & verify via API
const API_BASE = './api';

function setBadge(text, ok=false){
  const el = document.getElementById('licenseBadge');
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#137333' : '';
}

function getToken(){ try { return localStorage.getItem('fsid_license_token') || ''; } catch(e){ return ''; } }
function setToken(tok){ try { localStorage.setItem('fsid_license_token', tok||''); } catch(e){} }

async function verifyLicense(){
  const tok = getToken();
  if(!tok) return false;
  try{
    const res = await fetch(`${API_BASE}/verify?token=${encodeURIComponent(tok)}`, {cache:'no-store'});
    if(!res.ok) return false;
    const json = await res.json();
    if(json && json.active){ setBadge(`Licentie geactiveerd – geldig tot ${json.validUntil||''}`, true); return true; }
    return false;
  }catch(err){ return false; }
}

function showOverlay(show){
  const overlay = document.getElementById('licenseOverlay');
  if(!overlay) return; overlay.style.display = show ? 'flex' : 'none';
}

async function ensureLicenseReady(){
  const ok = await verifyLicense();
  if(ok){ showOverlay(false); return true; }
  const tabActivate = document.getElementById('tabActivate');
  const tabRequest = document.getElementById('tabRequest');
  const panelActivate = document.getElementById('panelActivate');
  const panelRequest = document.getElementById('panelRequest');
  if(tabActivate && tabRequest && panelActivate && panelRequest){
    tabActivate.addEventListener('click', ()=>{ tabActivate.classList.add('active'); tabRequest.classList.remove('active'); panelActivate.style.display='block'; panelRequest.style.display='none'; });
    tabRequest.addEventListener('click', ()=>{ tabRequest.classList.add('active'); tabActivate.classList.remove('active'); panelActivate.style.display='none'; panelRequest.style.display='block'; });
  }
  const btnReq = document.getElementById('btnRequest');
  if(btnReq){ btnReq.disabled = false; btnReq.addEventListener('click', requestInstallCodeMailtoNAW); }
  const btnAct = document.getElementById('btnActivate');
  if(btnAct){ btnAct.addEventListener('click', activateCode); }
  showOverlay(true);
  return false;
}

function requestInstallCodeMailtoNAW(){
  const msg = document.getElementById('requestMsg');
  if(msg) msg.textContent = '';

  const orgName = document.getElementById('orgName')?.value?.trim();
  const contactName = document.getElementById('contactName')?.value?.trim();
  const email = document.getElementById('email')?.value?.trim();
  const kvk = document.getElementById('kvk')?.value?.trim();
  const phone = document.getElementById('phone')?.value?.trim();
  const street = document.getElementById('street')?.value?.trim();
  const zip = document.getElementById('zip')?.value?.trim();
  const city = document.getElementById('city')?.value?.trim();

  if(!orgName || !contactName || !email){
    if(msg) msg.textContent = 'Vul minimaal Bedrijfsnaam, Contactpersoon en E‑mail in.';
    return;
  }

  const subject = 'Aanvraag installatiecode – Fiets Service ID';
  const bodyLines = [
    'Nieuwe installatiecode-aanvraag',
    '',
    `Bedrijfsnaam: ${orgName}`,
    `KVK: ${kvk||'-'}`,
    `Contactpersoon: ${contactName}`,
    `E-mail: ${email}`,
    `Telefoon: ${phone||'-'}`,
    `Adres: ${street||''}, ${zip||''} ${city||''}`,
    '',
    'Graag ontvang ik een activatiecode voor de Inruilwaarde-calculator.',
    '',
    `Verzonden vanuit de app op: ${new Date().toLocaleString('nl-NL')}`
  ];
  const mailto = `mailto:support@fietsserviceid.nl?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
  window.location.href = mailto;
  if(msg) msg.textContent = 'Je e‑mailprogramma is geopend met een voorgedefinieerde e‑mail (NAW-gegevens). Verstuur de e‑mail om de aanvraag af te ronden.';
}

async function activateCode(){
  const code = document.getElementById('activationCodeInput')?.value?.trim();
  const msg = document.getElementById('activateMsg');
  if(msg) msg.textContent = '';
  if(!code){ if(msg) msg.textContent = 'Vul een activatiecode in.'; return; }
  try{
    const res = await fetch(`${API_BASE}/activate`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code })});
    const json = await res.json();
    if(!res.ok){ if(msg) msg.textContent = json?.message || 'Activatie mislukt.'; return; }
    if(json?.token){ setToken(json.token); setBadge(`Licentie geactiveerd – geldig tot ${json.validUntil||''}`, true); showOverlay(false); }
  }catch(e){ if(msg) msg.textContent = 'Netwerkfout. Probeer later opnieuw.'; }
}

window.addEventListener('DOMContentLoaded', ensureLicenseReady);
