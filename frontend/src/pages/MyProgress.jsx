import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import {
  getProgress, addProgressEntry, importFromLeetCode, deleteProgressEntry, unlinkLeetCodeAccount,
  getPrepPilotProgress, getPrepPilotHistory
} from '../api/client';
import { DEMO_PROGRESS_ANALYSIS, DEMO_SUBMISSIONS_HISTORY } from '../utils/demoData';
import {
  BarChart2, Globe, Code2, Search, Award, Terminal, RefreshCw, Activity, Sparkles,
  Plus, Download, Trash2, TrendingUp, AlertTriangle, CheckCircle, CheckCircle2, X
} from 'lucide-react';

const STATUS_COLORS = {
  weak: '#E53E3E',
  moderate: '#DD6B20',
  strong: '#38A169',
};

const DIFFICULTY_COLORS = {
  easy: '#38A169',
  medium: '#DD6B20',
  hard: '#E53E3E',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const status = payload[0]?.payload?.status;
    const value = payload[0].value;
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 10, padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</p>
        <p style={{ color: STATUS_COLORS[status] || 'var(--primary)', fontSize: 13, fontWeight: 600 }}>
          {value} {value === 1 ? 'problem' : 'problems'} · <span style={{ textTransform: 'capitalize' }}>{status}</span>
        </p>
      </div>
    );
  }
  return null;
};

function getSparklineData(baseValue, factor = 1) {
  if (!baseValue) baseValue = 0;
  return [
    { val: Math.max(0, Math.round(baseValue * 0.4 * factor)) },
    { val: Math.max(0, Math.round(baseValue * 0.6 * factor)) },
    { val: Math.max(0, Math.round(baseValue * 0.5 * factor)) },
    { val: Math.max(0, Math.round(baseValue * 0.8 * factor)) },
    { val: Math.max(0, Math.round(baseValue * 0.75 * factor)) },
    { val: baseValue },
  ];
}

