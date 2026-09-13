import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPinned, CheckCircle2, CircleDashed, Wallet, Percent } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { fetchZones, fetchZoneTreasurerProfiles } from '../../services/zoneService';
import { fetchMembers } from '../../services/memberService';
import { fetchMonthlyDueSettings, fetchMonthlyPayments } from '../../services/paymentService';
import { fetchAdditionalFees } from '../../services/feeService';

export default function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [zones, setZones] = useState([]);
  const [members, setMembers] = useState([]);
  const [dueSettings, setDueSettings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fees, setFees] = useState([]);
  const [treasurerProfiles, setTreasurerProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [zonesData, membersData, duesData, feesData, paymentsData, treasurerData] = await Promise.all([
          fetchZones(),
          fetchMembers(),
          fetchMonthlyDueSettings(),
          fetchAdditionalFees(),
          fetchMonthlyPayments({}),
          fetchZoneTreasurerProfiles(),
        ]);
        setZones(zonesData);
        setMembers(membersData);
        setDueSettings(duesData);
        setFees(feesData);
        setPayments(paymentsData);
        setTreasurerProfiles(treasurerData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const currentYear = new Date().getFullYear();
  const currentDue = dueSettings.find((entry) => Number(entry.year) === Number(currentYear)) || dueSettings[0] || null;
  const activeThreshold = Number(currentDue?.monthly_amount || 0) * 12 * 0.5;

  const memberStatusMap = useMemo(() => {
    const map = new Map();

    if (payments.length === 0) {
      members.forEach((member) => map.set(Number(member.id), false));
      return map;
    }

    members.forEach((member) => {
      const totalPaid = payments
        .filter((payment) => Number(payment.member_id) === Number(member.id) && Number(payment.year) === Number(currentYear) && payment.paid)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

      map.set(Number(member.id), totalPaid >= activeThreshold);
    });

    return map;
  }, [members, payments, currentYear, activeThreshold]);

  const activeMembers = useMemo(() => {
    return members.filter((member) => memberStatusMap.get(Number(member.id))).length;
  }, [members, memberStatusMap]);

  const cards = [
    { label: 'Total Zones', value: zones.length, icon: MapPinned },
    { label: 'Total Members', value: members.length, icon: Users },
    { label: 'Active Members', value: activeMembers, icon: CheckCircle2 },
    { label: 'Inactive Members', value: Math.max(members.length - activeMembers, 0), icon: CircleDashed },
    { label: 'Total Paid', value: '₱0.00', icon: Wallet },
    { label: 'Total Unpaid', value: '₱0.00', icon: Percent },
  ];

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/admin" />
      <main className="main-panel">
        <Navbar title="Head Treasurer" />

        <section className="stats-grid">
          {cards.map(({ label, value, icon: Icon }) => (
            <div className="stat-card" key={label}>
              <div className="stat-icon"><Icon size={20} /></div>
              <div>
                <p>{label}</p>
                <h3>{value}</h3>
              </div>
            </div>
          ))}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>All Zones</h2>
          </div>

          {loading ? (
            <div className="loading-box">Loading zones...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Zone Treasurer</th>
                    <th>Members</th>
                    <th>Active</th>
                    <th>Inactive</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">No zones found.</td>
                    </tr>
                  ) : (
                    zones.map((zone) => {
                      const zoneMembers = members.filter((member) => Number(member.zone_id) === Number(zone.id));
                      const activeZoneMembers = zoneMembers.filter((member) => memberStatusMap.get(Number(member.id))).length;
                      const inactiveZoneMembers = zoneMembers.length - activeZoneMembers;
                      const assignedTreasurer = treasurerProfiles.find((treasurer) => treasurer.id === zone.treasurer_id);

                      return (
                        <tr key={zone.id}>
                          <td>{zone.zone_name}</td>
                          <td>{assignedTreasurer ? assignedTreasurer.full_name : 'Unassigned'}</td>
                          <td>{zoneMembers.length}</td>
                          <td>{activeZoneMembers}</td>
                          <td>{inactiveZoneMembers}</td>
                          <td>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/admin/zones/${zone.id}`)}>
                              View
                            </button>
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
      </main>
    </div>
  );
}
