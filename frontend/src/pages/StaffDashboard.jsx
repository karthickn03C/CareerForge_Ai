import { useState, useEffect } from 'react';
import { getStaffAnalytics } from '../api/client';
import {
  Users, Activity, Award, AlertTriangle, ShieldCheck, Search, Filter,
  Megaphone, Briefcase, ChevronRight, CheckCircle, TrendingUp, Sparkles, RefreshCw
} from 'lucide-react';

export default function StaffDashboard({ authUser, theme }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'drives' | 'announcements'
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  // Announcement state
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Google Hardware & SDE Drive 2026 Registration Open', date: 'Today', target: 'Eligibility: Score >= 85' },
    { id: 2, title: 'Mandatory Resume ATS Review for Batch 2026', date: 'Yesterday', target: 'All Final Year Candidates' }
  ]);
  const [newTitle, setNewTitle] = useState('');

  // Placement Drive Form State
  const [drives, setDrives] = useState([]);
  const [newDrive, setNewDrive] = useState({ company: '', role: '', minScore: '80' });

  async function loadData() {
    setLoading(true);
    try {
      const res = await getStaffAnalytics();
      if (res.success) {
        setData(res);
        setDrives(res.placementDrives || []);
      }
    } catch (e) {
      console.warn('Staff analytics fetch warning:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleAddAnnouncement(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAnnouncements(prev => [
      { id: Date.now(), title: newTitle.trim(), date: 'Just now', target: 'All Candidates' },
      ...prev
    ]);
    setNewTitle('');
  }

  function handleAddDrive(e) {
    e.preventDefault();
    if (!newDrive.company || !newDrive.role) return;
    const minS = parseInt(newDrive.minScore, 10) || 75;
    const eligibleCount = (data?.students || []).filter(s => s.readinessScore >= minS).length;
    
    setDrives(prev => [
      { id: Date.now(), company: newDrive.company, role: newDrive.role, minScore: minS, eligibleCount, status: 'Upcoming' },
      ...prev
    ]);
    setNewDrive({ company: '', role: '', minScore: '80' });
  }

  const filteredStudents = (data?.students || []).filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    if (filterRisk === 'atRisk') return matchesSearch && s.isAtRisk;
    if (filterRisk === 'topTier') return matchesSearch && s.readinessScore >= 80;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <RefreshCw size={32} className="spinner" style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Loading Faculty & Staff Management Analytics...</p>
      </div>
    );
  }

  const stats = data?.stats || { totalStudents: 24, activeToday: 18, avgReadinessScore: 79, studentsAtRisk: 3, eligibleForDrives: 15 };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner Header */}
      <div className="card" style={{ padding: '24px 30px', borderRadius: 20, background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))', border: '1px solid rgba(10B, 185, 129, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <ShieldCheck size={24} color="#10B981" />
              <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                Placement Cell & Faculty Management Portal
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Welcome back, {authUser?.name || 'Faculty Leader'}. Tracking {stats.totalStudents} candidate profiles across Placement Readiness, LeetCode stats, & AI risk flags.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {['overview', 'students', 'drives', 'announcements'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: activeTab === tab ? '#10B981' : 'var(--bg-card)',
                  color: activeTab === tab ? '#FFFFFF' : 'var(--text-secondary)',
                  boxShadow: activeTab === tab ? '0 4px 12px rgba(16,185,129,0.3)' : 'none', transition: 'all 0.2s'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL CANDIDATES</span>
            <Users size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{stats.totalStudents}</div>
          <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>🟢 {stats.activeToday} Live Online Today</span>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>AVG READINESS SCORE</span>
            <TrendingUp size={20} color="#10B981" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{stats.avgReadinessScore}%</div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Batch Placement Index</span>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 16, borderLeft: '4px solid #EF4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>STUDENTS AT RISK</span>
            <AlertTriangle size={20} color="#EF4444" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#EF4444' }}>{stats.studentsAtRisk}</div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Score &lt; 70% (Need Intervention)</span>
        </div>

        <div className="card" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>DRIVE ELIGIBLE</span>
            <Award size={20} color="#F59E0B" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)' }}>{stats.eligibleForDrives}</div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Ready for Top Tier Tech Drives</span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Candidate Risk Matrix */}
          <div className="card" style={{ padding: 24, borderRadius: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} color="var(--primary)" /> Candidate Placement Readiness Roster
              </h3>
              <button onClick={() => setActiveTab('students')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                View All ({filteredStudents.length}) →
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px' }}>Student Name</th>
                    <th style={{ padding: '10px 12px' }}>LeetCode Solved</th>
                    <th style={{ padding: '10px 12px' }}>Resume Score</th>
                    <th style={{ padding: '10px 12px' }}>Readiness Score</th>
                    <th style={{ padding: '10px 12px' }}>AI Status & Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.slice(0, 6).map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.name}
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{s.leetcode_total_solved} solved</td>
                      <td style={{ padding: '12px', fontWeight: 700, color: s.resumeScore >= 80 ? '#10B981' : '#F59E0B' }}>{s.resumeScore}%</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                          background: s.isAtRisk ? '#FEE2E2' : '#D1FAE5',
                          color: s.isAtRisk ? '#EF4444' : '#059669'
                        }}>
                          {s.readinessScore}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 260 }}>
                        {s.aiRecommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Placement Drives */}
          <div className="card" style={{ padding: 24, borderRadius: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Briefcase size={18} color="#10B981" /> Active Placement Drives
            </h3>

            {(drives || []).map(d => (
              <div key={d.id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                  <span>{d.company}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#D1FAE5', color: '#059669' }}>{d.status}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{d.role}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginTop: 8 }}>
                  🎯 {d.eligibleCount} Eligible Candidates (Score &gt;= {d.minScore}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Students Roster Tab */}
      {activeTab === 'students' && (
        <div className="card" style={{ padding: 24, borderRadius: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 300 }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
              <input
                className="input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidates by name or email..."
                style={{ paddingLeft: 36 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setFilterRisk('all')}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filterRisk === 'all' ? 'var(--primary)' : 'var(--bg-secondary)', color: filterRisk === 'all' ? '#FFF' : 'var(--text-secondary)' }}
              >
                All ({data?.students?.length})
              </button>
              <button
                onClick={() => setFilterRisk('atRisk')}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filterRisk === 'atRisk' ? '#EF4444' : 'var(--bg-secondary)', color: filterRisk === 'atRisk' ? '#FFF' : 'var(--text-secondary)' }}
              >
                ⚠️ At Risk ({data?.students?.filter(s => s.isAtRisk).length})
              </button>
              <button
                onClick={() => setFilterRisk('topTier')}
                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filterRisk === 'topTier' ? '#10B981' : 'var(--bg-secondary)', color: filterRisk === 'topTier' ? '#FFF' : 'var(--text-secondary)' }}
              >
                🌟 Top Tier
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px' }}>Candidate Name</th>
                  <th style={{ padding: '12px' }}>LeetCode Handle</th>
                  <th style={{ padding: '12px' }}>Resume ATS</th>
                  <th style={{ padding: '12px' }}>Coding Score</th>
                  <th style={{ padding: '12px' }}>Interview Score</th>
                  <th style={{ padding: '12px' }}>Overall Readiness</th>
                  <th style={{ padding: '12px' }}>Faculty Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {s.name}
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>{s.email}</div>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: 'var(--primary)' }}>{s.leetcode_username} ({s.leetcode_total_solved})</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{s.resumeScore}%</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{s.codingScore}%</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{s.interviewScore}%</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: s.isAtRisk ? '#FEE2E2' : '#D1FAE5', color: s.isAtRisk ? '#EF4444' : '#059669' }}>
                        {s.readinessScore}%
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 300 }}>
                      {s.aiRecommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drive Management Tab */}
      {activeTab === 'drives' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <div className="card" style={{ padding: 24, borderRadius: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              ➕ Create Placement Drive Requirement
            </h3>
            <form onSubmit={handleAddDrive} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Company Name</label>
                <input className="input" value={newDrive.company} onChange={e => setNewDrive({ ...newDrive, company: e.target.value })} placeholder="e.g. Google India" required />
              </div>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Target Role</label>
                <input className="input" value={newDrive.role} onChange={e => setNewDrive({ ...newDrive, role: e.target.value })} placeholder="e.g. SDE I" required />
              </div>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Minimum Readiness Cutoff (%)</label>
                <input className="input" type="number" value={newDrive.minScore} onChange={e => setNewDrive({ ...newDrive, minScore: e.target.value })} min="50" max="100" required />
              </div>
              <button className="btn btn-primary" type="submit" style={{ background: '#10B981', borderColor: '#10B981' }}>
                Publish Drive Requirement
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              🏢 Active & Upcoming Placement Drives
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {drives.map(d => (
                <div key={d.id} style={{ padding: 18, borderRadius: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{d.company}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{d.role} · Minimum Cutoff: {d.minScore}%</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>{d.eligibleCount} Eligible</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: '#D1FAE5', color: '#059669', fontWeight: 700 }}>{d.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Announcement Management Tab */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <div className="card" style={{ padding: 24, borderRadius: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              📢 Broadcast Announcement
            </h3>
            <form onSubmit={handleAddAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ fontSize: 12, fontWeight: 700 }}>Announcement Title & Details</label>
                <textarea className="input" rows={4} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Type announcement for all students..." required />
              </div>
              <button className="btn btn-primary" type="submit" style={{ background: '#10B981', borderColor: '#10B981' }}>
                <Megaphone size={16} /> Broadcast to Student Portals
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: 24, borderRadius: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
              📜 Broadcasted Faculty Announcements
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {announcements.map(a => (
                <div key={a.id} style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    <span>{a.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.date}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6, fontWeight: 600 }}>{a.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
