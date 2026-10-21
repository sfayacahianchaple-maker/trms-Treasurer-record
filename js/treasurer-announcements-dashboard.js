document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('dashboardTreasurerAnnouncements');
  if (!list) return;
  const status = document.getElementById('dashboardTreasurerAnnouncementsStatus');

  try {
    await window.TRMSAnnouncementBadge?.ready;
    const announcements = await window.TRMSAuth.getTreasurerAnnouncements();
    window.TRMSAnnouncementBadge?.update(announcements);
    list.replaceChildren(...announcements.slice(0, 3).map((announcement) => {
      const item = document.createElement('li');
      if (announcement.is_pinned) item.classList.add('is-pinned');
      const link = document.createElement('a');
      link.href = 'treasurer-announcements.html';
      link.textContent = announcement.title;
      item.appendChild(link);
      const category = document.createElement('span');
      category.textContent = `${announcement.category}${announcement.is_pinned ? ' · Pinned' : ''}`;
      item.appendChild(category);
      return item;
    }));
    status.textContent = announcements.length ? '' : 'There are no published announcements for your zone right now.';
  } catch (error) {
    console.error('Unable to load dashboard announcements.', error);
    status.textContent = error.message || 'Unable to load announcements.';
    status.className = 'announcement-feedback is-error';
  }
});
