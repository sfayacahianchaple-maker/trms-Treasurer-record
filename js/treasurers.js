document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  const data = window.TRMSAuth.getMockData();
  window.__TRMS_TREASURERS = data.profiles.filter((profile) => profile.role === 'zone_treasurer');
});
