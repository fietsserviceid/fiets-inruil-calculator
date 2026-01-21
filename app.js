
/* =====================================================
   FSID APP.JS
   Complete bootstrap + helpers
   ===================================================== */

/* =====================================================
   1. APP BOOTSTRAP – __APP_READY__
   ===================================================== */

window.__APP_READY__ = (async function bootstrapApp() {
  console.log("FSID bootstrap gestart…");

  /* -----------------------------------------------
     Installatie-check
     ----------------------------------------------- */
  try {
    if (localStorage.getItem("fsid_install_activated") !== "1") {
      console.warn("Bootstrap gestopt: installatie vereist");
      return;
    }
  } catch (err) {
    console.error("localStorage niet beschikbaar", err);
    return;
  }

  /* -----------------------------------------------
     Wacht tot DOM beschikbaar is
     ----------------------------------------------- */
  if (document.readyState === "loading") {
    await new Promise(resolve =>
