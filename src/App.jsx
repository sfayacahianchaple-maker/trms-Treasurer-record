import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { getSession, getCurrentUserProfile, signOut } from './services/authService';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import Zones from './pages/admin/Zones';
import Members from './pages/admin/Members';
import Treasurers from './pages/admin/Treasurers';
import MonthlyDue from './pages/admin/MonthlyDue';
import AdditionalFees from './pages/admin/AdditionalFees';
import MemberHistory from './pages/admin/MemberHistory';
import Receipt from './pages/admin/Receipt';
import TreasurerDashboard from './pages/treasurer/TreasurerDashboard';
import ZoneMembers from './pages/treasurer/ZoneMembers';
import ProtectedRoute from './components/ProtectedRoute';

function ZoneTreasurerRoute({ user, onLogout }) {
  const { zoneId } = useParams();

  if (!user || user.role !== 'zone_treasurer') {
    return <Navigate to="/login" replace />;
  }

  if (Number(user.zone_id) !== Number(zoneId)) {
    return <Navigate to="/treasurer" replace />;
  }

  return <ZoneMembers user={user} onLogout={onLogout} />;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      setLoading(true);
      const currentSession = await getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        const profile = await getCurrentUserProfile();
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session load failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      setSession(null);
      setUser(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return <div className="app-shell app-loading">Loading application...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login onAuthSuccess={loadSession} />} />

      <Route path="/admin" element={<ProtectedRoute user={user} allowedRoles={['admin']}><AdminDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/zones" element={<ProtectedRoute user={user} allowedRoles={['admin']}><Zones user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/members" element={<ProtectedRoute user={user} allowedRoles={['admin']}><Members user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/treasurers" element={<ProtectedRoute user={user} allowedRoles={['admin']}><Treasurers user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/monthly-due" element={<ProtectedRoute user={user} allowedRoles={['admin']}><MonthlyDue user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/additional-fees" element={<ProtectedRoute user={user} allowedRoles={['admin']}><AdditionalFees user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/payment-records" element={<ProtectedRoute user={user} allowedRoles={['admin']}><AdminDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute user={user} allowedRoles={['admin']}><MemberHistory user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/member-history/:memberId" element={<ProtectedRoute user={user} allowedRoles={['admin']}><MemberHistory user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/zones/:zoneId" element={<ProtectedRoute user={user} allowedRoles={['admin']}><ZoneMembers user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/admin/receipt/:memberId" element={<ProtectedRoute user={user} allowedRoles={['admin']}><Receipt user={user} onLogout={handleLogout} /></ProtectedRoute>} />

      <Route path="/treasurer" element={<ProtectedRoute user={user} allowedRoles={['zone_treasurer']}><TreasurerDashboard user={user} onLogout={handleLogout} /></ProtectedRoute>} />
      <Route path="/treasurer/zones/:zoneId" element={<ProtectedRoute user={user} allowedRoles={['zone_treasurer']}><ZoneTreasurerRoute user={user} onLogout={handleLogout} /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/treasurer') : '/login'} replace />} />
      <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/treasurer') : '/login'} replace />} />
    </Routes>
  );
}
