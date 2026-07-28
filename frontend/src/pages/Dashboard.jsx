import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area
} from 'recharts';
import { getProgress, addProgressEntry, importFromLeetCode, deleteProgressEntry, unlinkLeetCodeAccount } from '../api/client';
import { Plus, Download, Trash2, TrendingUp, AlertTriangle, CheckCircle, Activity, RefreshCw, CheckCircle2, X } from 'lucide-react';

const STATUS_COLORS = {
  weak: '#E53E3E',
  moderate: '#DD6B20',
  strong: '#38A169',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const status = payload[0]?.payload?.status;
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 14px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
      }}>
        <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</p>
        <p style={{ color: STATUS_COLORS[status] || 'var(--accent-purple)', fontSize: 13, fontWeight: 600 }}>
          {payload[0].value} problems · <span style={{ textTransform: 'capitalize' }}>{status}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Helper for generating sparkline data points
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

export default function Dashboard({ student, onStudentUpdate }) {
  const [data, setData] = useState({ entries: [], analysis: [] });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ topic: '', platform: 'LeetCode', problems_solved: '' });
  const [adding, setAdding] = useState(false);
  const [lcUsername, setLcUsername] = useState(student?.leetcode_username || '');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getProgress(student.id);
      setData(d);
    } catch (e) {
      setError('Failed to load progress data');
    } finally {
      setLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    load();
    if (student?.leetcode_username) {
      setLcUsername(student.leetcode_username);
    }
  }, [load, student?.leetcode_username]);

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
      await load();
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
      await load();
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
      await load();
    } catch (err) {
      setError('Failed to unlink LeetCode account');
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id) {
    await deleteProgressEntry(id);
    await load();
  }

  const stats = {
    total: data.totalSolved || 0,
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
      color: '#6C5CE7',
      bgColor: '#F3F0FF',
      gradientId: 'sparklineTotal',
      sparkData: getSparklineData(stats.total, 0.9),
      trend: data.entries.length > 0 ? `+${data.entries.length} recent entries` : 'Overall solved'
    },
    {
      id: 'weak',
      label: 'Weak Topics',
      value: stats.weak,
      icon: AlertTriangle,
      color: '#E53E3E',
      bgColor: '#FFF5F5',
      gradientId: 'sparklineWeak',
      sparkData: getSparklineData(stats.weak, 1.1),
      trend: stats.weak > 0 ? 'Requires attention' : 'No weak topics!'
    },
    {
      id: 'moderate',
      label: 'Moderate Topics',
      value: stats.moderate,
      icon: TrendingUp,
      color: '#DD6B20',
      bgColor: '#FFFAF0',
      gradientId: 'sparklineModerate',
      sparkData: getSparklineData(stats.moderate, 0.8),
      trend: 'In progress'
    },
    {
      id: 'strong',
      label: 'Strong Topics',
      value: stats.strong,
      icon: CheckCircle,
      color: '#38A169',
      bgColor: '#F0FFF4',
      gradientId: 'sparklineStrong',
      sparkData: getSparklineData(stats.strong, 1.2),
      trend: 'Mastered'
    },
  ];

  return (
    <div>
      {/* ── Compact Stat Cards Row with Sparklines (Reference Style) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
        {statCardsData.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="sparkline-stat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                    {s.label}
                  </span>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
                    {loading ? '—' : s.value}
                  </div>
                </div>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: s.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Icon size={20} color={s.color} />
                </div>
              </div>

              {/* Sparkline & Trend footer */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                  {s.trend}
                </span>

                {/* Tiny Sparkline Mini Chart */}
                <div style={{ width: 85, height: 35 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={s.sparkData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <defs>
                        <linearGradient id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke={s.color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#${s.gradientId})`}
                        isAnimationActive={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* ── Left Column ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Main Large Chart Card: Topic Progress Overview */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Topic Progress Overview</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Relative strength & weak area classification</p>
              </div>

              {/* Difficulty Filter Tabs (Reference Style) */}
              <div style={{ display: 'flex', gap: 4, background: 'var(--hover-bg)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
                {['all', 'weak', 'moderate', 'strong'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterStatus(tab)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      background: filterStatus === tab ? 'var(--bg-card)' : 'transparent',
                      color: filterStatus === tab ? 'var(--accent-purple)' : 'var(--text-secondary)',
                      boxShadow: filterStatus === tab ? '0 2px 6px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="spinner-lg spinner" />
              </div>
            ) : filteredAnalysis.length === 0 ? (
              <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Activity size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p style={{ fontSize: 14, fontWeight: 500 }}>No progress entries matching this filter</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Add entries or import from LeetCode to view analysis</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredAnalysis} margin={{ top: 10, right: 10, left: -15, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                  <XAxis
                    dataKey="topic"
                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                    height={60}
                  />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(108,92,231,0.04)' }} />
                  <Bar dataKey="problems_solved" radius={[6, 6, 0, 0]}>
                    {filteredAnalysis.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 600 }}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Topics breakdown list */}
          {data.analysis.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Topic Performance Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.analysis.map((topic) => (
                  <div key={topic.topic} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{topic.topic}</span>
                    </div>
                    <div className="progress-bar-track" style={{ flex: 1 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(100, (topic.problems_solved / 30) * 100)}%`,
                          background: STATUS_COLORS[topic.status],
                        }}
                      />
                    </div>
                    <div style={{ width: 80, textAlign: 'right' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{topic.problems_solved} solved</span>
                    </div>
                    <span className={`badge badge-${topic.status}`}>{topic.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column (Secondary Cards & Widgets) ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Secondary Widget Card: LeetCode Account Sync (Reference Style Widget) */}
          <div className="card" style={{ background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#FFFAF0', border: '1px solid #FEEBC8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Download size={18} color="#DD6B20" />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>LeetCode Account Sync</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {student?.leetcode_username ? `Linked as @${student.leetcode_username}` : 'Import public stats by username'}
                </p>
              </div>
            </div>

            {importMsg && (
              <div className="alert alert-success" style={{ marginBottom: 12, fontSize: 12 }}>
                <CheckCircle2 size={15} />
                {importMsg}
              </div>
            )}

            {student?.leetcode_username ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: '#F8F9FC', border: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>@{student.leetcode_username}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Auto-sync active</span>
                  </div>
                  <span className="badge badge-strong">Linked</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={importing}
                    style={{ justifyContent: 'center' }}
                  >
                    {importing ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <RefreshCw size={15} />}
                    <span>{importing ? 'Syncing...' : 'Refresh Stats'}</span>
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={handleUnlink}
                    disabled={importing}
                    style={{ justifyContent: 'center', color: '#E53E3E', borderColor: '#FEB2B2' }}
                  >
                    <X size={15} color="#E53E3E" />
                    <span>Unlink</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  className="input"
                  placeholder="LeetCode username (e.g. naren)"
                  value={lcUsername}
                  onChange={(e) => setLcUsername(e.target.value)}
                />
                <button className="btn btn-cyan" type="submit" disabled={importing || !lcUsername.trim()} style={{ width: '100%', justifyContent: 'center' }}>
                  {importing ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Download size={15} />}
                  <span>{importing ? 'Importing Stats...' : 'Import & Save Account'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Add Manual Progress Form Card */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} color="var(--accent-purple)" />
              Add Manual Progress
            </h3>
            {error && <div className="alert alert-error" style={{ marginBottom: 12, fontSize: 12 }}>{error}</div>}
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label">Topic Name</label>
                <input
                  className="input"
                  placeholder="e.g. Dynamic Programming"
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Platform</label>
                <select
                  className="input"
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                >
                  {['LeetCode', 'HackerRank', 'GeeksforGeeks', 'Codeforces', 'CodeChef', 'Other'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Problems Solved</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  placeholder="e.g. 15"
                  value={form.problems_solved}
                  onChange={(e) => setForm({ ...form, problems_solved: e.target.value })}
                  required
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={adding} style={{ width: '100%', justifyContent: 'center' }}>
                {adding ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Plus size={15} />}
                <span>{adding ? 'Adding...' : 'Add Progress Entry'}</span>
              </button>
            </form>
          </div>

          {/* Recent Entries Card */}
          {data.entries.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Entries</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                {data.entries.slice(0, 8).map((entry) => (
                  <div key={entry.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 10,
                    background: '#F8F9FC', border: '1px solid var(--border)',
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>{entry.topic}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.platform}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 700 }}>+{entry.problems_solved}</span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
