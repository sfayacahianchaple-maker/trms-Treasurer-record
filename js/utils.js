/* TRMS — shared formatting & lookup helpers. */
(function () {
  const CONFIG = window.TRMS_CONFIG;

  function formatMoneyShort(amount) {
    const value = Number(amount || 0);
    const hasCents = Math.abs(value % 1) > 0.001;
    const formatted = value.toLocaleString('en-PH', {
      minimumFractionDigits: hasCents ? 2 : 2,
      maximumFractionDigits: 2
    });
    return `${CONFIG.currencySymbol}${formatted}`;
  }

  function monthNames() {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  }

  function calculateMemberStatus(memberId, year) {
    const data = window.TRMSAuth.getMockData();
    const settings = Array.isArray(data.monthlyDueSettings)
      ? data.monthlyDueSettings.find((item) => Number(item.year) === Number(year))
      : data.monthlyDue;
    const monthlyAmount = Number(settings?.monthly_amount || 5);
    const yearlyDue = Number(settings?.yearly_due || (monthlyAmount * 12));
    const configuredThreshold = Number(settings?.active_threshold || (monthlyAmount * 6));
    const threshold = yearlyDue > 0 ? yearlyDue * 0.5 : configuredThreshold;

    const totalPaid = data.monthlyPayments
      .filter((payment) => Number(payment.member_id) === Number(memberId) && Number(payment.year) === Number(year) && payment.paid)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const isActive = threshold > 0 && totalPaid >= threshold;
    return {
      label: isActive ? 'Active' : 'Inactive',
      className: isActive ? 'status active' : 'status inactive',
      totalPaid
    };
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  window.TRMSUtils = {
    formatMoneyShort,
    monthNames,
    calculateMemberStatus,
    getQueryParam
  };
})();
