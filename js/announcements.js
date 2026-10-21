(function () {
  function addText(parent, tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = String(text ?? '');
    if (className) node.className = className;
    parent.appendChild(node);
    return node;
  }

  function formatDate(value) {
    if (!value) return 'Not published';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Not published' : date.toLocaleString('en-PH');
  }

  function formatDateInput(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }

  function statusMessage(element, message, type = '') {
    element.textContent = message;
    element.className = `announcement-feedback${type ? ` is-${type}` : ''}`;
  }

  function announcementCard(announcement, zonesById, adminActions = false) {
    const card = document.createElement('article');
    card.className = `card announcement-card${announcement.is_pinned ? ' is-pinned' : ''}`;

    const badges = document.createElement('div');
    badges.className = 'announcement-badges';
    addText(badges, 'span', announcement.category, 'announcement-category');
    if (announcement.is_pinned) addText(badges, 'span', 'Pinned', 'announcement-pin-badge');
    const isUnread = !adminActions && !window.TRMSAnnouncementBadge?.isRead(announcement.id);
    if (isUnread) addText(badges, 'span', 'Unread', 'announcement-unread-badge');
    if (adminActions) {
      addText(
        badges,
        'span',
        announcement.status === 'published' ? 'Published' : 'Draft',
        `announcement-status-badge ${announcement.status === 'published' ? 'is-published' : 'is-draft'}`
      );
    }
    card.appendChild(badges);
    addText(card, 'h3', announcement.title, 'announcement-title');

    const audience = announcement.target_audience === 'specific_zone'
      ? `Zone: ${zonesById.get(String(announcement.zone_id)) || announcement.zone?.name || 'Selected zone'}`
      : 'All Zone Treasurers';
    const publicationDate = announcement.published_at || announcement.updated_at || announcement.created_at;

    if (adminActions) {
      addText(card, 'p', announcement.description, 'announcement-description');
      addText(card, 'p', audience, 'announcement-audience');
      addText(card, 'p', `Published: ${formatDate(publicationDate)}`, 'announcement-date');
      if (announcement.expires_at) {
        addText(card, 'p', `Expires: ${formatDate(announcement.expires_at)}`, 'announcement-date');
      }
      const actions = document.createElement('div');
      actions.className = 'announcement-actions';
      const actionButtons = [
        { action: 'edit', text: 'Edit', className: 'btn btn-secondary' },
        { action: 'toggle-pin', text: announcement.is_pinned ? 'Unpin' : 'Pin', className: 'btn btn-secondary' },
        {
          action: 'toggle-status',
          text: announcement.status === 'published' ? 'Unpublish' : 'Publish',
          className: 'btn btn-secondary'
        },
        { action: 'delete', text: 'Delete', className: 'btn btn-danger' }
      ];
      actionButtons.forEach(({ action, text, className }) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.dataset.action = action;
        button.dataset.announcementId = announcement.id;
        button.textContent = text;
        actions.appendChild(button);
      });
      card.appendChild(actions);
    } else {
      card.classList.toggle('is-unread', isUnread);
      addText(card, 'p', `Published: ${formatDate(publicationDate)}`, 'announcement-date');
      const details = document.createElement('div');
      details.className = 'announcement-card-details';
      details.hidden = true;
      addText(details, 'p', announcement.description, 'announcement-description');
      addText(details, 'p', audience, 'announcement-audience');
      if (announcement.expires_at) {
        addText(details, 'p', `Expires: ${formatDate(announcement.expires_at)}`, 'announcement-date');
      }
      card.appendChild(details);
      const detailsId = `announcement-details-${String(announcement.id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
      details.id = detailsId;
      const viewLink = document.createElement('a');
      viewLink.className = 'announcement-view-link';
      viewLink.href = `#${detailsId}`;
      viewLink.textContent = 'View announcement';
      viewLink.setAttribute('aria-expanded', 'false');
      viewLink.addEventListener('click', (event) => {
        event.preventDefault();
        details.hidden = !details.hidden;
        viewLink.textContent = details.hidden ? 'View announcement' : 'Hide announcement';
        viewLink.setAttribute('aria-expanded', String(!details.hidden));
        if (!details.hidden) {
          card.classList.remove('is-unread');
          card.querySelector('.announcement-unread-badge')?.remove();
          window.TRMSAnnouncementBadge?.markRead(announcement.id);
        }
      });
      card.appendChild(viewLink);
    }
    return card;
  }

  function setFormDisabled(form, disabled) {
    form.querySelectorAll('input, select, textarea, button').forEach((control) => {
      control.disabled = disabled;
    });
  }

  async function initializeAdminPage() {
    const form = document.getElementById('announcementForm');
    const list = document.getElementById('announcementList');
    const listStatus = document.getElementById('announcementListStatus');
    const formStatus = document.getElementById('announcementFormStatus');
    const zoneSelect = document.getElementById('announcementZone');
    const zoneControl = document.getElementById('announcementZoneControl');
    let announcements = [];
    let zonesById = new Map();

    const loadAnnouncements = async () => {
      statusMessage(listStatus, 'Loading announcements…');
      try {
        announcements = await window.TRMSAuth.getAdminAnnouncements();
        document.getElementById('totalAnnouncements').textContent = announcements.length.toLocaleString('en-PH');
        document.getElementById('publishedAnnouncements').textContent = announcements
          .filter((announcement) => announcement.status === 'published').length.toLocaleString('en-PH');
        document.getElementById('draftAnnouncements').textContent = announcements
          .filter((announcement) => announcement.status === 'draft').length.toLocaleString('en-PH');
        list.replaceChildren(...announcements.map((announcement) => announcementCard(announcement, zonesById, true)));
        statusMessage(listStatus, announcements.length ? '' : 'No announcements yet.');
      } catch (error) {
        console.error('Unable to load announcements.', error);
        statusMessage(listStatus, error.message || 'Unable to load announcements.', 'error');
      }
    };

    const resetForm = () => {
      form.reset();
      document.getElementById('announcementId').value = '';
      document.getElementById('formHeading').textContent = 'Create Announcement';
      document.getElementById('saveAnnouncement').textContent = 'Save Announcement';
      document.getElementById('cancelEdit').hidden = true;
      zoneControl.hidden = document.getElementById('announcementAudience').value !== 'specific_zone';
      statusMessage(formStatus, '');
    };

    const editAnnouncement = (announcement) => {
      document.getElementById('announcementId').value = announcement.id;
      document.getElementById('announcementTitle').value = announcement.title;
      document.getElementById('announcementCategory').value = announcement.category;
      document.getElementById('announcementDescription').value = announcement.description;
      document.getElementById('announcementAudience').value = announcement.target_audience;
      document.getElementById('announcementZone').value = announcement.zone_id || '';
      document.getElementById('announcementExpiresAt').value = formatDateInput(announcement.expires_at);
      document.getElementById('announcementStatus').value = announcement.status;
      document.getElementById('announcementPinned').checked = announcement.is_pinned;
      zoneSelect.required = announcement.target_audience === 'specific_zone';
      document.getElementById('formHeading').textContent = 'Edit Announcement';
      document.getElementById('saveAnnouncement').textContent = 'Update Announcement';
      document.getElementById('cancelEdit').hidden = false;
      zoneControl.hidden = announcement.target_audience !== 'specific_zone';
      statusMessage(formStatus, '');
      document.getElementById('announcementFormSection').scrollIntoView({ behavior: 'smooth' });
      document.getElementById('announcementTitle').focus();
    };

    document.getElementById('announcementAudience').addEventListener('change', (event) => {
      zoneControl.hidden = event.target.value !== 'specific_zone';
      zoneSelect.required = event.target.value === 'specific_zone';
    });
    document.getElementById('cancelEdit').addEventListener('click', resetForm);
    document.getElementById('refreshAnnouncements').addEventListener('click', loadAnnouncements);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const expiresValue = document.getElementById('announcementExpiresAt').value;
      const expiresDate = expiresValue ? new Date(expiresValue) : null;
      const announcement = {
        id: document.getElementById('announcementId').value || null,
        title: document.getElementById('announcementTitle').value,
        category: document.getElementById('announcementCategory').value,
        description: document.getElementById('announcementDescription').value,
        target_audience: document.getElementById('announcementAudience').value,
        zone_id: document.getElementById('announcementZone').value,
        status: document.getElementById('announcementStatus').value,
        is_pinned: document.getElementById('announcementPinned').checked,
        expires_at: expiresDate && !Number.isNaN(expiresDate.getTime()) ? expiresDate.toISOString() : null
      };
      if ((expiresValue && !expiresDate) || (expiresDate && Number.isNaN(expiresDate.getTime()))) {
        statusMessage(formStatus, 'Enter a valid expiration date.', 'error');
        return;
      }

      setFormDisabled(form, true);
      statusMessage(formStatus, 'Saving announcement…');
      try {
        await window.TRMSAuth.saveAnnouncement(announcement);
        resetForm();
        statusMessage(formStatus, 'Announcement saved successfully.', 'success');
        await loadAnnouncements();
      } catch (error) {
        console.error('Unable to save announcement.', error);
        statusMessage(formStatus, error.message || 'Unable to save announcement.', 'error');
      } finally {
        setFormDisabled(form, false);
      }
    });

    list.addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const announcement = announcements.find((item) => String(item.id) === button.dataset.announcementId);
      if (!announcement) return;
      if (button.dataset.action === 'edit') {
        editAnnouncement(announcement);
        return;
      }
      if (button.dataset.action === 'delete' && !window.confirm(`Delete "${announcement.title}"?`)) return;
      button.disabled = true;
      let successMessage;
      try {
        if (button.dataset.action === 'delete') {
          await window.TRMSAuth.deleteAnnouncement(announcement.id);
          successMessage = 'Announcement deleted.';
        } else {
          const updated = {
            ...announcement,
            is_pinned: button.dataset.action === 'toggle-pin' ? !announcement.is_pinned : announcement.is_pinned,
            status: button.dataset.action === 'toggle-status'
              ? (announcement.status === 'published' ? 'draft' : 'published')
              : announcement.status
          };
          await window.TRMSAuth.saveAnnouncement(updated);
          successMessage = 'Announcement updated.';
        }
        await loadAnnouncements();
        statusMessage(listStatus, successMessage, 'success');
      } catch (error) {
        console.error('Unable to update announcement.', error);
        statusMessage(listStatus, error.message || 'Unable to update announcement.', 'error');
        button.disabled = false;
      }
    });

    try {
      const zones = await window.TRMSAuth.getAdminAnnouncementZones();
      zonesById = new Map(zones.map((zone) => [String(zone.id), zone.name]));
      zoneSelect.replaceChildren(...zones.map((zone) => {
        const option = document.createElement('option');
        option.value = String(zone.id);
        option.textContent = zone.name;
        return option;
      }));
      if (!zones.length) {
        zoneSelect.disabled = true;
        statusMessage(formStatus, 'Create a zone before targeting a specific zone.', 'error');
      }
      await loadAnnouncements();
    } catch (error) {
      console.error('Unable to initialize announcement management.', error);
      statusMessage(listStatus, error.message || 'Unable to load announcement management.', 'error');
      setFormDisabled(form, true);
    }
  }

  async function initializeTreasurerPage() {
    const list = document.getElementById('treasurerAnnouncementList');
    const status = document.getElementById('treasurerAnnouncementStatus');
    statusMessage(status, 'Loading announcements…');
    try {
      await window.TRMSAnnouncementBadge?.ready;
      const announcements = await window.TRMSAuth.getTreasurerAnnouncements();
      window.TRMSAnnouncementBadge?.update(announcements);
      const zonesById = new Map();
      list.replaceChildren(...announcements.map((announcement) => announcementCard(announcement, zonesById)));
      statusMessage(status, announcements.length ? '' : 'There are no published announcements for your zone right now.');
    } catch (error) {
      console.error('Unable to load treasurer announcements.', error);
      statusMessage(status, error.message || 'Unable to load announcements.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('announcementForm')) {
      initializeAdminPage();
    } else if (document.getElementById('treasurerAnnouncementList')) {
      initializeTreasurerPage();
    }
  });
})();
