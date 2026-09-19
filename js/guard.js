/* TRMS — route guard. Runs on every protected page: confirms a
   session exists and matches the page's required role, fills in
   the user chip, and wires the logout button. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const requiredRole = document.body.getAttribute('data-role');
    const user = window.TRMSAuth.getCurrentUser();

    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    if (requiredRole && user.role !== requiredRole) {
      window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'treasurer-dashboard.html';
      return;
    }

    document.querySelectorAll('[data-user-name]').forEach((node) => {
      node.textContent = user.name;
    });

    document.querySelectorAll('[data-logout]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!window.confirm('Are you sure you want to logout?')) return;
        window.TRMSAuth.logout();
        window.location.href = 'login.html';
      });
    });
  });
})();
