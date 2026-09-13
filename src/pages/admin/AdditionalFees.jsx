import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { fetchAdditionalFees, createAdditionalFee, updateAdditionalFee, deleteAdditionalFee } from '../../services/feeService';
import ConfirmDialog from '../../components/ConfirmDialog';

export default function AdditionalFees({ user, onLogout }) {
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState({ fee_name: '', amount: '', year: new Date().getFullYear(), description: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setFees(await fetchAdditionalFees(new Date().getFullYear()));
    } catch (err) {
      setError('Unable to load additional fees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fee_name.trim()) return setError('Please enter a fee name.');
    if (!Number(form.amount) || Number(form.amount) <= 0) return setError('Please enter a valid amount.');

    try {
      setSaving(true);
      const payload = {
        fee_name: form.fee_name.trim(),
        amount: Number(form.amount),
        year: Number(form.year),
        description: form.description.trim(),
      };
      if (editingId) {
        await updateAdditionalFee(editingId, payload);
      } else {
        await createAdditionalFee(payload);
      }
      setForm({ fee_name: '', amount: '', year: new Date().getFullYear(), description: '' });
      setEditingId(null);
      setError('');
      fetchData();
    } catch (err) {
      setError('Unable to save additional fee.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await deleteAdditionalFee(confirmId);
      setConfirmId(null);
      fetchData();
    } catch (err) {
      setError('Unable to delete additional fee.');
    }
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin/additional-fees" />
      <main className="main-panel">
        <Navbar title="Additional Fees" />

        <section className="panel form-panel">
          <h2>{editingId ? 'Edit Additional Fee' : 'Add Additional Fee'}</h2>
          <form onSubmit={handleSubmit} className="stack-form">
            <label><span>Fee Name</span><input value={form.fee_name} onChange={(e) => setForm({ ...form, fee_name: e.target.value })} /></label>
            <label><span>Amount</span><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label><span>Year</span><input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
            <label><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            {error && <div className="error-box">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header"><h2>Fee List</h2></div>
          {loading ? <div className="loading-box">Loading fees...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Fee Name</th><th>Amount</th><th>Year</th><th>Description</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {fees.length === 0 ? <tr><td colSpan="5" className="empty-state">No additional fees created for this year.</td></tr> : fees.map((fee) => (
                    <tr key={fee.id}>
                      <td>{fee.fee_name}</td>
                      <td>₱{Number(fee.amount).toFixed(2)}</td>
                      <td>{fee.year}</td>
                      <td>{fee.description || '-'}</td>
                      <td className="actions-cell">
                        <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(fee.id); setForm({ fee_name: fee.fee_name, amount: String(fee.amount), year: fee.year, description: fee.description || '' }); }}>Edit</button>
                        <button type="button" className="btn btn-danger" onClick={() => setConfirmId(fee.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ConfirmDialog open={!!confirmId} message="Are you sure you want to delete this additional fee?" onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
      </main>
    </div>
  );
}
