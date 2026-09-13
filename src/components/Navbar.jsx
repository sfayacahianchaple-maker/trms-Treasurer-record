import { Bell, Search } from 'lucide-react';

export default function Navbar({ title, children, actions = null }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">TREASURER RECORD MANAGEMENT SYSTEM</p>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        {children}
        {actions}
        <button type="button" className="icon-button" aria-label="Notifications">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}
