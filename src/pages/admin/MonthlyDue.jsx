import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { fetchMonthlyDueSettings, saveMonthlyDueSetting } from '../../services/paymentService';

export default function MonthlyDue({ user, onLogout }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [setting, setSetting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchMonthlyDueSettings();
        setSetting(data[0] || null);
        if (data[0]) {
          setYear(data[0].year);
          setMonthlyAmount(String(data[0].monthly_amount));
        }
      } catch (err) {
        setError('Unable to load monthly dues.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const summary = useMemo(() => {
    const amount = Number(monthlyAmount || 0);
    const yearlyDue = amount * 12;
    const activeThreshold = yearlyDue * 0.5;
    return { amount, yearlyDue, activeThreshold };
  }, [monthlyAmount]);

  const handleSave = async (e) => {
    e.preventDefault();
    const amount = Number(monthlyAmount);
    if (!year || !Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      setSaving(true);
      const data = await saveMonthlyDueSetting({ year, monthly_amount: amount });
      setSetting(data);
      setError('');
    } catch (err) {
      setError('Unable to save monthly due.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin/monthly-due" />
      <main className="main-panel">
        <Navbar title="Monthly Due Settings" />

        <section className="panel form-panel">
          <h2>Monthly Due</h2>
          <form onSubmit={handleSave} className="stack-form">
            <label>
              <span>Year</span>
              <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </label>
            <label>
              <span>Monthly Due</span>
              <input type="number" step="0.01" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="5.00" />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </form>
        </section>

        {loading ? (
          <div className="loading-box">Loading due settings...</div>
        ) : (
          <section className="panel summary-panel">
            <h3>Summary</h3>
            <div className="summary-grid">
              <div className="summary-item"><strong>Monthly Due:</strong> ₱{summary.amount.toFixed(2)}</div>
              <div className="summary-item"><strong>Yearly Due:</strong> ₱{summary.yearlyDue.toFixed(2)}</div>
              <div className="summary-item"><strong>Active Threshold:</strong> ₱{summary.activeThreshold.toFixed(2)}</div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
