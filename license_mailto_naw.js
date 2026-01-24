
(function(){
  function $(id){ return document.getElementById(id); }

  const overlay = $('licenseOverlay');
  const badge = $('licenseBadge');
  const input = $('activationCodeInput');
  const btnActivate = $('btnActivate');
  const btnRequest = $('btnRequest');
  const msgActivate = $('activateMsg');
  const msgRequest = $('requestMsg');

  const tabActivate = $('tabActivate');
  const tabRequest = $('tabRequest');
  const panelActivate = $('panelActivate');
  const panelRequest = $('panelRequest');

  function setActiveTab(tab){
    if(tab === 'activate'){
      tabActivate.classList.add('active');
      tabRequest.classList.remove('active');
      panelActivate.style.display = '';
      panelRequest.style.display = 'none';
    } else {
      tabRequest.classList.add('active');
      tabActivate.classList.remove('active');
      panelRequest.style.display = '';
      panelActivate.style.display = 'none';
    }
  }

  if (tabActivate && tabRequest){
    tabActivate.addEventListener('click', function(){ setActiveTab('activate'); });
    tabRequest.addEventListener('click', function(){ setActiveTab('request'); });
  }

  function updateBadgeActive(active){
    if(!badge) return;
    badge.textContent = active ? 'Licentie: actief' : 'Licentie: niet geactiveerd';
  }

  // getToken() wordt door app.js gebruikt (indien aanwezig)
  window.getToken = function(){
    try {
      let t = (localStorage.getItem('fsid_license_token')||'').trim().toUpperCase();
      if (window.validateFsIdCode && window.validateFsIdCode(t)) return t;
      return '';
    } catch(e){
      return '';
    }
  };

  function ensureActivation(){
    const t = window.getToken();
    const isValid = !!t;
    updateBadgeActive(isValid);
    if (overlay){ overlay.style.display = isValid ? 'none' : 'flex'; }
  }

  if (btnActivate && input){
    btnActivate.addEventListener('click', function(){
      const val = (input.value||'').trim().toUpperCase();
      if (window.validateFsIdCode && window.validateFsIdCode(val)){
        localStorage.setItem('fsid_license_token', val);
        if (msgActivate){ msgActivate.textContent = 'Activatie geslaagd. Licentie geactiveerd.'; msgActivate.style.color = 'green'; }
        ensureActivation();
        // Herlaad data achter licentie-token
        if (typeof load === 'function') { try { load(); } catch(e){} }
      } else {
        if (msgActivate){ msgActivate.textContent = 'Ongeldige activatiecode. Controleer je code of vraag een nieuwe aan.'; msgActivate.style.color = 'crimson'; }
      }
    });
  }

  if (btnRequest){
    btnRequest.addEventListener('click', function(e){
      e.preventDefault();
      const org = ($('orgName')?.value)||'';
      const kvk = ($('kvk')?.value)||'';
      const cn = ($('contactName')?.value)||'';
      const em = ($('email')?.value)||'';
      const ph = ($('phone')?.value)||'';
      const st = ($('street')?.value)||'';
      const zp = ($('zip')?.value)||'';
      const ct = ($('city')?.value)||'';
      const subject = 'Aanvraag activatiecode – Fiets Service ID (jaarabonnement)';
      const body = (
        'Graag ontvang ik een activatiecode voor Fiets Service ID.\n' +
        'Het betreft een jaarabonnement à €99,00 exclusief btw per jaar.\n\n' +
        'NAW-gegevens:\n' +
        'Bedrijfsnaam: ' + org + '\n' +
        'KVK-nummer (optioneel): ' + kvk + '\n' +
        'Contactpersoon: ' + cn + '\n' +
        'E-mail: ' + em + '\n' +
        'Telefoon: ' + ph + '\n' +
        'Straat + nr: ' + st + '\n' +
        'Postcode: ' + zp + '\n' +
        'Plaats: ' + ct + '\n\n' +
        'Alvast dank!'
      );
      const href = 'mailto:support@fietsserviceid.nl?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      try { window.location.href = href; } catch(e){}
      if (msgRequest){ msgRequest.textContent = 'E-mailaanvraag geopend in je e‑mailprogramma.'; }
    });
  }

  window.addEventListener('load', function(){
    ensureActivation();
    setActiveTab('activate');
  });
})();
