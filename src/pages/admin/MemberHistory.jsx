import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { fetchMembers } from '../../services/memberService';
import { fetchMonthlyDueSettings, fetchMonthlyPayments } from '../../services/paymentService';
import { fetchAdditionalFees } from '../../services/feeService';

export default function MemberHistory({ user, onLogout }) {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState([]);
  const [fees, setFees] = useState([]);
  const [monthlyPayments, setMonthlyPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [membersData, settingsData, feesData, paymentsData] = await Promise.all([
          fetchMembers(),
          fetchMonthlyDueSettings(),
          fetchAdditionalFees(),
          fetchMonthlyPayments({}),
        ]);
        setMembers(membersData);
        setSettings(settingsData);
        setFees(feesData);
        setMonthlyPayments(paymentsData);
        const selectedMember = membersData.find((item) => String(item.id) === String(memberId));
        setMember(selectedMember || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [memberId]);

  const years = useMemo(() => {
    const all = new Set(settings.map((item) => item.year));
    fees.forEach((fee) => all.add(Number(fee.year)));
    monthlyPayments.forEach((payment) => all.add(Number(payment.year)));
    return [...all].sort((a, b) => b - a);
  }, [settings, fees, monthlyPayments]);

  const canPrint = !!member;

  if (loading) {
    return <div className="app-shell"><main className="main-panel"><div className="loading-box">Loading payment history...</div></main></div>;
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin/reports" />
      <main className="main-panel">
        <Navbar title="Member Payment History" />

        {member ? (
          <>
            <section className="panel summary-panel">
              <h3>Member Information</h3>
              <div className="summary-grid">
                <div className="summary-item"><strong>Member Name:</strong> {member.full_name}</div>
                <div className="summary-item"><strong>Zone:</strong> {members.find((item) => item.id === member.id)?.zone_id || 'Unassigned'}</div>
              </div>
            </section>

            {years.length === 0 ? <div className="empty-state">No payment records found.</div> : years.map((year) => { 
              const amount = settings.find((item) => item.year === year)?.monthly_amount || 0;
              const yearlyDue = Number(amount) * 12;
              const monthRows = Array.from({ length: 12 }, (_, index) => {
                const month = index + 1;
                const payment = monthlyPayments.find((item) => Number(item.member_id) === Number(member.id) && Number(item.year) === Number(year) && Number(item.month) === month);
                return { month, payment: payment || null };
              });

              return (
                <section className="panel" key={year}>
                  <div className="panel-header"><h3>{year}</h3></div>
                  <div className="history-list">
                    <h4>MONTHLY DUES</h4>
                    {monthRows.map(({ month, payment }) => (
                      <div key={month} className="history-row">
                        <span>{new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' })}</span>
                        <span>₱{Number(amount || 0).toFixed(2)}</span>
                        <span className={`badge ${payment?.paid ? 'paid' : 'unpaid'}`}>{payment?.paid ? 'Paid' : 'Unpaid'}</span>
                      </div>
                    ))}
                  </div>
                  <div className="summary-grid compact">
                    <div className="summary-item"><strong>Yearly Due</strong> ₱{yearlyDue.toFixed(2)}</div>
                    <div className="summary-item"><strong>Total Paid</strong> ₱{monthRows.filter((row) => row.payment?.paid).reduce((sum, row) => sum + Number(row.payment.amount || 0), 0).toFixed(2)}</div>
                    <div className="summary-item"><strong>Total Unpaid</strong> ₱{monthRows.filter((row) => !row.payment?.paid).reduce((sum, row) => sum + Number(row.payment?.amount || amount || 0), 0).toFixed(2)}</div>
                  </div>

                  <div className="history-list">
                    <h4>ADDITIONAL FEES</h4>
                    {fees.filter((fee) => Number(fee.year) === Number(year)).length === 0 ? <div className="empty-state">No additional fees created for this year.</div> : fees.filter((fee) => Number(fee.year) === Number(year)).map((fee) => (
                      <div className="history-row" key={fee.id}>
                        <span>{fee.fee_name}</span>
                        <span>₱{Number(fee.amount).toFixed(2)}</span>
                        <span className="badge unpaid">Unpaid</span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            <section className="panel">
              <h3>COMPLETE PAYMENT HISTORY</h3>
              <div className="summary-grid compact">
                <div className="summary-item"><strong>Total Monthly Dues Paid</strong> ₱0.00</div>
                <div className="summary-item"><strong>Total Monthly Dues Unpaid</strong> ₱0.00</div>
                <div className="summary-item"><strong>Total Additional Fees Paid</strong> ₱0.00</div>
                <div className="summary-item"><strong>Total Additional Fees Unpaid</strong> ₱0.00</div>
                <div className="summary-item"><strong>TOTAL PAID</strong> ₱0.00</div>
                <div className="summary-item"><strong>TOTAL UNPAID</strong> ₱0.00</div>
              </div>

              {canPrint && (
                <div className="report-actions">
                  <button type="button" className="btn btn-primary" onClick={() => navigate(`/admin/receipt/${member.id}`)}>PRINT OFFICIAL RECEIPT</button>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="empty-state">Member not found.</div>
        )}
      </main>
    </div>
  );
}
