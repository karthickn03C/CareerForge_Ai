import { useState, useEffect } from 'react';
import ForgeMind from './pages/ForgeMind';
import MyProgress from './pages/MyProgress';
import Practice from './pages/Practice';
import Interview from './pages/Interview';
import MyPlan from './pages/MyPlan';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import Opportunities from './pages/Opportunities';
import OfflineBanner from './components/OfflineBanner';

import { syncStudent, refreshLeetCodeStats } from './api/client';
import { signInWithGoogle, signOutUser } from './firebase';
import {
  Brain, BarChart2, BookOpen, MessageSquare, Calendar, FileText, Compass,
  Sun, Moon, LogOut, Zap, User, Sparkles
} from 'lucide-react';

const TABS = [
  { id: 'forgemind', label: 'ForgeMind AI', icon: Brain },
  { id: 'progress', label: 'My Progress', icon: BarChart2 },
  { id: 'practice', label: 'Practice', icon: BookOpen },
  { id: 'interview', label: 'Mock Interview', icon: MessageSquare },
  { id: 'plan', label: 'My Plan', icon: Calendar },
  { id: 'resume', label: 'Resume Analyzer', icon: FileText },
  { id: 'opportunities', label: 'Opportunity Discovery', icon: Compass },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('forgemind');
  const [authUser, setAuthUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('careerforge_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('careerforge_theme', theme);
  }, [theme]);

  useEffect(() => {
    const savedUser = localStorage.getItem('preppilot_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setAuthUser(parsed);
        syncAndLoadStudent(parsed);
      } catch (e) {
        localStorage.removeItem('preppilot_auth_user');
      }
    }
  }, []);

  async function syncAndLoadStudent(user) {
    try {
      const synced = await syncStudent({
        firebase_uid: user.uid,
        name: user.name,
        email: user.email,
        photo_url: user.photoURL,
      });
      setStudent(synced);
      if (synced.leetcode_username) {
        refreshLeetCodeStats(synced.id).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to sync user with backend DB:', err);
    }
  }

  async function handleGoogleSignIn() {
    setSigningIn(true);
    try {
      const user = await signInWithGoogle();
      setAuthUser(user);
      localStorage.setItem('preppilot_auth_user', JSON.stringify(user));
      await syncAndLoadStudent(user);
    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOutUser();
    setAuthUser(null);
    setStudent(null);
    localStorage.removeItem('preppilot_auth_user');
  }

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Unauthenticated Login / Register Landing Screen
  if (!authUser || !student) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}>
        <div className="card animate-slide-up" style={{ maxWidth: 460, width: '100%', textAlign: 'center', padding: '44px 36px', borderRadius: 24 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
          }}>
            <Zap size={34} color="white" />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            CareerForge AI
          </h1>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            AI Career Intelligence Platform
          </p>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 32, lineHeight: 1.6 }}>
            Empower your placement prep with AI agents for DSA progress tracking, adaptive practice, voice mock interviews, resume analysis, and opportunity discovery.
          </p>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleGoogleSignIn}
            disabled={signingIn}
            style={{ width: '100%', justifyContent: 'center', gap: 12, borderRadius: 14 }}
          >
            {signingIn ? (
              <>
                <span className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <OfflineBanner />
      {/* Top Re-aligned Clean Navbar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 64, padding: '0 28px',
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          }}>
            <Zap size={22} />
          </div>
          <div>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
              CareerForge <span style={{ color: 'var(--primary)' }}>AI</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: -2 }}>
              AI Career Intelligence Platform
            </span>
          </div>
        </div>

        {/* Right: Clean Controls (Dark Mode Toggle + User Profile + Logout) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: 20, padding: '6px 14px', gap: 6 }}
            title="Toggle Dark/Light Theme"
          >
            {theme === 'dark' ? <Sun size={15} color="#FBBF24" /> : <Moon size={15} color="#4F46E5" />}
            <span style={{ fontSize: 12, fontWeight: 700 }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {student.photo_url ? (
              <img src={student.photo_url} alt={student.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {student.name ? student.name[0] : 'U'}
              </div>
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{student.name}</span>
          </div>

          {/* Logout */}
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

      {/* Main Body Grid Layout */}
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

          {TABS.map((tab) => {
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

        {/* Main Content View Container */}
        <main style={{ flex: 1, padding: '28px 36px', overflowY: 'auto' }}>
          {activeTab === 'forgemind' && <ForgeMind student={student} theme={theme} onNavigate={(tab) => setActiveTab(tab)} />}
          {activeTab === 'progress' && <MyProgress student={student} theme={theme} onStudentUpdate={setStudent} />}
          {activeTab === 'practice' && <Practice student={student} theme={theme} />}
          {activeTab === 'interview' && <Interview student={student} theme={theme} />}
          {activeTab === 'plan' && <MyPlan student={student} theme={theme} />}
          {activeTab === 'resume' && <ResumeAnalyzer student={student} theme={theme} />}
          {activeTab === 'opportunities' && <Opportunities student={student} theme={theme} />}
        </main>
      </div>
    </div>
  );
}
