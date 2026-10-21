function groupAdminNavigation() {
  if (window.TRMSAuth?.getCurrentUser()?.role !== 'admin') return true;
  const navigation = document.querySelector('.nav-list');
  if (!navigation) return true;
  if (!navigation.children.length) return false;

  if (!navigation.querySelector('a[href="backup-export.html"]')) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = 'backup-export.html';
    link.textContent = 'Backup & Export';
    if (window.location.pathname.endsWith('/backup-export.html')) {
      link.className = 'active';
      link.setAttribute('aria-current', 'page');
    }
    item.appendChild(link);
    navigation.appendChild(item);
  }
  if (!navigation.querySelector('a[href="announcements.html"]')) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = 'announcements.html';
    link.textContent = 'Announcements';
    if (window.location.pathname.endsWith('/announcements.html')) {
      link.className = 'active';
      link.setAttribute('aria-current', 'page');
    }
    item.appendChild(link);
    navigation.appendChild(item);
  }

  const links = new Map([...navigation.querySelectorAll(':scope > li')]
    .map((item) => [item.querySelector('a')?.getAttribute('href'), item])
    .filter(([href]) => href));
  if (!links.size) return false;

  const groups = [
    { label: 'Overview', hrefs: ['admin-dashboard.html'] },
    { label: 'Create', hrefs: ['create-zone.html', 'members.html', 'treasurers.html', 'monthly-due.html', 'additional-fees.html', 'wedding-fees.html', 'announcements.html'] },
    { label: 'View', hrefs: ['zones.html', 'treasurer-payments.html'] },
    { label: 'Reports & Records', hrefs: ['payment-records.html', 'reports.html', 'archives.html', 'backup-export.html'] }
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
