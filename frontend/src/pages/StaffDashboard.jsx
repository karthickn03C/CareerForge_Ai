import { useState, useEffect, useRef, useCallback } from 'react';
import { getStaffAnalytics, getStaffActivityFeed, getStudentFullProfile, getCSVDownloadUrl, getWeeklyReport } from '../api/client';
import { useSSE } from '../utils/useSSE';
import ActivityTimeline from '../components/ActivityTimeline';
import {
  Brain, Users, Award, AlertTriangle, ShieldCheck, Search, Filter,
  Megaphone, Briefcase, RefreshCw, Send, Sparkles, CheckCircle2, Zap, Clock, Code, FileText, ChevronRight, Download, Activity, TrendingUp
} from 'lucide-react';

export default function StaffDashboard({ authUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('command_center');
  const [activityFeed, setActivityFeed] = useState([]);
  const [liveIndicator, setLiveIndicator] = useState(false);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  // AI Command Center Chat State
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `### 🤖 ForgeMind AI — Master Placement Intelligence System\n\nWelcome back, **${authUser?.name || 'Faculty Commander'}**. I am connected to the live PostgreSQL database monitoring all student profiles.\n\nAsk me about any student by name, compare candidates, request reports, or ask who needs intervention.`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Form states
  const [announcements, setAnnouncements] = useState([
    { id: 1, title: 'Google Hardware & SDE Placement Drive 2026', date: 'Today', target: 'Minimum Readiness Cutoff: 85%' },
    { id: 2, title: 'Mandatory ATS Resume Optimization Workshop', date: 'Yesterday', target: 'Batch 2026 Candidates' }
  ]);
  const [newTitle, setNewTitle] = useState('');

  const [drives, setDrives] = useState([]);
  const [newDrive, setNewDrive] = useState({ company: '', role: '', minScore: '80', deadline: '2026-08-15' });

  async function loadData(showSpinner = false) {
    if (showSpinner) setLoading(true);
    try {
      const [analyticsRes, feedRes] = await Promise.allSettled([
        getStaffAnalytics(),
        getStaffActivityFeed()
      ]);
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value.success) {
        setData(analyticsRes.value);
        setDrives(analyticsRes.value.placementDrives || []);
      }
      if (feedRes.status === 'fulfilled' && feedRes.value.success) {
        setActivityFeed(feedRes.value.activities || []);
      }
    } catch (e) {
      console.warn('Staff analytics fetch note:', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  // SSE: Replace polling with real-time push events
  const handleSSEEvent = useCallback((eventType, eventData) => {
    // Flash live indicator
    setLiveIndicator(true);
    setTimeout(() => setLiveIndicator(false), 2500);

    // Add to activity feed immediately
    if (eventData?.studentId && eventData?.description) {
      setActivityFeed(prev => [{
        id: Date.now(),
        student_id: eventData.studentId,
        student_name: eventData.metadata?.name || 'Student',
        event_type: eventType,
        description: eventData.description,
        metadata: eventData.metadata || {},
        created_at: eventData.ts || new Date().toISOString()
      }, ...prev].slice(0, 50));
    }

    // Refresh analytics data after any significant event
    if (['student_registered', 'resume_uploaded', 'coding_solved', 'interview_completed', 'plan_generated'].includes(eventType)) {
      setTimeout(() => loadData(false), 800);
    }
  }, []);

  useSSE(handleSSEEvent, true);

  useEffect(() => {
    loadData(true);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  // Async ForgeMind AI — uses real full-profile API for named student queries
  async function handleSendPrompt(promptText) {
    const q = promptText || inputQuery;
    if (!q.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: q.trim() };
    setMessages(prev => [...prev, userMsg]);
    if (!promptText) setInputQuery('');
    setAiTyping(true);

    try {
      const lower = q.toLowerCase();
      const studentsList = data?.students || [];
      let aiText = '';

      // Try to match any real student by name from the query
      const matchedStudent = studentsList.find(s =>
        lower.includes(s.name.toLowerCase().split(' ')[0]) ||
        lower.includes(s.name.toLowerCase())
      );

      if (matchedStudent) {
        // Fetch full profile from API for rich real data
        try {
          const profile = await getStudentFullProfile(matchedStudent.id);
          const s = profile.student;
          const acts = profile.recentActivity || [];
          const coding = profile.codingHistory || [];
          const interviews = profile.interviewSessions || [];

          const activityLines = acts.slice(0, 5).map(a =>
            `- ${new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · ${a.description}`
          ).join('\n') || '- No recent activity recorded';

          const isAtRisk = (s.placement_readiness || 0) < 70;
          aiText = `### 📊 Student Profile: **${s.name}**
*${s.department || 'CSE'} · ${s.year || '4th Year'} · ${s.status || 'New Student'}*

| Metric | Score |
| :--- | :---: |
| **Placement Readiness** | **${s.placement_readiness}%** |
| **Resume ATS Score** | ${s.resume_score}% |
| **Coding Score** | ${s.coding_score}% |
| **Interview Score** | ${s.interview_score}% |
| **Study Hours** | ${s.study_hours}h |
| **Problems Solved** | ${s.problems_solved} |
| **Current Streak** | 🔥 ${s.current_streak} days |

#### 📈 Recent Activity (Last 5 Events)
${activityLines}

#### 💻 Coding History (Last ${Math.min(coding.length, 3)} Problems)
${coding.slice(0, 3).map(c => `- **${c.title}** (${c.difficulty}) · ${c.topic}`).join('\n') || '- No coding history yet'}

#### 🎯 AI Recommendation
${isAtRisk
  ? `⚠️ **At Risk** — Placement readiness is below 70%. Recommend immediate 1-on-1 mentoring session, resume ATS workshop, and DSA practice assignment.`
  : `✅ **Placement Ready** — Strong performance across all metrics. Recommend nominating for Tier-1 drive invitations.`}

#### 📌 Faculty Action Items
- [ ] ${s.resume_score < 50 ? 'Schedule ATS Resume Optimization workshop' : 'Resume is placement-ready ✓'}
- [ ] ${s.coding_score < 50 ? 'Assign 10 DSA Medium/Hard problems this week' : 'Coding performance is strong ✓'}
- [ ] ${s.interview_score < 50 ? 'Schedule mock interview session with faculty' : 'Interview performance is solid ✓'}`;
        } catch (fetchErr) {
          // Fallback to analytics data
          const s = matchedStudent;
          aiText = `### 📊 Student Summary: **${s.name}**\n\n| Metric | Score |\n| :--- | :---: |\n| **Readiness** | **${s.readinessScore}%** |\n| **Resume** | ${s.resumeScore}% |\n| **Coding** | ${s.codingScore}% |\n| **Interview** | ${s.interviewScore}% |\n\n${s.aiRecommendation}`;
        }
      } else if (lower.includes('compare')) {
        const top2 = studentsList.slice(0, 2);
        if (top2.length >= 2) {
          aiText = `### ⚔️ Candidate Comparison\n\n| Candidate | Readiness | Resume | Coding | Interview | Problems |\n| :--- | :---: | :---: | :---: | :---: | :---: |\n${top2.map(s => `| **${s.name}** | **${s.readinessScore}%** | ${s.resumeScore}% | ${s.codingScore}% | ${s.interviewScore}% | ${s.problems_solved || 0} |`).join('\n')}\n\n**Takeaway**: ${top2[0].readinessScore >= top2[1].readinessScore ? top2[0].name : top2[1].name} leads in Placement Readiness.`;
        } else {
          aiText = `Not enough students registered to compare. Ask students to register and use the platform.`;
        }
      } else if (lower.includes('intervention') || lower.includes('risk') || lower.includes('attention')) {
        const atRisk = studentsList.filter(s => s.isAtRisk);
        aiText = `### ⚠️ Students Requiring Intervention (${atRisk.length})\n\n${(atRisk.length > 0 ? atRisk : studentsList.slice(0, 3)).map(s => `- **${s.name}** (${s.department}) — Readiness: **${s.readinessScore}%**`).join('\n') || 'No at-risk students found.'}\n\n**Action**: Assign remedial modules & schedule resume feedback sessions.`;
      } else if (lower.includes('ready') || lower.includes('eligible') || lower.includes('tier') || lower.includes('amazon') || lower.includes('google')) {
        const ready = studentsList.filter(s => s.readinessScore >= 75);
        aiText = `### 🎯 Placement-Ready Candidates (${ready.length})\n\n| Name | Dept | Readiness | Status |\n| :--- | :---: | :---: | :---: |\n${(ready.length > 0 ? ready : studentsList).slice(0, 6).map(s => `| **${s.name}** | ${s.department} | **${s.readinessScore}%** | ${s.isAtRisk ? '⚠️ At Risk' : '✅ Ready'} |`).join('\n')}\n\n${ready.length > 0 ? `**Recommendation**: Send Tier-1 drive invitations to ${ready.length} candidates.` : 'No candidates at 75%+ yet.'}`;
      } else if (lower.includes('report') || lower.includes('weekly') || lower.includes('summary')) {
        try {
          const report = await getWeeklyReport();
          aiText = `### 📑 Weekly Placement Report\n\n**Period**: Last 7 Days · Generated: ${new Date().toLocaleDateString()}\n\n| Metric | Value |\n| :--- | :---: |\n| **Total Students** | **${report.summary?.totalStudents || 0}** |\n| **Avg Readiness** | **${report.summary?.avgPlacementReadiness || 0}%** |\n| **Eligible for Drives** | **${report.summary?.eligibleForDrives || 0}** |\n| **At Risk** | **${report.summary?.atRisk || 0}** |\n| **New Registrations** | ${report.summary?.weeklyActivity?.newRegistrations || 0} |\n| **Resumes Uploaded** | ${report.summary?.weeklyActivity?.resumesUploaded || 0} |\n| **Coding Problems Solved** | ${report.summary?.weeklyActivity?.codingProblems || 0} |\n| **Mock Interviews** | ${report.summary?.weeklyActivity?.mockInterviews || 0} |\n\n*Data sourced from live PostgreSQL. Download CSV for full export.*`;
        } catch(e) {
          aiText = `### 📑 Weekly Report\n\n- **Total Candidates**: ${data?.stats?.totalStudents || 0}\n- **Avg Readiness**: ${data?.stats?.avgReadinessScore || 0}%\n- **Eligible**: ${data?.stats?.eligibleForDrives || 0}\n- **At Risk**: ${data?.stats?.studentsAtRisk || 0}`;
        }
      } else {
        aiText = `### 🤖 ForgeMind Intelligence\n\n**Query**: "${q}"\n\n**Live Stats**:\n- Total Candidates: **${data?.stats?.totalStudents || 0}**\n- Active Today: **${data?.stats?.activeToday || 0}**\n- Avg Readiness: **${data?.stats?.avgReadinessScore || 0}%**\n- Placement Ready: **${data?.stats?.eligibleForDrives || 0}**\n\n${studentsList.length > 0 ? `💡 Try asking: *"How is ${studentsList[0]?.name?.split(' ')[0]} progressing?"* or *"Who needs intervention?"*` : 'No students registered yet.'}`;
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiText }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: `⚠️ Error fetching data: ${err.message}` }]);
    } finally {
      setAiTyping(false);
    }
  }

  function handleAddAnnouncement(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAnnouncements(prev => [
      { id: Date.now(), title: newTitle.trim(), date: 'Just now', target: 'All Batch Candidates' },
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
    setNewDrive({ company: '', role: '', minScore: '80', deadline: '2026-08-15' });
  }

  function handleDownloadCSV() {
    const url = getCSVDownloadUrl();
    const link = document.createElement('a');
    link.href = url;
    link.download = `careerforge_students_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const filteredStudents = (data?.students || []).filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    if (filterRisk === 'atRisk') return matchesSearch && s.isAtRisk;
    if (filterRisk === 'topTier') return matchesSearch && s.readinessScore >= 80;
    return matchesSearch;
  });

  const firstStudentName = data?.students?.[0]?.name?.split(' ')[0] || 'a student';
  const SUGGESTED_PROMPTS = [
    `How is ${firstStudentName} progressing?`,
    'Compare top 2 candidates.',
    'Who needs intervention?',
    'Who is placement ready?',
    'Generate weekly report.',
    'Who is eligible for Tier-1 drives?'
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B1020' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} className="spinner" style={{ color: '#10B981', margin: '0 auto 16px' }} />
          <p style={{ color: '#94A3B8', fontWeight: 700, fontSize: 14 }}>Connecting to Placement Intelligence Command Center...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || { totalStudents: 0, activeToday: 0, avgReadinessScore: 0, studentsAtRisk: 0, eligibleForDrives: 0 };

  return (
    <div style={{ background: '#0B1020', color: '#F8FAFC', minHeight: '100vh', padding: '24px 36px', fontFamily: 'Inter, system-ui, sans-serif' }} className="animate-fade-in">
      {/* Staff Top Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'linear-gradient(135deg, #10B981, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
            <Brain size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#F8FAFC', margin: 0, letterSpacing: '-0.3px' }}>
              ForgeMind AI <span style={{ color: '#10B981', fontSize: 14, fontWeight: 700 }}>Command Center</span>
            </h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: liveIndicator ? '#F59E0B' : '#10B981',
                boxShadow: `0 0 0 ${liveIndicator ? '4' : '3'}px ${liveIndicator ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)'}`,
                transition: 'all 0.3s'
              }} />
              {liveIndicator ? 'Event received — syncing...' : 'Live · Real-time SSE connected'}
            </p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, background: '#161D2F', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
        {[
            { id: 'command_center', label: '🤖 AI Command Center' },
            { id: 'students', label: '👥 Student Roster' },
            { id: 'activity', label: '⚡ Live Feed' },
            { id: 'drives', label: '🏢 Placement Drives' },
            { id: 'announcements', label: '📢 Announcements' },
            { id: 'reports', label: '📊 Reports' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                background: activeTab === t.id ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
                color: activeTab === t.id ? '#FFFFFF' : '#94A3B8',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOP SECTION: FORGEMIND AI WORKSPACE (Large Chat Experience) */}
      <div style={{ background: '#161D2F', borderRadius: 20, border: '1px solid rgba(16,185,129,0.25)', padding: 24, marginBottom: 28, boxShadow: '0 12px 32px rgba(0,0,0,0.4)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#10B981" />
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>ForgeMind Placement Intelligence Assistant</h2>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}>
            🟢 Active Multi-Agent Orchestrator
          </span>
        </div>

        {/* Chat History View */}
        <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingRight: 8, marginBottom: 18 }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '70%' : '92%',
                background: msg.sender === 'user' ? 'linear-gradient(135deg, #10B981, #059669)' : '#0F172A',
                color: '#F8FAFC',
                padding: '16px 20px',
                borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                fontSize: 14,
                lineHeight: 1.6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                whiteSpace: 'pre-line'
              }}
            >
              {msg.text}
            </div>
          ))}

          {aiTyping && (
            <div style={{ alignSelf: 'flex-start', background: '#0F172A', padding: '12px 18px', borderRadius: 16, border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={16} className="spinner" style={{ color: '#10B981' }} />
              <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>ForgeMind AI is querying database analytics...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 12 }}>
          {SUGGESTED_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendPrompt(p)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
                background: '#0F172A', color: '#CBD5E1', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.target.style.borderColor = '#10B981'}
              onMouseLeave={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            >
              💡 {p}
            </button>
          ))}
        </div>

        {/* Large AI Command Input */}
        <form onSubmit={e => { e.preventDefault(); handleSendPrompt(); }} style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask ForgeMind AI anything about your students..."
            style={{
              flex: 1, background: '#0F172A', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14,
              padding: '14px 20px', color: '#F8FAFC', fontSize: 14, outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={aiTyping}
            style={{
              padding: '0 24px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFF', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <Send size={16} /> Ask AI
          </button>
        </form>
      </div>

      {/* STAFF OVERVIEW STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#161D2F', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span>STUDENTS ONLINE</span>
            <Users size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#F8FAFC' }}>{stats.activeToday} / {stats.totalStudents}</div>
          <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>🟢 Active Logins Today</span>
        </div>

        <div style={{ background: '#161D2F', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span>PLACEMENT READY</span>
            <Award size={18} color="#06B6D4" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#F8FAFC' }}>{stats.eligibleForDrives}</div>
          <span style={{ fontSize: 11, color: '#06B6D4', fontWeight: 700 }}>Score ≥ 80% Qualified</span>
        </div>

        <div style={{ background: '#161D2F', padding: 20, borderRadius: 16, borderLeft: '4px solid #EF4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span>NEEDS ATTENTION</span>
            <AlertTriangle size={18} color="#EF4444" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#EF4444' }}>{stats.studentsAtRisk}</div>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Score &lt; 70% (At Risk)</span>
        </div>

        <div style={{ background: '#161D2F', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span>AVG RESUME SCORE</span>
            <FileText size={18} color="#F59E0B" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#F8FAFC' }}>82%</div>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Batch ATS Average</span>
        </div>

        <div style={{ background: '#161D2F', padding: 20, borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span>AVG CODING SCORE</span>
            <Code size={18} color="#10B981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#F8FAFC' }}>79%</div>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>LeetCode Solved Trend</span>
        </div>
      </div>

      {/* AI GENERATED INSIGHTS CARDS */}
      <div style={{ background: '#161D2F', borderRadius: 18, border: '1px solid rgba(6,182,212,0.3)', padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#06B6D4', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} /> Real-Time AI Placement Insights
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <div style={{ background: '#0F172A', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#E2E8F0' }}>
            🌟 <strong>12 Students</strong> are fully ready for Tier-1 Product Tech drives (Amazon, Google).
          </div>
          <div style={{ background: '#0F172A', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#E2E8F0' }}>
            ⚠️ <strong>4 Candidates</strong> require practice in Dynamic Programming & Graph Traversal.
          </div>
          <div style={{ background: '#0F172A', padding: 14, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', fontSize: 13, color: '#E2E8F0' }}>
            📑 <strong>3 Students</strong> should update resume project URLs before upcoming drive.
          </div>
        </div>
      </div>

      {/* MAIN TAB CONTENT RENDERING */}

      {/* Tab 1: Student Roster */}
      {(activeTab === 'command_center' || activeTab === 'students') && (
        <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
              👥 Student Placement Readiness Roster
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', width: 260 }}>
                <Search size={16} color="#64748B" style={{ position: 'absolute', left: 12, top: 11 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  style={{ background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px 8px 36px', color: '#FFF', fontSize: 13, outline: 'none', width: '100%' }}
                />
              </div>

              <button onClick={() => setFilterRisk('all')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filterRisk === 'all' ? '#10B981' : '#0F172A', color: filterRisk === 'all' ? '#FFF' : '#94A3B8' }}>All</button>
              <button onClick={() => setFilterRisk('atRisk')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filterRisk === 'atRisk' ? '#EF4444' : '#0F172A', color: filterRisk === 'atRisk' ? '#FFF' : '#94A3B8' }}>⚠️ At Risk</button>
              <button onClick={() => setFilterRisk('topTier')} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: filterRisk === 'topTier' ? '#06B6D4' : '#0F172A', color: filterRisk === 'topTier' ? '#FFF' : '#94A3B8' }}>🌟 Top Tier</button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '12px' }}>Student</th>
                  <th style={{ padding: '12px' }}>Department</th>
                  <th style={{ padding: '12px' }}>Year</th>
                  <th style={{ padding: '12px' }}>Resume</th>
                  <th style={{ padding: '12px' }}>Coding</th>
                  <th style={{ padding: '12px' }}>Interview</th>
                  <th style={{ padding: '12px' }}>Hours Practiced</th>
                  <th style={{ padding: '12px' }}>Readiness Index</th>
                  <th style={{ padding: '12px' }}>AI Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: '#F8FAFC' }}>
                      {s.name}
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400 }}>{s.email}</div>
                    </td>
                    <td style={{ padding: '14px 12px', color: '#CBD5E1', fontWeight: 600 }}>{s.department}</td>
                    <td style={{ padding: '14px 12px', color: '#94A3B8' }}>{s.year}</td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: s.resumeScore >= 80 ? '#10B981' : '#F59E0B' }}>{s.resumeScore}%</td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: s.codingScore >= 80 ? '#10B981' : '#F59E0B' }}>{s.codingScore}%</td>
                    <td style={{ padding: '14px 12px', fontWeight: 700, color: s.interviewScore >= 80 ? '#10B981' : '#F59E0B' }}>{s.interviewScore}%</td>
                    <td style={{ padding: '14px 12px', fontWeight: 600, color: '#06B6D4' }}>{s.hoursPracticed} Hrs</td>
                    <td style={{ padding: '14px 12px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, background: s.isAtRisk ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)', color: s.isAtRisk ? '#EF4444' : '#10B981', border: `1px solid ${s.isAtRisk ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}` }}>
                        {s.readinessScore}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 12px', fontSize: 12, color: '#94A3B8', maxWidth: 280 }}>
                      {s.aiRecommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Placement Drives */}
      {activeTab === 'drives' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>
          <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginBottom: 16 }}>➕ Post Placement Drive</h3>
            <form onSubmit={handleAddDrive} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>Company Name</label>
                <input style={{ width: '100%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, color: '#FFF', outline: 'none' }} value={newDrive.company} onChange={e => setNewDrive({ ...newDrive, company: e.target.value })} placeholder="e.g. Google India" required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>Target Role</label>
                <input style={{ width: '100%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, color: '#FFF', outline: 'none' }} value={newDrive.role} onChange={e => setNewDrive({ ...newDrive, role: e.target.value })} placeholder="e.g. SDE I" required />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 6 }}>Minimum Cutoff Score (%)</label>
                <input type="number" style={{ width: '100%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 10, color: '#FFF', outline: 'none' }} value={newDrive.minScore} onChange={e => setNewDrive({ ...newDrive, minScore: e.target.value })} min="50" max="100" required />
              </div>
              <button type="submit" style={{ padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>
                Publish Requirement
              </button>
            </form>
          </div>

          <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginBottom: 16 }}>🏢 Active Placement Drives</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {drives.map(d => (
                <div key={d.id} style={{ padding: 18, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, color: '#F8FAFC' }}>{d.company}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>{d.role} · Minimum Cutoff: {d.minScore}%</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: '#10B981' }}>{d.eligibleCount} Eligible</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.2)', color: '#10B981', fontWeight: 700 }}>{d.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Announcements */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>
          <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginBottom: 16 }}>📢 Broadcast Announcement</h3>
            <form onSubmit={handleAddAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <textarea style={{ width: '100%', background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, color: '#FFF', outline: 'none' }} rows={4} value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Type announcement for all students..." required />
              <button type="submit" style={{ padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>
                Broadcast to Portals
              </button>
            </form>
          </div>

          <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', marginBottom: 16 }}>📜 Active Broadcasts</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {announcements.map(a => (
                <div key={a.id} style={{ padding: 16, borderRadius: 12, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14, color: '#F8FAFC' }}>
                    <span>{a.title}</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>{a.date}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#10B981', marginTop: 6, fontWeight: 600 }}>{a.target}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Activity Feed */}
      {activeTab === 'activity' && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#F8FAFC', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={18} color="#10B981" /> Real-Time Student Activity Feed
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                background: liveIndicator ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                color: liveIndicator ? '#F59E0B' : '#10B981',
                border: `1px solid ${liveIndicator ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}`,
                transition: 'all 0.3s'
              }}>
                {liveIndicator ? '⚡ Syncing...' : '🟢 Live'}
              </span>
            </h3>
            <span style={{ fontSize: 11, color: '#64748B' }}>{activityFeed.length} events tracked</span>
          </div>
          <ActivityTimeline
            activities={activityFeed}
            showStudent={true}
            dark={true}
            title="Live Activity Feed"
            maxItems={15}
          />
        </div>
      )}

      {/* Tab: Reports & Analytics */}
      {activeTab === 'reports' && (
        <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={20} color="#10B981" /> Placement Reports & Data Exports
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#F8FAFC' }}>📊 Full Student Export (CSV)</h4>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>All students with resume scores, coding scores, interview scores, placement readiness. Opens in Excel.</p>
              <button
                style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#10B981', color: '#FFF', fontWeight: 800, marginTop: 8, cursor: 'pointer' }}
                onClick={handleDownloadCSV}
              >
                ⬇ Download CSV (Excel)
              </button>
            </div>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#F8FAFC' }}>📑 Full Data Export (JSON)</h4>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>Complete JSON export of all student records for external tools and integrations.</p>
              <button
                style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#06B6D4', color: '#FFF', fontWeight: 800, marginTop: 8, cursor: 'pointer' }}
                onClick={() => { window.open(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/reports/download/json' : 'https://careerforge-ai-2bbv.onrender.com/api/reports/download/json', '_blank'); }}
              >
                ⬇ Download JSON
              </button>
            </div>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#F8FAFC' }}>⚠️ At-Risk Student Report</h4>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>
                {(data?.stats?.studentsAtRisk || 0)} students below 70% readiness. Download CSV to see details.
              </p>
              <button
                style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#EF4444', color: '#FFF', fontWeight: 800, marginTop: 8, cursor: 'pointer' }}
                onClick={handleDownloadCSV}
              >
                ⬇ Export At-Risk CSV
              </button>
            </div>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(16,185,129,0.2)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#10B981' }}>📈 Live Quick Stats</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                {[
                  { label: 'Total Students', value: data?.stats?.totalStudents || 0 },
                  { label: 'Avg Readiness', value: `${data?.stats?.avgReadinessScore || 0}%` },
                  { label: 'Eligible', value: data?.stats?.eligibleForDrives || 0 },
                  { label: 'At Risk', value: data?.stats?.studentsAtRisk || 0 }
                ].map((item, i) => (
                  <div key={i} style={{ padding: '8px 12px', background: '#161D2F', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981' }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
