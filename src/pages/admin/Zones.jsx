import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { fetchZones, createZone, updateZone, deleteZone } from '../../services/zoneService';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function Zones({ user, onLogout }) {
  const [zones, setZones] = useState([]);
  const [zoneName, setZoneName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchZones();
      setZones(data);
    } catch (err) {
      setError('Unable to load zones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      setError('Please enter a zone name.');
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateZone(editingId, zoneName.trim());
      } else {
        await createZone(zoneName.trim());
      }
      setZoneName('');
      setEditingId(null);
      setError('');
      fetchData();
    } catch (err) {
      setError('Unable to save zone.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteZone(confirmId);
      setConfirmId(null);
      fetchData();
    } catch (err) {
      setError('Unable to delete zone.');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin/zones" />
      <main className="main-panel">
        <Navbar title="Zones" />

        <section className="panel form-panel">
          <h2>{editingId ? 'Edit Zone' : 'Add Zone'}</h2>
          <form onSubmit={handleSubmit} className="stack-form">
            <label>
              <span>Zone Name</span>
              <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Zone List</h2>
          </div>
          {loading ? (
            <div className="loading-box">Loading zones...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Zone Name</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">No zones found.</td>
                    </tr>
                  ) : (
                    zones.map((zone, index) => (
                      <tr key={zone.id}>
                        <td>{index + 1}</td>
                        <td>{zone.zone_name}</td>
                        <td>{new Date(zone.created_at).toLocaleDateString()}</td>
                        <td className="actions-cell">
                          <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(zone.id); setZoneName(zone.zone_name); }}>Edit</button>
                          <button type="button" className="btn btn-danger" onClick={() => setConfirmId(zone.id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ConfirmDialog
          open={!!confirmId}
          message="Are you sure you want to delete this zone?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      </main>
    </div>
  );
}
