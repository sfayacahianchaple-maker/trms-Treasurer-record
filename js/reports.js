document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  const data = window.TRMSAuth.getMockData();
  window.__TRMS_REPORTS = {
    totalMembers: data.members.length,
    activeMembers: data.members.filter((member) => member.is_active).length,
    inactiveMembers: data.members.filter((member) => !member.is_active).length,
    monthlyPaid: data.monthlyPayments.filter((payment) => payment.paid).length,
    monthlyUnpaid: data.monthlyPayments.filter((payment) => !payment.paid).length,
    additionalFeesPaid: data.additionalFeePayments.filter((payment) => payment.paid).length,
    additionalFeesUnpaid: data.additionalFeePayments.filter((payment) => !payment.paid).length
  };
});
