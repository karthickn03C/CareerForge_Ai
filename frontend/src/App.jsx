import { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import ForgeMind from './pages/ForgeMind';
import MyProgress from './pages/MyProgress';
import Practice from './pages/Practice';
import Interview from './pages/Interview';
import MyPlan from './pages/MyPlan';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import Opportunities from './pages/Opportunities';
import StaffDashboard from './pages/StaffDashboard';

import { getMeUser, getStudent, refreshLeetCodeStats } from './api/client';
import {
  Brain, BarChart2, BookOpen, MessageSquare, Calendar, FileText, Compass,
  Sun, Moon, LogOut, Zap, ShieldCheck
} from 'lucide-react';

const STUDENT_TABS = [
  { id: 'forgemind', label: 'ForgeMind AI', icon: Brain },
  { id: 'progress', label: 'My Progress', icon: BarChart2 },
  { id: 'practice', label: 'Practice', icon: BookOpen },
  { id: 'interview', label: 'Mock Interview', icon: MessageSquare },
  { id: 'plan', label: 'My Plan', icon: Calendar },
  { id: 'resume', label: 'Resume Analyzer', icon: FileText },
  { id: 'opportunities', label: 'Opportunity Discovery', icon: Compass },
];

export default function App() {
  const [viewState, setViewState] = useState('landing'); // 'landing' | 'login' | 'register' | 'dashboard'
  const [authUser, setAuthUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [activeTab, setActiveTab] = useState('forgemind');
  const [theme, setTheme] = useState(() => localStorage.getItem('careerforge_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('careerforge_theme', theme);
  }, [theme]);

  // Restore authenticated JWT session on page load / refresh
  useEffect(() => {
    const token = localStorage.getItem('careerforge_token');
    if (token) {
      getMeUser()
        .then(res => {
          if (res.success && res.user) {
            setAuthUser(res.user);
            if (res.user.studentId) loadStudentData(res.user.studentId);
            setViewState('dashboard');
          } else {
            localStorage.removeItem('careerforge_token');
            setViewState('landing');
          }
        })
        .catch(() => {
          localStorage.removeItem('careerforge_token');
          setViewState('landing');
        })
        .finally(() => setLoadingSession(false));
    } else {
      setLoadingSession(false);
    }
  }, []);

  async function loadStudentData(studentId) {
    if (!studentId) return;
    try {
      const s = await getStudent(studentId);
      setStudent(s);
      if (s?.leetcode_username) {
        refreshLeetCodeStats(s.id).catch(() => {});
      }
    } catch (e) {
      console.warn('Student load warning:', e.message);
    }
  }

  function handleAuthSuccess(user, token) {
    if (!user) return;
    setAuthUser(user);
    const targetStudentId = user.studentId || user.id;
    if (targetStudentId) {
      loadStudentData(targetStudentId);
    }
    setStudent({ id: targetStudentId || 1, name: user.name || 'Candidate', email: user.email || '' });
    setViewState('dashboard');
  }

  function handleSignOut() {
    localStorage.removeItem('careerforge_token');
    setAuthUser(null);
    setStudent(null);
    setViewState('landing');
  }

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12, fontWeight: 600 }}>Loading Session...</p>
        </div>
      </div>
    );
  }

  // 1. Landing Page View
  if (viewState === 'landing') {
    return (
      <LandingPage
        onNavigateLogin={() => setViewState('login')}
        onNavigateRegister={() => setViewState('register')}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  // 2. Login Page View
  if (viewState === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleAuthSuccess}
        onNavigateRegister={() => setViewState('register')}
        onBackHome={() => setViewState('landing')}
      />
    );
  }

  // 3. Register Page View
  if (viewState === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={handleAuthSuccess}
        onNavigateLogin={() => setViewState('login')}
        onBackHome={() => setViewState('landing')}
      />
    );
  }

  // 4. Protected Active Dashboard View
  if (!authUser) {
    setViewState('login');
    return null;
  }

  const isStaff = authUser?.role === 'staff' || authUser?.role === 'faculty' || authUser?.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 64, padding: '0 28px',
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setActiveTab('forgemind')}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: isStaff ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          }}>
            {isStaff ? <ShieldCheck size={22} /> : <Zap size={22} />}
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
              CareerForge <span style={{ color: isStaff ? '#10B981' : 'var(--primary)' }}>AI</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: -2 }}>
              {isStaff ? 'Faculty & Staff Placement Portal' : 'AI Placement Preparation Platform'}
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 20, padding: '6px 14px', gap: 6 }}
            title="Toggle Dark/Light Theme"
          >
            {theme === 'dark' ? <Sun size={15} color="#FBBF24" /> : <Moon size={15} color="#4F46E5" />}
            <span style={{ fontSize: 12, fontWeight: 700 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 12px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: isStaff ? '#10B981' : 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {authUser?.name ? authUser.name[0] : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{authUser?.name || 'Candidate'}</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: isStaff ? '#10B981' : 'var(--primary)', textTransform: 'uppercase' }}>
                {isStaff ? 'Faculty / Staff' : 'Student'}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 10 }}
            title="Log Out"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      {isStaff ? (
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
          <StaffDashboard authUser={authUser} theme={theme} />
        </main>
      ) : (
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Sidebar */}
          <aside style={{
            width: 260, flexShrink: 0,
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border-color)',
            padding: '20px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 14px 10px' }}>
              Navigation
            </p>

            {STUDENT_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 12,
                    fontSize: 13, fontWeight: isActive ? 700 : 600,
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.25)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    height: 44
                  }}
                >
                  <Icon size={18} color={isActive ? '#FFFFFF' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Main Protected Student Content View */}
          <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
            {activeTab === 'forgemind' && <ForgeMind student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} onNavigate={(tab) => setActiveTab(tab)} />}
            {activeTab === 'progress' && <MyProgress student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} onStudentUpdate={setStudent} />}
            {activeTab === 'practice' && <Practice student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} />}
            {activeTab === 'interview' && <Interview student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} />}
            {activeTab === 'plan' && <MyPlan student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} />}
            {activeTab === 'resume' && <ResumeAnalyzer student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} />}
            {activeTab === 'opportunities' && <Opportunities student={student || { id: authUser.studentId, name: authUser.name }} theme={theme} />}
          </main>
        </div>
      )}
    </div>
  );
}
