(function () {
  let announcements = [];
  let readAnnouncementIds = new Set();
  let storageKey = null;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  function unreadAnnouncements() {
    return announcements.filter((announcement) => !readAnnouncementIds.has(String(announcement.id)));
  }

  function renderBadge() {
    const link = document.querySelector('.nav-list a[href="treasurer-announcements.html"]');
    if (!link) return;

    const unreadCount = unreadAnnouncements().length;
    link.querySelector('.announcement-nav-badge')?.remove();
    link.removeAttribute('aria-label');
    if (!unreadCount) return;

    const badge = document.createElement('span');
    badge.className = 'announcement-nav-badge';
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    link.appendChild(badge);
    link.setAttribute(
      'aria-label',
      `Announcements, ${unreadCount} unread ${unreadCount === 1 ? 'announcement' : 'announcements'}`
    );
  }

  function persistReadAnnouncements() {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...readAnnouncementIds]));
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.warn('Unable to clear temporary read announcement status.', error);
      }
    } catch (localStorageError) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify([...readAnnouncementIds]));
      } catch (sessionStorageError) {
        console.error('Unable to save read announcement status.', {
          localStorageError,
          sessionStorageError
        });
      }
    }
  }

  window.TRMSAnnouncementBadge = {
    ready,
    update(items) {
      announcements = items;
      renderBadge();
    },
    isRead(announcementId) {
      return readAnnouncementIds.has(String(announcementId));
    },
    markRead(announcementId) {
      readAnnouncementIds.add(String(announcementId));
      persistReadAnnouncements();
      renderBadge();
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await window.TRMSAuth.ready();
      const user = window.TRMSAuth.getCurrentUser();
      if (user?.role !== 'zone_treasurer') return;

      storageKey = `trms_read_announcements_${user.id || user.zone_id || 'treasurer'}`;
      let savedReadIds = null;
      try {
        savedReadIds = localStorage.getItem(storageKey);
      } catch (error) {
        console.warn('Unable to load persistent read announcement status.', error);
      }
      if (savedReadIds === null) {
        try {
          savedReadIds = sessionStorage.getItem(storageKey);
        } catch (error) {
          console.error('Unable to load temporary read announcement status.', error);
        }
      }
      try {
        const savedIds = JSON.parse(savedReadIds || '[]');
        if (!Array.isArray(savedIds)) throw new Error('Saved read announcement data is invalid.');
        readAnnouncementIds = new Set(savedIds.map(String));
      } catch (error) {
        console.error('Unable to parse read announcement status.', error);
        readAnnouncementIds = new Set();
      }

      const navigation = document.querySelector('.nav-list');
      if (navigation) {
        new MutationObserver((mutations) => {
          if (mutations.some((mutation) => mutation.target === navigation)) renderBadge();
        }).observe(navigation, { childList: true, subtree: true });
      }

      if (
        document.getElementById('treasurerAnnouncementList')
        || document.getElementById('dashboardTreasurerAnnouncements')
      ) return;

      const announcements = await window.TRMSAuth.getTreasurerAnnouncements();
      window.TRMSAnnouncementBadge.update(announcements);
    } catch (error) {
      console.error('Unable to initialize announcement navigation badge.', error);
    } finally {
      resolveReady();
    }
  });
})();
