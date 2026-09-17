document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  window.__TRMS_MEMBERS = window.TRMSAuth.getMockData().members;
});
