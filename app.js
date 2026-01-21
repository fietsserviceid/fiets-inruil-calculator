window.addEventListener("load", async () => {
  if (window.__APP_READY__) await window.__APP_READY__;
  console.log("App gestart");
});
