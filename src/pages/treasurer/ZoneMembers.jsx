import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import { fetchMembersByZone } from '../../services/memberService';
import { supabase } from '../../lib/supabase';

export default function ZoneMembers({ user, onLogout }) {
  const { zoneId } = useParams();
  const [members, setMembers] = useState([]);
  const [zoneName, setZoneName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (user?.role === 'zone_treasurer' && Number(user.zone_id) !== Number(zoneId)) {
          setMembers([]);
          setZoneName('Access denied');
          return;
        }

        const { data: zoneData } = await supabase.from('zones').select('*').eq('id', zoneId).maybeSingle();
        setZoneName(zoneData?.zone_name || 'Zone');
        const membersData = await fetchMembersByZone(Number(zoneId));
        setMembers(membersData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [zoneId, user]);

  const filteredMembers = members.filter((member) => member.full_name.toLowerCase().includes(search.toLowerCase()));

  if (user?.role === 'zone_treasurer' && Number(user.zone_id) !== Number(zoneId)) {
    return (
      <div className="app-shell">
        <Sidebar user={user} onLogout={onLogout} currentPath="/treasurer" />
        <main className="main-panel">
          <Navbar title="Access denied" />
          <section className="panel">
            <div className="empty-state">You can only view your assigned zone.</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} onLogout={onLogout} currentPath="/treasurer" />
      <main className="main-panel">
        <Navbar title={`${zoneName} Members`} />

        <section className="panel">
          <div className="panel-header">
            <h2>Search Members</h2>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member..." />
          </div>
          {loading ? <div className="loading-box">Loading members...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Zone</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? <tr><td colSpan="4" className="empty-state">No members found.</td></tr> : filteredMembers.map((member, index) => (
                    <tr key={member.id}><td>{index + 1}</td><td>{member.full_name}</td><td>{zoneName}</td><td><span className="badge inactive">INACTIVE</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
