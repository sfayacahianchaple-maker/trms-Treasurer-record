import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { fetchMembers, createMember, updateMember, deleteMember } from '../../services/memberService';
import { fetchZones } from '../../services/zoneService';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function Members({ user, onLogout }) {
  const [members, setMembers] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ full_name: '', address: '', phone: '', zone_id: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersData, zonesData] = await Promise.all([fetchMembers(), fetchZones()]);
      setMembers(membersData);
      setZones(zonesData);
    } catch (err) {
      setError('Unable to load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm({ full_name: '', address: '', phone: '', zone_id: '' });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError('Please enter member name.');
      return;
    }
    if (!form.zone_id) {
      setError('Please select a zone.');
      return;
    }

    try {
      setSaving(true);
      const payload = { ...form, full_name: form.full_name.trim(), address: form.address.trim(), phone: form.phone.trim() };
      if (editingId) {
        await updateMember(editingId, payload);
      } else {
        await createMember(payload);
      }
      resetForm();
      setError('');
      fetchData();
    } catch (err) {
      setError('Unable to save member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteMember(confirmId);
      setConfirmId(null);
      fetchData();
    } catch (err) {
      setError('Unable to delete member.');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin/members" />
      <main className="main-panel">
        <Navbar title="Members" />

        <section className="panel form-panel">
          <h2>{editingId ? 'Edit Member' : 'Add Member'}</h2>
          <form onSubmit={handleSubmit} className="stack-form">
            <label>
              <span>Full Name</span>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </label>
            <label>
              <span>Address</span>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label>
              <span>Phone</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              <span>Zone</span>
              <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })}>
                <option value="">Select zone</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>{zone.zone_name}</option>
                ))}
              </select>
            </label>
            {error && <div className="error-box">{error}</div>}
            <div className="inline-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update' : 'Save'}</button>
              {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Member List</h2>
          </div>
          {loading ? (
            <div className="loading-box">Loading members...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Zone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="empty-state">No members found.</td>
                    </tr>
                  ) : (
                    members.map((member, index) => {
                      const zone = zones.find((item) => item.id === member.zone_id);
                      return (
                        <tr key={member.id}>
                          <td>{index + 1}</td>
                          <td>{member.full_name}</td>
                          <td>{zone?.zone_name || 'Unassigned'}</td>
                          <td><span className="badge inactive">INACTIVE</span></td>
                          <td className="actions-cell">
                            <button type="button" className="btn btn-secondary" onClick={() => {
                              setEditingId(member.id);
                              setForm({ full_name: member.full_name, address: member.address || '', phone: member.phone || '', zone_id: member.zone_id });
                            }}>Edit</button>
                            <button type="button" className="btn btn-danger" onClick={() => setConfirmId(member.id)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ConfirmDialog
          open={!!confirmId}
          message="Are you sure you want to delete this member?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      </main>
    </div>
  );
}
