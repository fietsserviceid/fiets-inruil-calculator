FSID PWA v9.4 bundle
====================
Bestanden:
- index.html
- manifest.webmanifest
- sw.js (CACHE v9.4)
- app.js (v9.4)
- styles.css
- data.json
- icon-192.png, icon-512.png, favicon.ico
- CNAME.txt, 404.html

BELANGRIJK:
- Publiceer naar de (sub)root van de site.
- Na deploy: DevTools > Application > Service Workers: vink "Update on reload" aan, doe hard refresh (Ctrl+Shift+R) en herlaad.
- iPhone: verwijder oude PWA, Safari hard refresh, opnieuw "Zet op beginscherm".
- Verhoog CACHE_NAME in sw.js bij elke wijziging aan index/app/styles.
