
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
