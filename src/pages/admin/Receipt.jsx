import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import { fetchMembers } from '../../services/memberService';
import { fetchMonthlyDueSettings, fetchMonthlyPayments } from '../../services/paymentService';
import { fetchAdditionalFees } from '../../services/feeService';
import { supabase } from '../../lib/supabase';

export default function Receipt({ user, onLogout }) {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [zoneName, setZoneName] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ monthlyPaid: 0, monthlyUnpaid: 0, additionalPaid: 0, additionalUnpaid: 0, totalPaid: 0, totalUnpaid: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [memberData, membersData, settingsData, paymentsData, feesData] = await Promise.all([
          fetchMembers(),
          fetchMembers(),
          fetchMonthlyDueSettings(),
          fetchMonthlyPayments({}),
          fetchAdditionalFees(),
        ]);

        const target = membersData.find((item) => String(item.id) === String(memberId));
        setMember(target);
        const zone = await supabase.from('zones').select('*').eq('id', target?.zone_id).maybeSingle();
        setZoneName(zone.data?.zone_name || 'Unknown zone');

        const monthlyRows = paymentsData.filter((p) => Number(p.member_id) === Number(memberId));
        const dueTotal = settingsData.reduce((sum, setting) => sum + Number(setting.monthly_amount || 0) * 12, 0);
        const paidMonthly = monthlyRows.filter((row) => row.paid).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const unpaidMonthly = monthlyRows.filter((row) => !row.paid).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const additionalTotal = feesData.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
        setSummary({
          monthlyPaid: paidMonthly,
          monthlyUnpaid: unpaidMonthly,
          additionalPaid: 0,
          additionalUnpaid: additionalTotal,
          totalPaid: paidMonthly,
          totalUnpaid: unpaidMonthly + additionalTotal,
        });
      } catch (error) {
        console.error('Failed to load receipt data', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [memberId]);

  const handlePrint = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const yStart = 20;

    doc.setFillColor(45, 80, 22);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('MEMBERSHIP PAYMENT RECEIPT', 14, 14);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Member Name: ${member?.full_name || 'Unknown member'}`, 14, yStart + 30);
    doc.text(`Zone: ${zoneName}`, 14, yStart + 38);
    doc.text(`Date Printed: ${new Date().toLocaleDateString()}`, 14, yStart + 46);

    doc.text('YEARLY MONTHLY DUES', 14, yStart + 65);
    doc.text('Year', 14, yStart + 72);
    doc.text('Paid Amount', 80, yStart + 72);
    doc.text('Unpaid Amount', 140, yStart + 72);
    doc.line(14, yStart + 76, 190, yStart + 76);

    doc.text('2026', 14, yStart + 84);
    doc.text(`₱${summary.monthlyPaid.toFixed(2)}`, 80, yStart + 84);
    doc.text(`₱${summary.monthlyUnpaid.toFixed(2)}`, 140, yStart + 84);
    doc.text('TOTAL', 14, yStart + 96);
    doc.text(`₱${summary.monthlyPaid.toFixed(2)}`, 80, yStart + 96);
    doc.text(`₱${summary.monthlyUnpaid.toFixed(2)}`, 140, yStart + 96);

    doc.text('YEARLY ADDITIONAL FEES', 14, yStart + 120);
    doc.text('Year', 14, yStart + 128);
    doc.text('Paid Amount', 80, yStart + 128);
    doc.text('Unpaid Amount', 140, yStart + 128);
    doc.line(14, yStart + 132, 190, yStart + 132);
    doc.text('2026', 14, yStart + 140);
    doc.text(`₱${summary.additionalPaid.toFixed(2)}`, 80, yStart + 140);
    doc.text(`₱${summary.additionalUnpaid.toFixed(2)}`, 140, yStart + 140);
    doc.text('TOTAL', 14, yStart + 152);
    doc.text(`₱${summary.additionalPaid.toFixed(2)}`, 80, yStart + 152);
    doc.text(`₱${summary.additionalUnpaid.toFixed(2)}`, 140, yStart + 152);

    doc.text('PAYMENT SUMMARY', 14, yStart + 176);
    doc.text(`Total Monthly Dues Paid: ₱${summary.monthlyPaid.toFixed(2)}`, 14, yStart + 184);
    doc.text(`Total Monthly Dues Unpaid: ₱${summary.monthlyUnpaid.toFixed(2)}`, 14, yStart + 192);
    doc.text(`Total Additional Fees Paid: ₱${summary.additionalPaid.toFixed(2)}`, 14, yStart + 200);
    doc.text(`Total Additional Fees Unpaid: ₱${summary.additionalUnpaid.toFixed(2)}`, 14, yStart + 208);
    doc.text(`TOTAL PAID: ₱${summary.totalPaid.toFixed(2)}`, 14, yStart + 220);
    doc.text(`TOTAL UNPAID: ₱${summary.totalUnpaid.toFixed(2)}`, 14, yStart + 228);

    doc.line(14, yStart + 245, 75, yStart + 245);
    doc.line(120, yStart + 245, 190, yStart + 245);
    doc.text('Zone Treasurer', 22, yStart + 252);
    doc.text('Head Treasurer', 130, yStart + 252);
    doc.text('Juan Dela Cruz', 22, yStart + 260);
    doc.text(user?.full_name || 'Head Treasurer', 130, yStart + 260);

    doc.save(`${(member?.full_name || 'member').replace(/\s+/g, '_')}_receipt.pdf`);
  };

  if (loading) return <div className="loading-box">Generating receipt...</div>;

  return (
    <div className="panel receipt-panel">
      <div className="receipt-actions">
        <button type="button" className="btn btn-primary" onClick={handlePrint}>Print Receipt</button>
      </div>
      <div className="receipt-block">
        <h2>MEMBERSHIP PAYMENT RECEIPT</h2>
        <p>Member Name: {member?.full_name}</p>
        <p>Zone: {zoneName}</p>
        <p>Date Printed: {new Date().toLocaleDateString()}</p>
      </div>
      <div className="receipt-table">
        <h3>YEARLY MONTHLY DUES</h3>
        <table>
          <thead><tr><th>Year</th><th>Paid Amount</th><th>Unpaid Amount</th></tr></thead>
          <tbody>
            <tr><td>2026</td><td>₱{summary.monthlyPaid.toFixed(2)}</td><td>₱{summary.monthlyUnpaid.toFixed(2)}</td></tr>
            <tr><td>TOTAL</td><td>₱{summary.monthlyPaid.toFixed(2)}</td><td>₱{summary.monthlyUnpaid.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="receipt-table">
        <h3>YEARLY ADDITIONAL FEES</h3>
        <table>
          <thead><tr><th>Year</th><th>Paid Amount</th><th>Unpaid Amount</th></tr></thead>
          <tbody>
            <tr><td>2026</td><td>₱{summary.additionalPaid.toFixed(2)}</td><td>₱{summary.additionalUnpaid.toFixed(2)}</td></tr>
            <tr><td>TOTAL</td><td>₱{summary.additionalPaid.toFixed(2)}</td><td>₱{summary.additionalUnpaid.toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="receipt-summary">
        <h3>PAYMENT SUMMARY</h3>
        <p>Total Monthly Dues Paid: ₱{summary.monthlyPaid.toFixed(2)}</p>
        <p>Total Monthly Dues Unpaid: ₱{summary.monthlyUnpaid.toFixed(2)}</p>
        <p>Total Additional Fees Paid: ₱{summary.additionalPaid.toFixed(2)}</p>
        <p>Total Additional Fees Unpaid: ₱{summary.additionalUnpaid.toFixed(2)}</p>
        <p>TOTAL PAID: ₱{summary.totalPaid.toFixed(2)}</p>
        <p>TOTAL UNPAID: ₱{summary.totalUnpaid.toFixed(2)}</p>
      </div>
      <div className="signature-row">
        <div><div className="signature-line" /><p>Juan Dela Cruz</p><small>Zone Treasurer</small></div>
        <div><div className="signature-line" /><p>{user?.full_name || 'Head Treasurer'}</p><small>Head Treasurer</small></div>
      </div>
    </div>
  );
}
