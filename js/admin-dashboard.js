document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth || !window.TRMSUtils) return;
  const data = window.TRMSAuth.getMockData();
  const totalZones = data.zones.length;
  const totalMembers = data.members.length;
  const activeMembers = data.members.filter((member) => member.is_active).length;
  const inactiveMembers = data.members.filter((member) => !member.is_active).length;
  const currentYear = new Date().getFullYear();
  const totalPaid = data.monthlyPayments
    .filter((payment) => Number(payment.year) === currentYear && payment.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalUnpaid = data.monthlyPayments
    .filter((payment) => Number(payment.year) === currentYear && !payment.paid)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  window.__TRMS_DASHBOARD = {
    totalZones,
    totalMembers,
    activeMembers,
    inactiveMembers,
    totalPaid,
    totalUnpaid
  };
});
