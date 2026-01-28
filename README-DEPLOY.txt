FSID PWA v9.2 — root deploy met lokale './codes.json' en './data.json'
1) Zet alle bestanden in de root van je site.
2) Zorg dat ./codes.json en ./data.json naast index.html staan.
3) Service Worker: v9.2 (root scope), vers probeert voor codes/data, fallback op cache.
4) Na deploy: Unregister SW + Clear storage, oude PWA verwijderen, herinstalleren.
