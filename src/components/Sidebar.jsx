import { LayoutDashboard, Map, Users, UserCog, Wallet, PlusCircle, ReceiptText, LogOut, Building2 } from 'lucide-react';

export default function Sidebar({ user, onLogout, currentPath = '' }) {
  const adminItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Zones', path: '/admin/zones', icon: Building2 },
    { label: 'Members', path: '/admin/members', icon: Users },
    { label: 'Zone Treasurers', path: '/admin/treasurers', icon: UserCog },
    { label: 'Monthly Due Settings', path: '/admin/monthly-due', icon: Wallet },
    { label: 'Additional Fees', path: '/admin/additional-fees', icon: PlusCircle },
    { label: 'Payment Records', path: '/admin/payment-records', icon: ReceiptText },
    { label: 'Reports', path: '/admin/reports', icon: Map },
  ];

  const treasurerItems = [
    { label: 'Dashboard', path: '/treasurer', icon: LayoutDashboard },
    { label: 'My Zone Members', path: user?.zone_id ? `/treasurer/zones/${user.zone_id}` : '/treasurer', icon: Users },
  ];

  const items = user?.role === 'zone_treasurer' ? treasurerItems : adminItems;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <div className="brand-title">TRMS</div>
          <div className="brand-subtitle">Treasurer Record</div>
        </div>
      </div>

      <nav className="nav-list">
        {items.map(({ label, path, icon: Icon }) => (
          <button
            key={path}
            type="button"
            className={`nav-item ${currentPath === path ? 'active' : ''}`}
            onClick={() => window.location.href = path}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}

        <button type="button" className="nav-item logout" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </nav>

      <div className="sidebar-user-card">
        <div className="user-label">Signed in as</div>
        <strong>{user?.full_name || 'User'}</strong>
        <small>{user?.role === 'admin' ? 'Head Treasurer' : 'Zone Treasurer'}</small>
      </div>
    </aside>
  );
}
