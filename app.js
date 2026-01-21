
// =====================
// FSID app.js – basis
// =====================

console.log("FSID app.js geladen");

// Wacht tot HTML klaar is
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM geladen, init start");

  // Vul dropdowns
  const typeSelect = document.getElementById("typeSelect");
  const brandSelect = document.getElementById("brandSelect");
  const stateSelect = document.getElementById("stateSelect");
  const accuStateSelect = document.getElementById("accuStateSelect");

  if (!typeSelect || !brandSelect || !stateSelect || !accuStateSelect) {
    console.error("Selects niet gevonden – HTML klopt niet");
    return;
  }

  ["Stadsfiets", "E-bike", "MTB", "Race"].forEach(v =>
    typeSelect.appendChild(new Option(v, v))
  );
  ["Gazelle", "Batavus", "Cortina", "Overig"].forEach(v =>
    brandSelect.appendChild(new Option(v, v))
  );
  ["Uitstekend", "Goed", "Redelijk", "Matig"].forEach(v =>
    stateSelect.appendChild(new Option(v, v))
  );
  ["Nieuw", "Goed", "Redelijk", "Matig", "Geen"].forEach(v =>
    accuStateSelect.appendChild(new Option(v, v))
  );

  console.log("Dropdowns gevuld ✅");
});

// =====================
// Berekening aansluiten
// =====================

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("calcBtn");
  const resultCard = document.getElementById("resultCard");
  const resultValue = document.getElementById("resultValue");

  if (!btn) {
    console.error("Bereken-knop niet gevonden");
    return;
  }

  btn.addEventListener("click", function () {
    const price = Number(document.getElementById("priceInput").value || 0);
    const age = Number(document.getElementById("ageInput").value || 0);

    // tijdelijke simpele berekening (TEST)
    const value = Math.round(price * Math.max(0.2, 1 - age * 0.1));

    resultValue.textContent = "€ " + value.toLocaleString("nl-NL");
    resultCard.hidden = false;

    console.log("Berekening uitgevoerd:", value);
  });
});


// ===============================
// DEFINITIEVE TEST-BEREKENING
// ===============================
function fsidCalculate() {
  console.log("fsidCalculate aangeroepen ✅");

  const price = Number(document.getElementById("priceInput").value || 0);
  const age = Number(document.getElementById("ageInput").value || 0);

  if (!price) {
    alert("Vul eerst een aankoopprijs in");
    return;
  }

  const value = Math.round(price * Math.max(0.2, 1 - age * 0.1));

  const resultValue = document.getElementById("resultValue");
  const resultCard = document.getElementById("resultCard");

  resultValue.innerText = "€ " + value.toLocaleString("nl-NL");
  resultCard.hidden = false;
}
