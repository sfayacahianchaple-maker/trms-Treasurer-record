import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { fetchZones, syncTreasurerZoneAssignments } from '../../services/zoneService';
import { createTreasurerUser } from '../../services/authService';
import { supabase } from '../../lib/supabase';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function Treasurers({ user, onLogout }) {
  const [treasurers, setTreasurers] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '', zone_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      await syncTreasurerZoneAssignments();
      const [zoneData, profileData] = await Promise.all([
        fetchZones(),
        supabase.from('profiles').select('*').eq('role', 'zone_treasurer').order('full_name')
      ]);
      setZones(zoneData);
      setTreasurers(profileData.data || []);
    } catch (error) {
      setError('Unable to load treasurers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return setError('Please enter the full name.');
    if (!form.email.trim()) return setError('Please enter an email.');
    if (!form.password || form.password.length < 6) return setError('Password must be at least 6 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    if (!form.zone_id) return setError('Please select a zone.');

    try {
      setSaving(true);
      await createTreasurerUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        zone_id: Number(form.zone_id),
      });
      setForm({ full_name: '', email: '', password: '', confirmPassword: '', zone_id: '' });
      setError('');
      await syncTreasurerZoneAssignments();
      fetchData();
    } catch (err) {
      setError(err?.message || 'Unable to create treasurer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      const { error: zoneError } = await supabase
        .from('zones')
        .update({ treasurer_id: null })
        .eq('treasurer_id', confirmId);

      if (zoneError) {
        throw zoneError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', confirmId);

      if (profileError) {
        throw profileError;
      }

      setConfirmId(null);
      fetchData();
    } catch (err) {
      setError('Unable to delete treasurer.');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin/treasurers" />
      <main className="main-panel">
        <Navbar title="Zone Treasurers" />

        <section className="panel form-panel">
          <h2>Add Treasurer</h2>
          <form onSubmit={handleSubmit} className="stack-form">
            <label><span>Full Name</span><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
            <label><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label><span>Password</span><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label><span>Confirm Password</span><input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} /></label>
            <label>
              <span>Assigned Zone</span>
              <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })}>
                <option value="">Select zone</option>
                {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.zone_name}</option>)}
              </select>
            </label>
            {error && <div className="error-box">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Save'}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>Treasure Accounts</h2></div>
          {loading ? <div className="loading-box">Loading treasurers...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Assigned Zone</th><th>Created Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {treasurers.length === 0 ? <tr><td colSpan="5" className="empty-state">No zone treasurers found.</td></tr> : treasurers.map((treasurer) => (
                    <tr key={treasurer.id}>
                      <td>{treasurer.full_name}</td>
                      <td>{treasurer.email}</td>
                      <td>{zones.find((zone) => zone.id === treasurer.zone_id)?.zone_name || '—'}</td>
                      <td>{new Date(treasurer.created_at).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button type="button" className="btn btn-danger" onClick={() => setConfirmId(treasurer.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ConfirmDialog open={!!confirmId} message="Are you sure you want to delete this treasurer?" onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      </main>
    </div>
  );
}
