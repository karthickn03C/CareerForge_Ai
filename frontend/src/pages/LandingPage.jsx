import { useState } from 'react';
import {
  Brain, Zap, FileText, MessageSquare, BookOpen, BarChart2, Compass, ArrowRight,
  CheckCircle2, Sparkles, Lock, Mail, Star
} from 'lucide-react';

export default function LandingPage({ onNavigateLogin, onNavigateRegister, theme, toggleTheme }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }} className="animate-fade-in">
      {/* Top Responsive Navigation Bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 68, padding: '0 32px',
        background: 'var(--navbar-bg)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
          }}>
            <Zap size={22} />
          </div>
          <div>
            <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              CareerForge <span style={{ color: 'var(--primary)' }}>AI</span>
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: -2 }}>
              AI Placement Preparation Platform
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="#hero" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</a>
          <a href="#features" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a>
          <a href="#agents" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>AI Agents</a>
          <a href="#about" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>About</a>
          <a href="#contact" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a>
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={onNavigateLogin} style={{ borderRadius: 10, padding: '8px 18px' }}>
            Login
          </button>
          <button className="btn btn-primary btn-sm" onClick={onNavigateRegister} style={{ borderRadius: 10, padding: '8px 20px' }}>
            Register
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" style={{ padding: '90px 24px 70px', textAlign: 'center', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>
          <Sparkles size={16} /> Empowering Engineering Placements with Multi-Agent AI
        </div>

        <h1 style={{ fontSize: 52, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.15, marginBottom: 20, letterSpacing: '-1px' }}>
          CareerForge AI <br />
          <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI Powered Placement Preparation Platform
          </span>
        </h1>

        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 780, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Prepare for placements using AI-powered Resume Analysis, ForgeMind AI, Coding Practice, Mock Interviews, Progress Tracking, and Opportunity Discovery.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={onNavigateRegister} style={{ borderRadius: 14, padding: '15px 36px', fontSize: 16 }}>
            Get Started <ArrowRight size={18} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onNavigateLogin} style={{ borderRadius: 14, padding: '15px 32px', fontSize: 16 }}>
            Login
          </button>
        </div>
      </section>

      {/* AI Agents & Features Section */}
      <section id="agents" style={{ padding: '60px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>Powered by 6 Specialized AI Agents</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>ForgeMind AI orchestrates every agent internally to provide structured placement roadmaps.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
          {[
            { icon: Brain, title: 'ForgeMind AI Orchestrator', desc: 'Central master intelligence router coordinating all career sub-agents like ChatGPT/Claude.' },
            { icon: FileText, title: 'Resume Analyzer', desc: 'Parses PDF/DOCX resumes, calculates ATS score metrics, skill extraction, and grammar feedback.' },
            { icon: BookOpen, title: 'Coding Practice IDE', desc: 'Adaptive DSA problem generator, multi-language editor (Python, Java, C++), and AI hint engine.' },
            { icon: MessageSquare, title: 'Mock Interview Simulator', desc: 'Real-time technical & HR voice mock interviews with STT dictation and detailed scoring.' },
            { icon: BarChart2, title: 'Progress Tracking & Analytics', desc: 'LeetCode sync, topic status analysis, difficulty breakdown, and problem distribution sparklines.' },
            { icon: Compass, title: 'Opportunity Discovery', desc: 'Real-time matching for hackathons, internships, open source programs, and bookmark management.' },
          ].map((agent, i) => {
            const Icon = agent.icon;
            return (
              <div key={i} className="card card-hover" style={{ padding: 28, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={24} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{agent.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{agent.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" style={{ marginTop: 'auto', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', padding: '40px 32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>CareerForge AI</span>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>© 2026 CareerForge AI — AI Placement Preparation Platform. All rights reserved.</p>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            <a href="#hero" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#hero" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</a>
            <a href="#contact" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
