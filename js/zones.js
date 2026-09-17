document.addEventListener('DOMContentLoaded', () => {
  if (!window.TRMSAuth) return;
  const data = window.TRMSAuth.getMockData();
  const rows = data.zones.map((zone) => ({
    zone,
    members: data.members.filter((member) => Number(member.zone_id) === Number(zone.id))
  }));
  window.__TRMS_ZONES = rows;
});
