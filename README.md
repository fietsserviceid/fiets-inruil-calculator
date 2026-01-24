# Fiets Service ID – Inruilwaarde app (activatie compleet)

Deze set is **plug & play** voor GitHub Pages (zonder backend). De app valt automatisch terug op `data.json` wanneer `/api/data` niet bestaat.

## Bestanden
- `index.html` (gebruik de meegeleverde `index_activation.html` als vervanger) – laadt scripts met cache-bust.
- `license_mailto_naw.js` – activatie & mailto (met invoer-normalisatie).
- `license_codes.js` – 200 activatiecodes + validator.
- `license_codes.json` – dezelfde codes, machine-leesbaar.
- `FSID_activatiecodes_200.xlsx` – administratie.
- `app.js` – nu met **fallback** naar `data.json` (cache-bust querystring).
- `data.json` – statische dataset.

## Gebruik
1. Vervang `index.html` door `index_activation.html` (of kopieer de inhoud). 
2. Upload alle bestanden naar de root van je repo/site. 
3. Open de site → voer een activatiecode in uit Excel.

## Backend (optioneel)
Als later een endpoint `/api/data` beschikbaar is, gebruikt de app dat automatisch. Tot die tijd werkt alles met `data.json`.
