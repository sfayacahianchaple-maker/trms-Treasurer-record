document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  window.__TRMS_FEES = window.TRMSAuth.getMockData().additionalFees;
});
