document.addEventListener('DOMContentLoaded', async () => {
  const recentList = document.getElementById('recentAnnouncements');
  if (!recentList || window.TRMSAuth?.getCurrentUser()?.role !== 'admin') return;
  const status = document.getElementById('recentAnnouncementsStatus');

  try {
    const announcements = await window.TRMSAuth.getAdminAnnouncements();
    const published = announcements.filter((item) => item.status === 'published');
    const drafts = announcements.filter((item) => item.status === 'draft');
    document.getElementById('dashboardAnnouncementTotal').textContent = announcements.length.toLocaleString('en-PH');
    document.getElementById('dashboardAnnouncementPublished').textContent = published.length.toLocaleString('en-PH');
    document.getElementById('dashboardAnnouncementDrafts').textContent = drafts.length.toLocaleString('en-PH');

    recentList.replaceChildren(...announcements.slice(0, 5).map((announcement) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = 'announcements.html';
      link.textContent = announcement.title;
      item.appendChild(link);
      const detail = document.createElement('span');
      detail.textContent = `${announcement.category} · ${announcement.status === 'published' ? 'Published' : 'Draft'}`;
      item.appendChild(detail);
      return item;
    }));
    status.textContent = announcements.length ? '' : 'No announcements yet.';
  } catch (error) {
    console.error('Unable to load dashboard announcements.', error);
    status.textContent = error.message || 'Unable to load announcements.';
    status.className = 'announcement-feedback is-error';
  }
});
