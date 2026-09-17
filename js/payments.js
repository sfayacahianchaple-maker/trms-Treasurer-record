document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  const data = window.TRMSAuth.getMockData();
  window.__TRMS_PAYMENTS = {
    monthly: data.monthlyPayments,
    additional: data.additionalFeePayments
  };
});
