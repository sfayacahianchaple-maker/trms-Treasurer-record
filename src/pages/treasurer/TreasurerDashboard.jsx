import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { fetchMembersByZone } from '../../services/memberService';
import { fetchMonthlyDueSettings, fetchMonthlyPayments, upsertMonthlyPayment } from '../../services/paymentService';
import { supabase } from '../../lib/supabase';

export default function TreasurerDashboard({ user, onLogout }) {
  const [zone, setZone] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dueSettings, setDueSettings] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?.zone_id) return;
        const [{ data: zoneData }, membersData, dueData, paymentsData] = await Promise.all([
          supabase.from('zones').select('*').eq('id', user.zone_id).maybeSingle(),
          fetchMembersByZone(user.zone_id),
          fetchMonthlyDueSettings(),
          fetchMonthlyPayments({ year }),
        ]);
        setZone(zoneData || null);
        setMembers(membersData);
        setDueSettings(dueData);
        setPayments(paymentsData);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };

    load();
  }, [user, year]);

  const currentDue = dueSettings.find((entry) => Number(entry.year) === Number(year)) || dueSettings[0] || null;
  const monthAmount = Number(currentDue?.monthly_amount || 5);
  const activeThreshold = monthAmount * 12 * 0.5;

  const handleMonthToggle = async (memberId, monthNumber, checked) => {
    try {
      await upsertMonthlyPayment({
        member_id: memberId,
        year,
        month: monthNumber,
        amount: monthAmount,
        paid: !checked,
        paid_date: !checked ? new Date().toISOString() : null,
        recorded_by: user?.id || null,
      });

      const updatedPayments = await fetchMonthlyPayments({ year });
      setPayments(updatedPayments);
    } catch (error) {
      console.error('Unable to update payment status:', error);
    }
  };

  const activeMembers = payments.length === 0
    ? 0
    : members.filter((member) => {
        const totalPaid = payments
          .filter((payment) => Number(payment.member_id) === Number(member.id) && Number(payment.year) === Number(year) && payment.paid)
          .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
        return totalPaid >= activeThreshold;
      }).length;

  const inactiveMembers = members.length - activeMembers;

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/treasurer" />
      <main className="main-panel">
        <Navbar title={`Welcome, ${user?.full_name || 'Treasurer'}`} />

        <section className="panel summary-panel">
          <div className="summary-grid compact">
            <div className="summary-item"><strong>Assigned Zone:</strong> {zone?.zone_name || '—'}</div>
            <div className="summary-item"><strong>Total Members:</strong> {members.length}</div>
            <div className="summary-item"><strong>Active Members:</strong> {activeMembers}</div>
            <div className="summary-item"><strong>Inactive Members:</strong> {inactiveMembers}</div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Payments</h2>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          {loading ? <div className="loading-box">Loading zone payment records...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Status</th>
                    {Array.from({ length: 12 }, (_, i) => <th key={i}>{new Date(year, i, 1).toLocaleString('en-US', { month: 'short' })}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? <tr><td colSpan={15} className="empty-state">No members found.</td></tr> : members.map((member, index) => {
                    const totalPaid = payments
                      .filter((payment) => Number(payment.member_id) === Number(member.id) && Number(payment.year) === Number(year) && payment.paid)
                      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
                    const isActive = payments.length > 0 && totalPaid >= activeThreshold;

                    return (
                      <tr key={member.id}>
                        <td>{index + 1}</td>
                        <td>{member.full_name}</td>
                        <td><span className={`badge ${isActive ? 'active' : 'inactive'}`}>{isActive ? 'ACTIVE' : 'INACTIVE'}</span></td>
                        {Array.from({ length: 12 }, (_, monthIndex) => {
                          const monthNumber = monthIndex + 1;
                          const isPaid = Boolean(payments.find((payment) => Number(payment.member_id) === Number(member.id) && Number(payment.year) === Number(year) && Number(payment.month) === monthNumber && payment.paid));

                          return (
                            <td key={`${member.id}-${monthNumber}`}>
                              <input
                                type="checkbox"
                                checked={isPaid}
                                onChange={() => handleMonthToggle(member.id, monthNumber, isPaid)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
