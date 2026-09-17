document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  const due = window.TRMSAuth.getMockData().monthlyDue;
  window.__TRMS_MONTHLY_DUE = due;
});
