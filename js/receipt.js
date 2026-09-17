document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;

  const data = window.TRMSAuth.getMockData();
  window.__TRMS_RECEIPTS = data.receipts || [];

  if (!window.TRMSAuth.canGenerateOfficialReceipt()) {
    window.__TRMS_RECEIPTS = [];
  }
});
