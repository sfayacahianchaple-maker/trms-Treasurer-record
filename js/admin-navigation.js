function groupAdminNavigation() {
  if (window.TRMSAuth?.getCurrentUser()?.role !== 'admin') return true;
  const navigation = document.querySelector('.nav-list');
  if (!navigation) return true;

  const links = new Map([...navigation.querySelectorAll(':scope > li')]
    .map((item) => [item.querySelector('a')?.getAttribute('href'), item])
    .filter(([href]) => href));
  if (!links.size) return false;

  const groups = [
    { label: 'Overview', hrefs: ['admin-dashboard.html'] },
    { label: 'Create', hrefs: ['create-zone.html', 'members.html', 'treasurers.html', 'monthly-due.html', 'additional-fees.html', 'wedding-fees.html'] },
    { label: 'View', hrefs: ['zones.html', 'treasurer-payments.html'] },
    { label: 'Reports & Records', hrefs: ['payment-records.html', 'reports.html', 'archives.html'] }
  ];

  navigation.replaceChildren();
  groups.forEach((group) => {
    const items = group.hrefs.map((href) => links.get(href)).filter(Boolean);
    if (!items.length) return;

    const heading = document.createElement('li');
    heading.className = 'nav-section';
    heading.textContent = group.label;
    navigation.appendChild(heading);
    items.forEach((item) => navigation.appendChild(item));
  });
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  if (groupAdminNavigation()) return;

  const navigation = document.querySelector('.nav-list');
  if (!navigation) return;
  const observer = new MutationObserver(() => {
    if (groupAdminNavigation()) observer.disconnect();
  });
  observer.observe(navigation, { childList: true, subtree: true });
});