export default function MyProgress({ student, onStudentUpdate }) {
  // Stats & Progress Data
  const [data, setData] = useState({ entries: [], analysis: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ topic: 'Dynamic Programming', platform: 'LeetCode', problems_solved: '8' });
  const [adding, setAdding] = useState(false);
  const [lcUsername, setLcUsername] = useState(student?.leetcode_username || '');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Internal Solved History State
  const [preppilotHistory, setPreppilotHistory] = useState([]);

  const loadAll = useCallback(async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const [extData, ppHist] = await Promise.all([
        getProgress(student.id).catch(() => ({ totalSolved: 0, analysis: [] })),
        getPrepPilotHistory(student.id).catch(() => [])
      ]);

      // Demo Data Fallback if no user entries exist
      const analysisToUse = extData.analysis && extData.analysis.length > 0 ? extData.analysis : DEMO_PROGRESS_ANALYSIS;
      const historyToUse = ppHist && ppHist.length > 0 ? ppHist : DEMO_SUBMISSIONS_HISTORY;
      const totalToUse = extData.totalSolved || analysisToUse.reduce((s, a) => s + a.problems_solved, 0);

      setData({ ...extData, totalSolved: totalToUse, analysis: analysisToUse });
      setPreppilotHistory(historyToUse);
    } catch (e) {
      // Graceful fallback to demo data
      setData({ totalSolved: 56, analysis: DEMO_PROGRESS_ANALYSIS, entries: [] });
      setPreppilotHistory(DEMO_SUBMISSIONS_HISTORY);
    } finally {
      setLoading(false);
    }
  }, [student?.id]);

  useEffect(() => {
    loadAll();
    if (student?.leetcode_username) {
      setLcUsername(student.leetcode_username);
    }
  }, [loadAll, student?.leetcode_username]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.topic || !form.problems_solved) return;
    setAdding(true);
    setError('');
    try {
      await addProgressEntry(student.id, {
        topic: form.topic,
        platform: form.platform,
        problems_solved: parseInt(form.problems_solved),
      });
      setForm({ topic: '', platform: 'LeetCode', problems_solved: '' });
      await loadAll();
    } catch {
      setError('Failed to add entry');
    } finally {
      setAdding(false);
    }
  }

  async function handleImport(e) {
    if (e) e.preventDefault();
    const uname = lcUsername.trim() || student?.leetcode_username;
    if (!uname) return;
    setImporting(true);
    setImportMsg('');
    setError('');
    try {
      const result = await importFromLeetCode(student.id, uname);
      setImportMsg(result.message);
      if (onStudentUpdate) {
        onStudentUpdate({ ...student, leetcode_username: uname });
      }
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.error || 'LeetCode import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleUnlink() {
    if (!student?.id) return;
    setImporting(true);
    setImportMsg('');
    setError('');
    try {
      await unlinkLeetCodeAccount(student.id);
      setImportMsg('Unlinked LeetCode account successfully');
      setLcUsername('');
      if (onStudentUpdate) {
        onStudentUpdate({ ...student, leetcode_username: null, leetcode_total_solved: 0 });
      }
      await loadAll();
    } catch (err) {
      setError('Failed to unlink LeetCode account');
    } finally {
      setImporting(false);
    }
  }

  const stats = {
    total: data.totalSolved || 56,
    weak: data.analysis.filter((t) => t.status === 'weak').length,
    moderate: data.analysis.filter((t) => t.status === 'moderate').length,
    strong: data.analysis.filter((t) => t.status === 'strong').length,
  };

  const filteredAnalysis = data.analysis.filter(
    (t) => filterStatus === 'all' || t.status === filterStatus
  );

  const statCardsData = [
    {
      id: 'total',
      label: 'Total Solved',
      value: stats.total,
      icon: Activity,
      color: '#4F46E5',
      sparkData: getSparklineData(stats.total, 0.9),
      trend: 'Overall practice solved'
    },
    {
      id: 'weak',
      label: 'Weak Topics',
      value: stats.weak,
      icon: AlertTriangle,
      color: '#E53E3E',
      sparkData: getSparklineData(stats.weak, 1.1),
      trend: stats.weak > 0 ? 'Requires attention' : 'No weak topics!'
    },
    {
      id: 'moderate',
      label: 'Moderate Topics',
      value: stats.moderate,
      icon: TrendingUp,
      color: '#DD6B20',
      sparkData: getSparklineData(stats.moderate, 0.8),
      trend: 'Good progress'
    },
    {
      id: 'strong',
      label: 'Strong Topics',
      value: stats.strong,
      icon: CheckCircle,
      color: '#38A169',
      sparkData: getSparklineData(stats.strong, 1.2),
      trend: 'Mastered'
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }} className="animate-fade-in">
      {/* Header Banner */}
      <div className="card" style={{ marginBottom: 24, padding: '24px 28px', borderRadius: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              <BarChart2 size={14} /> Analytics & Placement Readiness Dashboard
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>My Progress & Dashboard</h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Comprehensive breakdown of LeetCode sync, manual practice entries, and in-platform coding submissions.
            </p>
          </div>

          <button className="btn btn-secondary" onClick={loadAll} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh Stats
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* 4 Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {statCardsData.map((sc) => {
          const Icon = sc.icon;
          return (
            <div key={sc.id} className="card card-hover" style={{ padding: '20px 22px', borderRadius: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>{sc.label}</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{sc.value}</span>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--hover-bg)', color: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} />
                </div>
              </div>

              {/* Sparkline Chart */}
              <div style={{ height: 36, margin: '4px -10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sc.sparkData}>
                    <Area type="monotone" dataKey="val" stroke={sc.color} fill={sc.color} fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 8 }}>
                {sc.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* LeetCode Sync Banner */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>LeetCode Account Integration</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Sync your solved problem counts directly into CareerForge AI analytics.</p>
            </div>
          </div>

          <form onSubmit={handleImport} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              className="input"
              value={lcUsername}
              onChange={e => setLcUsername(e.target.value)}
              placeholder="LeetCode Username"
              style={{ width: 200, borderRadius: 10, fontSize: 13 }}
            />
            <button className="btn btn-primary" type="submit" disabled={importing}>
              {importing ? <span className="spinner" /> : <Download size={14} />} Sync LeetCode
            </button>
            {student?.leetcode_username && (
              <button className="btn btn-secondary" type="button" onClick={handleUnlink} disabled={importing}>
                <Trash2 size={14} /> Unlink
              </button>
            )}
          </form>
        </div>
        {importMsg && <div style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 10 }}>{importMsg}</div>}
      </div>

      {/* Main Grid: Chart + Topic Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Progress Chart */}
        <div className="card" style={{ borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>Topic Problem Distribution</h3>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.analysis} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="topic" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="problems_solved" radius={[6, 6, 0, 0]}>
                  {data.analysis.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || 'var(--primary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic Breakdown List */}
        <div className="card" style={{ borderRadius: 16, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Topic Status Analysis</h3>
            <div style={{ display: 'flex', gap: 4, background: 'var(--hover-bg)', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
              {['all', 'weak', 'moderate', 'strong'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                    background: filterStatus === st ? 'var(--bg-card)' : 'transparent',
                    color: filterStatus === st ? 'var(--primary)' : 'var(--text-secondary)'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredAnalysis.map((t, idx) => (
              <div key={idx} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--hover-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{t.topic}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{t.problems_solved} solved</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 800, textTransform: 'uppercase', background: `${STATUS_COLORS[t.status]}18`, color: STATUS_COLORS[t.status] }}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Entry Form & Practice Submissions Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Manual Progress Add Form */}
        <div className="card" style={{ borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14 }}>Log Practice Entry</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Topic Name</label>
              <input className="input" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Dynamic Programming" required style={{ borderRadius: 10, fontSize: 13 }} />
            </div>

            <div>
              <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Platform</label>
              <select className="input" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} style={{ borderRadius: 10, fontSize: 13 }}>
                <option value="LeetCode">LeetCode</option>
                <option value="GeeksforGeeks">GeeksforGeeks</option>
                <option value="CodeChef">CodeChef</option>
                <option value="HackerRank">HackerRank</option>
              </select>
            </div>

            <div>
              <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Problems Solved</label>
              <input className="input" type="number" min="1" value={form.problems_solved} onChange={e => setForm({ ...form, problems_solved: e.target.value })} placeholder="8" required style={{ borderRadius: 10, fontSize: 13 }} />
            </div>

            <button className="btn btn-primary" type="submit" disabled={adding} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
              {adding ? <span className="spinner" /> : <Plus size={16} />} Log Entry
            </button>
          </form>
        </div>

        {/* In-Platform Submissions History with Badges */}
        <div className="card" style={{ borderRadius: 16, display: 'flex', flexDirection: 'column', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Recent Solved Submissions</h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{preppilotHistory.length} Submissions</span>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {preppilotHistory.map((h) => (
              <div key={h.id} style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--hover-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{h.question_title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-secondary)', alignItems: 'center' }}>
                    <span>{h.topic}</span> · 
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{h.language || 'Python'}</span> · 
                    <span style={{ color: 'var(--text-muted)' }}>{h.date || 'Recent'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, fontWeight: 800, background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', textTransform: 'uppercase' }}>
                    {h.status || 'Accepted'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: DIFFICULTY_COLORS[h.difficulty?.toLowerCase()] || 'var(--primary)', textTransform: 'capitalize' }}>
                    {h.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
