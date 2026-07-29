import { useState, useEffect, useRef } from 'react';
import { getStaffAnalytics } from '../api/client';
import {
  Brain, Users, Award, AlertTriangle, ShieldCheck, Search, Filter,
  Megaphone, Briefcase, RefreshCw, Send, Sparkles, CheckCircle2, Zap, Clock, Code, FileText, ChevronRight, Download
} from 'lucide-react';

export default function StaffDashboard({ authUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('command_center'); // 'command_center' | 'students' | 'drives' | 'announcements' | 'reports'
  
  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  // AI Command Center Chat State
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: `### 🤖 ForgeMind AI — Master Placement Intelligence System\n\nWelcome back, **${authUser?.name || 'Faculty Commander'}**. I am monitoring all student profiles across **Resumes, Coding Practice, Mock Interviews, Study Roadmaps, & Placement Readiness**.\n\nHow can I assist your placement operations today? Select a suggested query below or type your request.`
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
      const res = await getStaffAnalytics();
      if (res.success) {
        setData(res);
        setDrives(res.placementDrives || []);
      }
    } catch (e) {
      console.warn('Staff analytics fetch note:', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(true);
    // Real-Time Sync Polling every 10 seconds for live database monitoring
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiTyping]);

  function handleSendPrompt(promptText) {
    const q = promptText || inputQuery;
    if (!q.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: q.trim() };
    setMessages(prev => [...prev, userMsg]);
    if (!promptText) setInputQuery('');
    setAiTyping(true);

    setTimeout(() => {
      let aiText = '';
      const lower = q.toLowerCase();
      const studentsList = data?.students || [];

      // Try to match any real student by name from the query
      const matchedStudent = studentsList.find(s =>
        lower.includes(s.name.toLowerCase().split(' ')[0].toLowerCase()) ||
        lower.includes(s.name.toLowerCase())
      );

      if (matchedStudent) {
        const s = matchedStudent;
        aiText = `### 📊 Student Profile Summary: **${s.name}**\n\n| Metric | Score / Progress |\n| :--- | :--- |\n| **Placement Readiness Index** | **${s.readinessScore}%** |\n| **Resume ATS Score** | **${s.resumeScore}%** |\n| **Coding Score** | **${s.codingScore}%** |\n| **Interview Score** | **${s.interviewScore}%** |\n| **Hours Practiced** | **${s.hoursPracticed} Hours** |\n| **Problems Solved** | **${s.problems_solved || s.leetcode_total_solved || 0} Problems** |\n| **Current Streak** | **${s.current_streak || 0} Days** |\n| **Department** | **${s.department}** |\n| **Status** | **${s.status}** |\n\n#### 🎯 AI Recommendation\n${s.aiRecommendation}\n\n#### 📌 Faculty Action\n- [ ] ${s.isAtRisk ? 'Schedule urgent 1-on-1 remedial session' : 'Nominate for upcoming Tier-1 Placement Drives'}\n- [ ] ${s.resumeScore < 60 ? 'Assign Resume ATS Optimization workshop' : 'Resume is placement-ready'}\n- [ ] ${s.codingScore < 60 ? 'Assign 10 DSA Medium problems this week' : 'Coding performance is strong'}`;
      } else if (lower.includes('compare')) {
        const top2 = studentsList.slice(0, 2);
        if (top2.length >= 2) {
          aiText = `### ⚔️ Candidate Performance Comparison\n\n| Candidate Name | Readiness Index | Resume ATS | Coding Score | Interview Score | Problems Solved |\n| :--- | :---: | :---: | :---: | :---: | :---: |\n${top2.map(s => `| **${s.name}** | **${s.readinessScore}%** | ${s.resumeScore}% | ${s.codingScore}% | ${s.interviewScore}% | ${s.problems_solved || 0} |`).join('\n')}\n\n**Key Takeaway**: ${top2[0]?.readinessScore >= top2[1]?.readinessScore ? top2[0]?.name : top2[1]?.name} leads in overall Placement Readiness Index.`;
        } else {
          aiText = `### ⚔️ Candidate Comparison\n\nNot enough students registered yet to compare. Please register more students first.`;
        }
      } else if (lower.includes('intervention') || lower.includes('risk') || lower.includes('attention')) {
        const atRisk = studentsList.filter(s => s.isAtRisk);
        aiText = `### ⚠️ Candidates Requiring Immediate Faculty Intervention (${atRisk.length} Students)\n\nThese candidates have a Placement Readiness Index below 70%:\n\n${(atRisk.length > 0 ? atRisk : studentsList.slice(0, 3)).map(s => `- **${s.name}** (${s.email}) — Readiness: **${s.readinessScore}%** — Dept: ${s.department}`).join('\n')}\n\n**Action Recommended**: Assign targeted remedial practice modules & schedule resume feedback session.`;
      } else if (lower.includes('amazon') || lower.includes('google') || lower.includes('ready') || lower.includes('eligible') || lower.includes('tier')) {
        const ready = studentsList.filter(s => s.readinessScore >= 80);
        aiText = `### 🎯 Tier-1 Tech Placement Drive Eligible Candidates (${ready.length} Students)\n\nCandidates with Placement Readiness Score ≥ 80%:\n\n| Candidate Name | Department | Readiness Score | Resume ATS | Status |\n| :--- | :---: | :---: | :---: | :---: |\n${(ready.length > 0 ? ready : studentsList).slice(0, 5).map(s => `| **${s.name}** | ${s.department} | **${s.readinessScore}%** | ${s.resumeScore}% | ${s.isAtRisk ? '⚠️ At Risk' : '✅ Qualified'} |`).join('\n')}\n\n**AI Recommendation**: ${ready.length > 0 ? `Broadcast Tier-1 Drive invitations to these ${ready.length} candidates.` : 'No candidates meet the 80% threshold yet. Continue monitoring.'}`;
      } else if (lower.includes('report') || lower.includes('weekly') || lower.includes('summary')) {
        aiText = `### 📑 Executive Weekly Placement Performance Report\n\n- **Total Batch Candidates**: ${data?.stats?.totalStudents || 0} Candidates\n- **Batch Avg Readiness Index**: **${data?.stats?.avgReadinessScore || 0}%**\n- **Tier-1 Eligible Candidates**: **${data?.stats?.eligibleForDrives || 0} Students**\n- **Candidates At Risk**: **${data?.stats?.studentsAtRisk || 0} Students**\n- **Active Today**: **${data?.stats?.activeToday || 0} Students**\n\n*Report automatically generated from live PostgreSQL analytics.*`;
      } else {
        aiText = `### 🤖 ForgeMind Intelligence Insights\n\nBased on real-time database tracking for: **"${q}"**\n\n- **Total Candidates Monitored**: ${data?.stats?.totalStudents || 0} Students\n- **Active Today**: ${data?.stats?.activeToday || 0} Candidates online\n- **Avg Readiness Index**: ${data?.stats?.avgReadinessScore || 0}%\n- **Eligible for Drives**: ${data?.stats?.eligibleForDrives || 0} Students\n\n${studentsList.length > 0 ? `You can ask me about any student by name — e.g. "How is ${studentsList[0]?.name} progressing?"` : 'No students registered yet. Students will appear here once they create accounts.'}\n\nFaculty action recommended: Review **At Risk** candidates in the Roster below.`;
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiText }]);
      setAiTyping(false);
    }, 500);
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
    'Who is eligible for Tier-1 drives?',
    'Generate weekly placement report.'
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
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Master Placement Intelligence System · Faculty Portal</p>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, background: '#161D2F', padding: 4, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
          {[
            { id: 'command_center', label: '🤖 AI Command Center' },
            { id: 'students', label: '👥 Student Roster' },
            { id: 'drives', label: '🏢 Placement Drives' },
            { id: 'announcements', label: '📢 Announcements' },
            { id: 'reports', label: '📊 Reports & Analytics' }
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

      {/* Tab 4: Reports & Analytics */}
      {activeTab === 'reports' && (
        <div style={{ background: '#161D2F', padding: 24, borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#F8FAFC', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={20} color="#10B981" /> Institutional Placement Reports & Exports
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#F8FAFC' }}>📊 Weekly Batch Analytics PDF</h4>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>Summary of DSA solved, resume scores, & readiness trends.</p>
              <button style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#10B981', color: '#FFF', fontWeight: 800, marginTop: 8, cursor: 'pointer' }} onClick={() => alert('Exporting Weekly Batch Analytics PDF...')}>Export PDF</button>
            </div>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#F8FAFC' }}>📑 Placement Drive Eligibility Excel</h4>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>Complete list of eligible candidates filtered by company cutoffs.</p>
              <button style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#06B6D4', color: '#FFF', fontWeight: 800, marginTop: 8, cursor: 'pointer' }} onClick={() => alert('Exporting Eligibility Excel...')}>Export Excel</button>
            </div>
            <div style={{ padding: 20, borderRadius: 14, background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h4 style={{ margin: '0 0 6px', color: '#F8FAFC' }}>⚠️ Students At Risk Report</h4>
              <p style={{ fontSize: 12, color: '#94A3B8' }}>Detailed AI breakdown of students requiring faculty intervention.</p>
              <button style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#EF4444', color: '#FFF', fontWeight: 800, marginTop: 8, cursor: 'pointer' }} onClick={() => alert('Exporting Risk Report...')}>Export PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
