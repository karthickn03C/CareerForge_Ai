import { useState, useEffect, createContext, useContext } from 'react';
import ForgeMind from './pages/ForgeMind';
import MyProgress from './pages/MyProgress';
import Practice from './pages/Practice';
import Interview from './pages/Interview';
import MyPlan from './pages/MyPlan';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import Opportunities from './pages/Opportunities';
import OfflineBanner from './components/OfflineBanner';

import { syncStudent, refreshLeetCodeStats } from './api/client';
import {
  Brain, BarChart2, BookOpen, MessageSquare, Calendar, FileText, Compass,
  Sun, Moon, LogOut, Zap, User, Sparkles, ChevronDown
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

export const GuestContext = createContext(null);

export function useGuest() {
  return useContext(GuestContext);
}

export default function App() {
  const [activeTab, setActiveTab] = useState('forgemind');
  const [guestUser, setGuestUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('careerforge_theme') || 'light');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('careerforge_theme', theme);
  }, [theme]);

  useEffect(() => {
    const isGuest = localStorage.getItem('careerforge_guest') === 'true';
    if (isGuest) {
      const user = {
        id: 'guest',
        name: 'Guest User',
        email: '',
        photo: null,
        isGuest: true,
      };
      setGuestUser(user);
      syncAndLoadGuestStudent(user);
    }
  }, []);

  async function syncAndLoadGuestStudent(user) {
    try {
      const synced = await syncStudent({
        firebase_uid: 'guest_uid_2026',
        name: user.name,
        email: 'guest@careerforge.ai',
        photo_url: null,
      });
      setStudent(synced);
      if (synced.leetcode_username) {
        refreshLeetCodeStats(synced.id).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to sync guest student with backend DB:', err);
      // Fallback guest student object so application operates offline
      setStudent({
        id: 1,
        name: 'Guest User',
        email: 'guest@careerforge.ai',
        leetcode_username: null,
        leetcode_total_solved: 0,
      });
    }
  }

  function handleContinueAsGuest() {
    localStorage.setItem('careerforge_guest', 'true');
    const user = {
      id: 'guest',
      name: 'Guest User',
      email: '',
      photo: null,
      isGuest: true,
    };
    setGuestUser(user);
    syncAndLoadGuestStudent(user);
  }

  function handleLogout() {
    localStorage.removeItem('careerforge_guest');
    setGuestUser(null);
    setStudent(null);
    setShowDropdown(false);
  }

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Modern Unauthenticated Landing / Guest Login Screen
  if (!guestUser || !student) {
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleContinueAsGuest}
              style={{ width: '100%', justifyContent: 'center', gap: 10, borderRadius: 14, fontWeight: 800 }}
            >
              <Sparkles size={18} />
              <span>Continue as Guest</span>
            </button>

            <button
              className="btn btn-secondary btn-lg"
              onClick={handleContinueAsGuest}
              style={{ width: '100%', justifyContent: 'center', gap: 10, borderRadius: 14, fontWeight: 700 }}
            >
              <User size={18} />
              <span>Enter Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <GuestContext.Provider value={guestUser}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        <OfflineBanner />
        {/* Top Navbar */}
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

          {/* Right: Controls & Guest Profile */}
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

            {/* Guest User Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(prev => !prev)}
                className="btn btn-secondary btn-sm"
                style={{
                  borderRadius: 24,
                  padding: '4px 12px 4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 13
                }}>
                  👤
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Guest User</span>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {showDropdown && (
                <div
                  className="card animate-scale-in"
                  style={{
                    position: 'absolute', right: 0, top: 44, width: 210,
                    padding: 8, borderRadius: 16, zIndex: 200,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    onClick={() => { setActiveTab('progress'); setShowDropdown(false); }}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      display: 'flex', alignItems: 'center', gap: 10, border: 'none',
                      background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    <BarChart2 size={16} color="var(--primary)" />
                    <span>My Progress</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('resume'); setShowDropdown(false); }}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      display: 'flex', alignItems: 'center', gap: 10, border: 'none',
                      background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    <FileText size={16} color="var(--primary)" />
                    <span>Resume Analyzer</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('forgemind'); setShowDropdown(false); }}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      display: 'flex', alignItems: 'center', gap: 10, border: 'none',
                      background: 'transparent', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    <Brain size={16} color="var(--primary)" />
                    <span>ForgeMind AI</span>
                  </button>

                  <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />

                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      display: 'flex', alignItems: 'center', gap: 10, border: 'none',
                      background: 'rgba(239, 68, 68, 0.08)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer'
                    }}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Application Body */}
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar Navigation */}
          <aside style={{
            width: 240,
            background: 'var(--sidebar-bg)',
            borderRight: '1px solid var(--border-color)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: isActive ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.3)' : 'none',
                  }}
                >
                  <Icon size={18} color={isActive ? '#ffffff' : 'var(--text-muted)'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Page Content Container */}
          <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
            {activeTab === 'forgemind' && <ForgeMind student={student} />}
            {activeTab === 'progress' && <MyProgress student={student} onNavigateToPractice={() => setActiveTab('practice')} />}
            {activeTab === 'practice' && <Practice student={student} />}
            {activeTab === 'interview' && <Interview student={student} />}
            {activeTab === 'plan' && <MyPlan student={student} />}
            {activeTab === 'resume' && <ResumeAnalyzer student={student} />}
            {activeTab === 'opportunities' && <Opportunities student={student} />}
          </main>
        </div>
      </div>
    </GuestContext.Provider>
  );
}
