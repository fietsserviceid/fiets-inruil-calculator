
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
      tabActivate?.classList.add('active');
      tabRequest?.classList.remove('active');
      if (panelActivate) panelActivate.style.display = '';
      if (panelRequest) panelRequest.style.display = 'none';
    } else {
      tabRequest?.classList.add('active');
      tabActivate?.classList.remove('active');
      if (panelRequest) panelRequest.style.display = '';
      if (panelActivate) panelActivate.style.display = 'none';
    }
  }

  tabActivate?.addEventListener('click', function(){ setActiveTab('activate'); });
  tabRequest?.addEventListener('click', function(){ setActiveTab('request'); });

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
      let raw = (input.value||'').trim().toUpperCase();
      // Normaliseer whitespace en streepjes
      raw = raw.replace(/\s+/g, '');
      raw = raw.replace(/[–—−]/g, '-');
      // Reformat als iemand streepjes wegliet
      const compact = raw.replace(/-/g, '');
      const m = /^FSID2026([A-Z0-9]{12})([A-Z0-9]{2})$/.exec(compact);
      if (m) {
        const body = m[1];
        const cc = m[2];
        raw = `FSID-2026-${body.slice(0,4)}-${body.slice(4,8)}-${body.slice(8,12)}-${cc}`;
      }

      if (window.validateFsIdCode && window.validateFsIdCode(raw)){
        localStorage.setItem('fsid_license_token', raw);
        if (msgActivate){ msgActivate.textContent = 'Activatie geslaagd. Licentie geactiveerd.'; msgActivate.style.color = 'green'; }
        ensureActivation();
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
