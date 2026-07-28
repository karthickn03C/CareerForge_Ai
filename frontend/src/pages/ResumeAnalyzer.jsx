import { useState, useEffect, useRef } from 'react';
import {
  uploadResumeFile,
  uploadResumeText,
} from '../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PieChart, Pie, Cell
} from 'recharts';
import {
  Upload, FileText, User, Mail, Phone, MapPin, Briefcase,
  GraduationCap, Code, Link, Award, CheckCircle2,
  AlertTriangle, Zap, Target, TrendingUp, Download,
  ChevronDown, ChevronUp, Star, BookOpen, Layers, Globe,
  Check, FileSpreadsheet, ShieldAlert, Sparkles, RefreshCw, Brain
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────
   SVG Circular Score Ring
──────────────────────────────────────────────────────────────────── */
function ScoreRing({ value = 0, size = 120, strokeW = 10, color = '#6C5CE7', track = '#EDF2F7', label, grade }) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(value, 100) / 100) * circ;

  let ringColor = color;
  if (!color || color === 'auto') {
    if (value >= 90) ringColor = '#38A169';
    else if (value >= 70) ringColor = '#3182CE';
    else if (value >= 50) ringColor = '#DD6B20';
    else ringColor = '#E53E3E';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size} height={size}
          style={{ transform: 'rotate(-90deg)', display: 'block' }}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeW} stroke={track} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r} strokeWidth={strokeW}
            stroke={ringColor} fill="none" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
            {value}
          </span>
          {grade && (
            <span style={{ fontSize: size * 0.13, fontWeight: 700, color: ringColor, marginTop: 2 }}>{grade}</span>
          )}
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center' }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ── Skill Chip ─────────────────────────────────────────────────── */
const CHIP_PALETTES = [
  { bg: '#F3F0FF', color: '#6C5CE7', border: '#D6D0FF' },
  { bg: '#EBF8FF', color: '#3182CE', border: '#BEE3F8' },
  { bg: '#E6FFFA', color: '#2C7A7B', border: '#B2F5EA' },
  { bg: '#F0FFF4', color: '#276749', border: '#9AE6B4' },
  { bg: '#FFFAF0', color: '#C05621', border: '#FEEBC8' },
  { bg: '#FFF5F5', color: '#C53030', border: '#FED7D7' },
  { bg: '#FAF5FF', color: '#6B46C1', border: '#E9D8FD' },
  { bg: '#EBF4FF', color: '#2B6CB0', border: '#C3DAFE' },
];
function SkillChip({ label, idx = 0, size = 'md' }) {
  const p = CHIP_PALETTES[idx % CHIP_PALETTES.length];
  const fs = size === 'sm' ? 11 : 12;
  const pad = size === 'sm' ? '3px 9px' : '4px 12px';
  return (
    <span style={{
      background: p.bg, color: p.color, border: `1px solid ${p.border}`,
      padding: pad, borderRadius: 20, fontSize: fs, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', lineHeight: 1.5,
    }}>
      {label}
    </span>
  );
}

/* ── Section Header ─────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title, iconColor = '#6C5CE7', iconBg = '#F3F0FF', action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={iconColor} />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
      </div>
      {action}
    </div>
  );
}

/* ── Info Row ───────────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, iconColor = '#6C5CE7' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: '#F8F9FC', border: '1px solid var(--border)', marginBottom: 6 }}>
      <Icon size={14} color={iconColor} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: value ? 'var(--text-primary)' : 'var(--text-muted)', wordBreak: 'break-all' }}>{value || 'Not Available'}</span>
    </div>
  );
}

/* ── Loading Skeleton ───────────────────────────────────────────── */
function Skel({ w = '100%', h = 16, r = 8, mb = 0 }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />;
}

/* ── Collapsible Card ───────────────────────────────────────────── */
function CollapseCard({ title, icon: Icon, iconColor, iconBg, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg || '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={16} color={iconColor || '#6C5CE7'} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          {badge !== undefined && (
            <span style={{ background: '#F3F0FF', color: '#6C5CE7', border: '1px solid #D6D0FF', padding: '1px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{badge}</span>
          )}
        </div>
        {open ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
      </button>
      {open && <div style={{ padding: '18px 22px' }}>{children}</div>}
    </div>
  );
}

/* ── Toast ──────────────────────────────────────────────────────── */
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  const styles = {
    success: { bg: '#F0FFF4', border: '#C6F6D5', color: '#276749' },
    error: { bg: '#FFF5F5', border: '#FED7D7', color: '#C53030' },
  };
  const s = styles[type] || styles.success;
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      borderRadius: 12, padding: '13px 18px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxWidth: 360,
      display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn 0.3s ease',
    }}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {msg}
    </div>
  );
}

/* ── Chart Tooltip ──────────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 13px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', fontSize: 12 }}>
      <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</p>
      <p style={{ color: '#6C5CE7', fontWeight: 600 }}>{payload[0].value}%</p>
    </div>
  );
};

const PIE_COLORS = ['#6C5CE7', '#3182CE', '#00B5D8', '#38A169', '#DD6B20', '#E53E3E', '#805AD5', '#D69E2E'];

function getGrade(score) {
  if (score >= 90) return { grade: 'A+', label: 'Excellent Resume', color: '#38A169' };
  if (score >= 80) return { grade: 'A', label: 'Great Resume', color: '#38A169' };
  if (score >= 70) return { grade: 'B+', label: 'Good Resume', color: '#3182CE' };
  if (score >= 60) return { grade: 'B', label: 'Above Average', color: '#3182CE' };
  if (score >= 50) return { grade: 'C+', label: 'Needs Improvement', color: '#DD6B20' };
  return { grade: 'C', label: 'Significant Revamp Needed', color: '#E53E3E' };
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function ResumeAnalyzer({ student }) {
  const [analysis, setAnalysis] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  const UPLOAD_STEPS = [
    'Uploading document...',
    'Extracting text & formatting...',
    'Parsing structure & details...',
    'Calculating ATS metrics...',
    'Generating AI feedback...',
  ];

  // Close export dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startProgress = () => {
    setUploadProgress(0);
    setUploadStep(0);
    let p = 0, step = 0;
    const iv = setInterval(() => {
      p = Math.min(p + Math.random() * 14 + 3, 88);
      step = Math.min(Math.floor((p / 100) * UPLOAD_STEPS.length), UPLOAD_STEPS.length - 1);
      setUploadProgress(Math.round(p));
      setUploadStep(step);
      if (p >= 88) clearInterval(iv);
    }, 400);
    return () => clearInterval(iv);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type !== 'dragleave' && e.type !== 'drop');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) doUpload(e.dataTransfer.files[0]);
  };

  const resetAnalysis = () => {
    setAnalysis(null);
    setActiveSection('overview');
    setToast(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const doUpload = async (file) => {
    if (!student?.id || !file) return;

    setAnalysis(null);
    setToast(null);
    setUploading(true);
    const cleanup = startProgress();

    try {
      const fd = new FormData();
      fd.append('resume', file);
      const res = await uploadResumeFile(student.id, fd);
      setUploadProgress(100);
      setAnalysis(res);
      setActiveSection('overview');
      setToast({ msg: `✅ Resume analyzed! ATS Score: ${res.ats_scores?.overallScore || 0}/100`, type: 'success' });
    } catch (err) {
      const serverMsg = err?.response?.data?.error;
      const status = err?.response?.status;
      let userMsg;
      if (status === 422) {
        userMsg = serverMsg || 'Unable to read this PDF. Please upload a valid, text-based resume PDF.';
      } else if (status === 400) {
        userMsg = serverMsg || 'Invalid file. Please upload a PDF, DOCX, or TXT file.';
      } else {
        userMsg = serverMsg || 'Upload failed. Please try again.';
      }
      setToast({ msg: userMsg, type: 'error' });
      setAnalysis(null);
    } finally {
      cleanup();
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  const doTextUpload = async () => {
    if (!student?.id || !pasteText.trim()) return;

    setAnalysis(null);
    setToast(null);
    setUploading(true);
    const cleanup = startProgress();

    try {
      const res = await uploadResumeText(student.id, pasteText.trim());
      setUploadProgress(100);
      setAnalysis(res);
      setShowPaste(false);
      setPasteText('');
      setActiveSection('overview');
      setToast({ msg: `✅ Resume analyzed! ATS Score: ${res.ats_scores?.overallScore || 0}/100`, type: 'success' });
    } catch (err) {
      const serverMsg = err?.response?.data?.error;
      setToast({ msg: serverMsg || 'Analysis failed. Please try again.', type: 'error' });
    } finally {
      cleanup();
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 800);
    }
  };

  // Export handlers
  const handleExport = (type) => {
    setExportDropdownOpen(false);
    if (!analysis) return;
    const pData = analysis.parsed_json || {};
    const atsData = analysis.ats_scores || {};
    const fbData = analysis.feedback_json || {};

    if (type === 'json' || type === 'complete') {
      const dataStr = JSON.stringify(analysis, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_analysis_${pData.personalInfo?.fullName || 'report'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === 'pdf' || type === 'ats_report') {
      window.print();
    } else if (type === 'txt') {
      const txtContent = `RESUME ANALYSIS REPORT\nCandidate: ${pData.personalInfo?.fullName || 'N/A'}\nATS Score: ${atsData.overallScore || 0}/100\n\nSUMMARY\nStrengths:\n${(fbData.strengths || []).map(s => `- ${s}`).join('\n')}\n\nWeaknesses:\n${(fbData.weaknesses || []).map(w => `- ${w}`).join('\n')}`;
      const blob = new Blob([txtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume_summary.txt';
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === 'feedback') {
      const fbStr = JSON.stringify(fbData, null, 2);
      const blob = new Blob([fbStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai_feedback.json';
      a.click();
      URL.revokeObjectURL(url);
    } else if (type === 'docx') {
      const docStr = `Resume Analysis for ${pData.personalInfo?.fullName || 'Candidate'}\nATS Score: ${atsData.overallScore}/100`;
      const blob = new Blob([docStr], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume_report.doc';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /* ── Derived data ──────────────────────────────────────────────── */
  const p = analysis?.parsed_json || {};
  const ats = analysis?.ats_scores || {};
  const fb = analysis?.feedback_json || {};
  const personal = p.personalInfo || {};
  const skills = p.skills || {};
  const links = p.professionalLinks || {};
  const score = ats.overallScore || 0;
  const gradeInfo = getGrade(score);

  const allSkills = [
    ...(skills.programmingLanguages || []),
    ...(skills.frameworks || []),
    ...(skills.libraries || []),
    ...(skills.databases || []),
    ...(skills.cloud || []),
    ...(skills.devops || []),
    ...(skills.aiMl || []),
    ...(skills.embedded || []),
    ...(skills.tools || []),
    ...(skills.softSkills || []),
  ];

  const radarData = [
    { subject: 'Skills', A: ats.skillsScore || 0 },
    { subject: 'Keywords', A: ats.keywordScore || 0 },
    { subject: 'Format', A: ats.formatScore || 0 },
    { subject: 'Grammar', A: ats.grammarScore || 0 },
    { subject: 'Projects', A: ats.projectScore || 0 },
    { subject: 'Experience', A: ats.experienceScore || 0 },
  ];

  const barData = [
    { name: 'Skills', value: ats.skillsScore || 0 },
    { name: 'Keywords', value: ats.keywordScore || 0 },
    { name: 'Format', value: ats.formatScore || 0 },
    { name: 'Grammar', value: ats.grammarScore || 0 },
    { name: 'Readability', value: ats.readabilityScore || 0 },
    { name: 'Projects', value: ats.projectScore || 0 },
    { name: 'Experience', value: ats.experienceScore || 0 },
    { name: 'Education', value: ats.educationScore || 0 },
  ];

  const skillCats = Object.entries(skills).filter(([, v]) => Array.isArray(v) && v.length > 0);
  const pieData = skillCats.map(([k, v]) => ({ name: k.replace(/([A-Z])/g, ' $1').trim(), value: v.length }));

  const NAV_TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'ats', label: 'ATS Analysis', icon: Target },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'feedback', label: 'AI Feedback', icon: Star },
  ];

  /* ══════════════════════════════════════════════════════════════════
     STATE 1: UPLOAD LANDING PAGE (Before Upload)
  ══════════════════════════════════════════════════════════════════ */
  if (!analysis && !uploading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }} className="animate-fade-in">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

        {/* Hero Banner Header */}
        <div style={{ textAlign: 'center', marginBottom: 36, marginTop: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: '#F3F0FF', border: '1px solid #D6D0FF', color: '#6C5CE7', fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
            <Sparkles size={15} />
            <span>AI-Powered Career Intelligence</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: 12 }}>
            AI Resume Analyzer
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Upload your resume and receive a complete ATS analysis, profile extraction, AI feedback and recommendations.
          </p>
        </div>

        {/* Large Drag & Drop Upload Card */}
        <div
          className="card"
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{
            border: dragActive ? '2px dashed #6C5CE7' : '2px dashed #CBD5E0',
            background: dragActive ? 'rgba(108,92,231,0.04)' : '#FFFFFF',
            padding: '52px 32px', textAlign: 'center',
            borderRadius: 20,
            boxShadow: dragActive ? '0 12px 36px rgba(108,92,231,0.12)' : '0 4px 20px -2px rgba(0,0,0,0.04)',
            transition: 'all 0.25s ease',
            transform: dragActive ? 'scale(1.01)' : 'scale(1)',
          }}
        >
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, #F3F0FF, #EBF8FF)', border: '1px solid #D6D0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(108,92,231,0.12)' }}>
            <Upload size={36} color="#6C5CE7" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            {dragActive ? 'Drop your resume here' : 'Drag & Drop your resume file'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.6 }}>
            Upload PDF, DOCX, DOC, TXT or image formats up to 10MB.<br />
            Our multi-modal parser will structure and grade your profile instantly.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            <label className="btn btn-primary btn-lg" style={{ cursor: 'pointer', padding: '14px 32px', fontSize: 15 }}>
              <Upload size={18} />
              Upload Resume
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && doUpload(e.target.files[0])}
              />
            </label>
            <button className="btn btn-secondary btn-lg" onClick={() => setShowPaste(true)} style={{ padding: '14px 24px', fontSize: 15 }}>
              <FileText size={18} />
              Paste Text
            </button>
          </div>

          {/* Supported format chips */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            {['PDF', 'DOCX', 'DOC', 'TXT', 'PNG / JPG'].map(fmt => (
              <span key={fmt} style={{ background: '#F8F9FC', border: '1px solid var(--border)', padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                {fmt}
              </span>
            ))}
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 4 }}>• Max 10MB</span>
          </div>
        </div>

        {/* Feature Cards Grid Below Upload */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16, marginTop: 28 }}>
          {[
            { icon: Target, color: '#6C5CE7', bg: '#F3F0FF', title: 'ATS Analysis', desc: '10 sub-score metrics & parser readability' },
            { icon: User, color: '#3182CE', bg: '#EBF8FF', title: 'Profile Extraction', desc: 'Auto-extract work, projects, links & education' },
            { icon: Zap, color: '#38A169', bg: '#F0FFF4', title: 'Skill Detection', desc: 'Categorized chips & distribution breakdown' },
            { icon: Star, color: '#DD6B20', bg: '#FFFAF0', title: 'AI Feedback', desc: 'Strengths, weaknesses & bullet rewrites' },
            { icon: BookOpen, color: '#805AD5', bg: '#FAF5FF', title: 'Grammar Check', desc: 'Tone, impact verbs & spelling feedback' },
            { icon: Layers, color: '#00B5D8', bg: '#E6FFFA', title: 'Keyword Analysis', desc: 'Matched vs missing high-impact terms' },
            { icon: Award, color: '#D69E2E', bg: '#FEFCE8', title: 'Resume Score', desc: 'Comprehensive rating from A+ to C' },
          ].map((f, i) => (
            <div key={i} className="card" style={{ padding: '18px 16px', transition: 'all 0.2s ease' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <f.icon size={17} color={f.color} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{f.title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Paste Modal */}
        {showPaste && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, padding: 16 }} onClick={e => e.target === e.currentTarget && setShowPaste(false)}>
            <div className="card" style={{ maxWidth: 620, width: '100%', animation: 'slideUp 0.25s ease' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Paste Resume Content</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18 }}>Copy and paste your complete resume text for AI parsing</p>
              <textarea
                className="input"
                style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 13 }}
                placeholder="Paste raw text here..."
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-secondary" onClick={() => setShowPaste(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={doTextUpload}
                  disabled={!pasteText.trim()}
                >
                  <Zap size={15} />
                  Analyze Resume
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     LOADING STATE
  ══════════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════════
     LOADING STATE (SaaS Skeleton Shimmer & Progress Timeline)
  ══════════════════════════════════════════════════════════════════ */
  if (uploading) {
    return (
      <div style={{ maxWidth: 880, margin: '40px auto', paddingBottom: 40 }} className="animate-fade-in">
        {/* Animated AI Processing Header Card */}
        <div className="card" style={{ padding: '32px 28px', textAlign: 'center', borderRadius: 20, marginBottom: 24, boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: -8, borderRadius: 30, background: 'linear-gradient(135deg, var(--primary), var(--accent))', opacity: 0.2, animation: 'pulse 1.8s infinite ease-in-out' }} />
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)' }}>
              <Brain size={40} className="animate-bounce" />
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>AI Analyzing Resume...</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            {UPLOAD_STEPS[uploadStep] || 'Processing document & extracting intelligence...'}
          </p>

          {/* Progress Bar & ETA */}
          <div style={{ maxWidth: 540, margin: '0 auto 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Overall Progress</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary)' }}>{uploadProgress}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 10, background: 'var(--hover-bg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 10, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
              Estimated remaining time: ~{Math.max(1, Math.ceil((100 - uploadProgress) / 25))}s
            </div>
          </div>
        </div>

        {/* Timeline & Skeleton Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Analysis Timeline */}
          <div className="card" style={{ borderRadius: 16, padding: 22 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} color="var(--primary)" /> Analysis Stages
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {UPLOAD_STEPS.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                  <div style={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {i < uploadStep ? (
                      <CheckCircle2 size={18} color="#10B981" />
                    ) : i === uploadStep ? (
                      <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)' }} />
                    ) : (
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--border-color)' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: i <= uploadStep ? 700 : 500, color: i <= uploadStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Skeleton Shimmer Loading Placeholders */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 18, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>ATS Score</span>
              <Skel h={28} w="50%" mb={10} r={6} />
              <Skel h={10} w="80%" r={4} />
            </div>
            <div className="card" style={{ padding: 18, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Skill Detection</span>
              <Skel h={28} w="65%" mb={10} r={6} />
              <Skel h={10} w="90%" r={4} />
            </div>
            <div className="card" style={{ padding: 18, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Keywords</span>
              <Skel h={28} w="55%" mb={10} r={6} />
              <Skel h={10} w="75%" r={4} />
            </div>
            <div className="card" style={{ padding: 18, borderRadius: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>AI Feedback</span>
              <Skel h={28} w="70%" mb={10} r={6} />
              <Skel h={10} w="85%" r={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════
     STATE 2: RESUME DASHBOARD (After Upload)
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ maxWidth: 1400, paddingBottom: 60 }} className="animate-fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Page Top Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#6C5CE7" />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>Resume Dashboard</h1>
            <span className={`badge ${score >= 70 ? 'badge-strong' : score >= 50 ? 'badge-moderate' : 'badge-weak'}`}>
              ATS {score}/100
            </span>
          </div>
          {personal.fullName && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 46 }}>
              Analysis report for <strong>{personal.fullName}</strong> ({analysis?.file_name || 'Uploaded Resume'})
            </p>
          )}
        </div>

        {/* TOP ACTIONS: [ Upload Resume ] [ Export ▼ ] */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontSize: 14 }}>
            <Upload size={16} color="#6C5CE7" />
            <span>Upload Resume</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
              onChange={e => {
                if (e.target.files?.[0]) {
                  const file = e.target.files[0];
                  e.target.value = ''; // Reset input to allow re-selecting same file
                  doUpload(file);
                }
              }}
            />
          </label>

          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              className="btn btn-primary"
              onClick={() => setExportDropdownOpen(o => !o)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 14 }}
            >
              <Download size={16} />
              <span>Export</span>
              <ChevronDown size={14} />
            </button>

            {exportDropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '100%', marginTop: 8, zIndex: 999,
                width: 230, background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', padding: '6px',
                animation: 'slideUp 0.15s ease'
              }}>
                <button onClick={() => handleExport('pdf')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <FileText size={15} color="#6C5CE7" /> Export as PDF
                </button>
                <button onClick={() => handleExport('docx')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <FileSpreadsheet size={15} color="#3182CE" /> Export as DOCX
                </button>
                <button onClick={() => handleExport('json')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <Code size={15} color="#38A169" /> Export as JSON
                </button>
                <button onClick={() => handleExport('txt')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <FileText size={15} color="#DD6B20" /> Export as TXT
                </button>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <button onClick={() => handleExport('feedback')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <Star size={15} color="#805AD5" /> Export AI Feedback
                </button>
                <button onClick={() => handleExport('ats_report')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F8F9FC'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <Target size={15} color="#E53E3E" /> Export ATS Report
                </button>
                <button onClick={() => handleExport('complete')} style={{ width: '100%', padding: '9px 12px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, color: '#6C5CE7', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.background = '#F3F0FF'} onMouseOut={e => e.currentTarget.style.background = 'none'}>
                  <Download size={15} color="#6C5CE7" /> Download Complete Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky Premium Segmented Tab Navigation ── */}
      <div style={{
        position: 'sticky', top: 70, zIndex: 90,
        display: 'flex', gap: 6,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 6, marginBottom: 28,
        boxShadow: 'var(--shadow-md)',
        backdropFilter: 'blur(12px)',
        overflowX: 'auto'
      }}>
        {NAV_TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              className={`tab-btn ${activeSection === t.id ? 'active' : ''}`}
              style={{
                borderRadius: 12,
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          1. OVERVIEW TAB
      ══════════════════════════════════════════════════════════ */}
      {activeSection === 'overview' && (
        <div className="animate-slide-up">
          {/* Top KPI Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'ATS Score', value: score, icon: Target, color: '#6C5CE7', bg: '#F3F0FF', suffix: '/100' },
              { label: 'Keyword Match', value: ats.keywordScore || 0, icon: Zap, color: '#3182CE', bg: '#EBF8FF', suffix: '%' },
              { label: 'Skills Score', value: ats.skillsScore || 0, icon: Code, color: '#38A169', bg: '#F0FFF4', suffix: '%' },
              { label: 'Format Score', value: ats.formatScore || 0, icon: Layers, color: '#DD6B20', bg: '#FFFAF0', suffix: '%' },
              { label: 'Missing Skills', value: (fb.missingSkills || []).length, icon: AlertTriangle, color: '#E53E3E', bg: '#FFF5F5', suffix: '' },
            ].map((card, i) => (
              <div key={i} className="sparkline-stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      {card.label}
                    </span>
                    <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1 }}>
                      {card.value}<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{card.suffix}</span>
                    </div>
                  </div>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <card.icon size={18} color={card.color} />
                  </div>
                </div>
                <div className="progress-bar-track" style={{ marginTop: 14 }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(card.value, 100)}%`, background: card.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Main 2-Column Overview Content */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
            {/* Left Main Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Candidate Summary Card */}
              <div className="card">
                <SectionHeader icon={User} title="Candidate Profile Summary" iconColor="#6C5CE7" iconBg="#F3F0FF" />
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg, #6C5CE7, #3182CE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 800, boxShadow: '0 4px 14px rgba(108,92,231,0.25)' }}>
                      {(personal.fullName || 'C')[0]}
                    </div>
                    <span className={`badge ${score >= 70 ? 'badge-strong' : score >= 50 ? 'badge-moderate' : 'badge-weak'}`}>{gradeInfo.grade}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{personal.fullName || 'Not Available'}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{personal.email || 'Email Not Available'}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <InfoRow icon={Mail} label="Email" value={personal.email} />
                      <InfoRow icon={Phone} label="Phone" value={personal.phone} />
                      <InfoRow icon={MapPin} label="Location" value={personal.address} />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                  {[
                    { label: 'Skills Extracted', value: allSkills.length, color: '#6C5CE7' },
                    { label: 'Projects', value: (p.projects || []).length, color: '#3182CE' },
                    { label: 'Experience', value: (p.experience || []).concat(p.internships || []).length, color: '#38A169' },
                    { label: 'Certifications', value: (p.certifications || []).length, color: '#DD6B20' },
                  ].map((stat, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 10, background: '#F8F9FC', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ATS Sub-Scores Bar Chart */}
              <div className="card">
                <SectionHeader icon={TrendingUp} title="ATS Metric Breakdown" iconColor="#6C5CE7" iconBg="#F3F0FF" />
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -12, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} angle={-30} textAnchor="end" height={52} interval={0} />
                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(108,92,231,0.04)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {barData.map((d, i) => <Cell key={i} fill={d.value >= 70 ? '#38A169' : d.value >= 50 ? '#DD6B20' : '#E53E3E'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Strengths & Weaknesses Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card" style={{ background: '#F0FFF4', borderColor: '#C6F6D5' }}>
                  <SectionHeader icon={CheckCircle2} title="Key Strengths" iconColor="#38A169" iconBg="#C6F6D5" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(fb.strengths || []).slice(0, 5).map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #C6F6D5' }}>
                        <CheckCircle2 size={14} color="#38A169" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: '#276749', fontWeight: 500, lineHeight: 1.5 }}>{s}</span>
                      </div>
                    ))}
                    {!(fb.strengths || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No strengths recorded</p>}
                  </div>
                </div>

                <div className="card" style={{ background: '#FFF5F5', borderColor: '#FED7D7' }}>
                  <SectionHeader icon={AlertTriangle} title="Critical Weaknesses" iconColor="#E53E3E" iconBg="#FED7D7" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(fb.weaknesses || []).slice(0, 5).map((w, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', background: '#FFFFFF', borderRadius: 10, border: '1px solid #FED7D7' }}>
                        <AlertTriangle size={14} color="#E53E3E" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontSize: 12, color: '#C53030', fontWeight: 500, lineHeight: 1.5 }}>{w}</span>
                      </div>
                    ))}
                    {!(fb.weaknesses || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No weaknesses recorded</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side Overview Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Overall Score Card */}
              <div className="card" style={{ textAlign: 'center', padding: 28 }}>
                <SectionHeader icon={Target} title="Overall ATS Rating" iconColor="#6C5CE7" iconBg="#F3F0FF" />
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <ScoreRing value={score} size={140} strokeW={12} color="auto" label="ATS Score" grade={gradeInfo.grade} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 12, background: score >= 70 ? '#F0FFF4' : score >= 50 ? '#FFFAF0' : '#FFF5F5', border: `1px solid ${score >= 70 ? '#9AE6B4' : score >= 50 ? '#FEEBC8' : '#FED7D7'}`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: gradeInfo.color }}>{gradeInfo.label}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { v: ats.keywordScore || 0, label: 'Keywords', color: '#3182CE' },
                    { v: ats.formatScore || 0, label: 'Format', color: '#38A169' },
                    { v: ats.grammarScore || 0, label: 'Grammar', color: '#DD6B20' },
                    { v: ats.readabilityScore || 0, label: 'Readability', color: '#6C5CE7' },
                  ].map((m, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <ScoreRing value={m.v} size={66} strokeW={6} color={m.color} track="#EDF2F7" label={m.label} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Top AI Recommendations */}
              <div className="card">
                <SectionHeader icon={Zap} title="AI Recommendations" iconColor="#DD6B20" iconBg="#FFFAF0" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(fb.actionableImprovements || fb.suggestions || []).slice(0, 5).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#F8F9FC', border: '1px solid var(--border)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg, #6C5CE7, #3182CE)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          2. PROFILE TAB
      ══════════════════════════════════════════════════════════ */}
      {activeSection === 'profile' && (
        <div className="animate-slide-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Candidate Header Profile Card */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg, #6C5CE7, #3182CE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 800 }}>
                {(personal.fullName || 'C')[0]}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{personal.fullName || 'Not Available'}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{personal.email || 'Email Not Available'}</p>
              </div>
            </div>

            <CollapseCard title="Personal & Contact Information" icon={User} iconColor="#6C5CE7" iconBg="#F3F0FF">
              <InfoRow icon={User} label="Full Name" value={personal.fullName} />
              <InfoRow icon={Mail} label="Email" value={personal.email} iconColor="#3182CE" />
              <InfoRow icon={Phone} label="Phone" value={personal.phone} iconColor="#38A169" />
              <InfoRow icon={MapPin} label="Location" value={personal.address} iconColor="#DD6B20" />
            </CollapseCard>

            <CollapseCard title="Professional & Coding Profiles" icon={Link} iconColor="#3182CE" iconBg="#EBF8FF">
              <InfoRow icon={Globe} label="LinkedIn" value={links.linkedin} iconColor="#0077B5" />
              <InfoRow icon={Code} label="GitHub" value={links.github} iconColor="#333" />
              <InfoRow icon={Zap} label="LeetCode" value={links.leetcode} iconColor="#FFA116" />
              <InfoRow icon={Award} label="HackerRank" value={links.hackerrank} iconColor="#2EC866" />
              <InfoRow icon={Globe} label="Portfolio" value={links.portfolio} iconColor="#6C5CE7" />
            </CollapseCard>

            <CollapseCard title="Education" icon={GraduationCap} iconColor="#3182CE" iconBg="#EBF8FF" badge={(p.education || []).length}>
              {(p.education || []).map((edu, i) => (
                <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: '#F8F9FC', border: '1px solid var(--border)', marginBottom: 10 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{edu.degree || 'Degree Not Available'}</p>
                  <p style={{ fontSize: 12, color: '#3182CE', fontWeight: 600, marginBottom: 2 }}>{edu.department || ''}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{edu.college || edu.university || 'University Not Available'}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {edu.cgpa && <span className="badge badge-strong">CGPA: {edu.cgpa}</span>}
                    {edu.gradYear && <span className="badge badge-moderate">Year: {edu.gradYear}</span>}
                  </div>
                </div>
              ))}
              {!(p.education || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No education data extracted</p>}
            </CollapseCard>

            <CollapseCard title="Certifications" icon={Award} iconColor="#38A169" iconBg="#F0FFF4" badge={(p.certifications || []).length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(p.certifications || []).map((cert, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <Award size={14} color="#38A169" style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{typeof cert === 'string' ? cert : cert.title}</p>
                  </div>
                ))}
                {!(p.certifications || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No certifications extracted</p>}
              </div>
            </CollapseCard>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <CollapseCard title="Work Experience" icon={Briefcase} iconColor="#6C5CE7" iconBg="#F3F0FF" badge={(p.experience || []).length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(p.experience || []).map((exp, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{exp.role}</p>
                        <p style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600 }}>{exp.company}</p>
                      </div>
                      {exp.duration && <span className="badge badge-weak" style={{ background: '#F3F0FF', color: '#6C5CE7', borderColor: '#D6D0FF' }}>{exp.duration}</span>}
                    </div>
                    {Array.isArray(exp.responsibilities) && (
                      <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {exp.responsibilities.map((r, j) => <li key={j}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
                {!(p.experience || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No experience extracted</p>}
              </div>
            </CollapseCard>

            <CollapseCard title="Internships" icon={Briefcase} iconColor="#3182CE" iconBg="#EBF8FF" badge={(p.internships || []).length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(p.internships || []).map((intern, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: '#EBF8FF', border: '1px solid #BEE3F8', borderRadius: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#2B6CB0' }}>{intern.role || intern.title || 'Intern'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{intern.company}</p>
                  </div>
                ))}
                {!(p.internships || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No internships listed</p>}
              </div>
            </CollapseCard>

            <CollapseCard title="Projects" icon={Code} iconColor="#DD6B20" iconBg="#FFFAF0" badge={(p.projects || []).length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(p.projects || []).map((proj, i) => (
                  <div key={i} style={{ padding: '14px 16px', background: '#FFFAF0', border: '1px solid #FEEBC8', borderRadius: 12 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{proj.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{proj.description || 'Not Available'}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {(proj.techUsed || []).map((t, j) => (
                        <span key={j} style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FBBF24', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {!(p.projects || []).length && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No projects extracted</p>}
              </div>
            </CollapseCard>

            <CollapseCard title="Achievements & Languages" icon={Star} iconColor="#D69E2E" iconBg="#FEFCE8">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Achievements</p>
                  {(p.achievements || []).map((a, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', gap: 6 }}>
                      <span style={{ color: '#D69E2E' }}>★</span> {a}
                    </div>
                  ))}
                  {!(p.achievements || []).length && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not Available</p>}
                </div>
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Languages Known</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(p.languagesKnown || []).map((l, i) => <SkillChip key={i} label={l} idx={i} />)}
                  </div>
                </div>
              </div>
            </CollapseCard>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          3. ATS ANALYSIS TAB
      ══════════════════════════════════════════════════════════ */}
      {activeSection === 'ats' && (
        <div className="animate-slide-up">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Score Rings */}
            <div className="card">
              <SectionHeader icon={Target} title="ATS Score Rings" iconColor="#6C5CE7" iconBg="#F3F0FF" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, justifyItems: 'center' }}>
                {[
                  { v: ats.overallScore || 0, label: 'Overall ATS', color: 'auto' },
                  { v: ats.keywordScore || 0, label: 'Keywords', color: '#3182CE' },
                  { v: ats.skillsScore || 0, label: 'Skills', color: '#6C5CE7' },
                  { v: ats.formatScore || 0, label: 'Formatting', color: '#38A169' },
                  { v: ats.grammarScore || 0, label: 'Grammar', color: '#DD6B20' },
                  { v: ats.readabilityScore || 0, label: 'Readability', color: '#E53E3E' },
                  { v: ats.projectScore || 0, label: 'Projects', color: '#805AD5' },
                  { v: ats.experienceScore || 0, label: 'Experience', color: '#00B5D8' },
                  { v: ats.educationScore || 0, label: 'Education', color: '#38A169' },
                ].map((m, i) => (
                  <ScoreRing key={i} value={m.v} size={88} strokeW={8} color={m.color} track="#EDF2F7" label={m.label} />
                ))}
              </div>
            </div>

            {/* Radar Chart */}
            <div className="card">
              <SectionHeader icon={TrendingUp} title="Skill & Section Radar" iconColor="#3182CE" iconBg="#EBF8FF" />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#EDF2F7" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                  <Radar name="Score" dataKey="A" stroke="#6C5CE7" fill="#6C5CE7" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sections Present & Missing Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card" style={{ background: '#F0FFF4', borderColor: '#C6F6D5' }}>
              <SectionHeader icon={CheckCircle2} title="Sections Present" iconColor="#38A169" iconBg="#C6F6D5" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Personal Info', 'Education', 'Work Experience', 'Skills', 'Projects'].map((sec, i) => (
                  <span key={i} style={{ background: '#FFFFFF', color: '#276749', border: '1px solid #9AE6B4', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} color="#38A169" /> {sec}
                  </span>
                ))}
              </div>
            </div>

            <div className="card" style={{ background: '#FFF5F5', borderColor: '#FED7D7' }}>
              <SectionHeader icon={AlertTriangle} title="Missing Sections / Structure Gaps" iconColor="#E53E3E" iconBg="#FED7D7" />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Certifications', 'Summary Statement', 'Measurable Metrics'].map((sec, i) => (
                  <span key={i} style={{ background: '#FFFFFF', color: '#C53030', border: '1px solid #FEB2B2', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <ShieldAlert size={14} color="#E53E3E" /> {sec}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Keyword & Suggestions Breakdown */}
          <div className="card">
            <SectionHeader icon={BookOpen} title="Keyword & Resume Structure Suggestions" iconColor="#6C5CE7" iconBg="#F3F0FF" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#276749', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>✓ Matched Keywords</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(fb.matchedKeywords || allSkills.slice(0, 10)).map((kw, i) => (
                    <span key={i} style={{ background: '#F0FFF4', color: '#276749', border: '1px solid #9AE6B4', padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{kw}</span>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#C53030', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>✗ Missing High-Impact Keywords</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(fb.missingKeywords || []).map((kw, i) => (
                    <span key={i} style={{ background: '#FFF5F5', color: '#C53030', border: '1px solid #FEB2B2', padding: '4px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>+ {kw}</span>
                  ))}
                  {!(fb.missingKeywords || []).length && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>None missing</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          4. SKILLS TAB
      ══════════════════════════════════════════════════════════ */}
      {activeSection === 'skills' && (
        <div className="animate-slide-up">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, marginBottom: 20 }}>
            {/* Categorized Skills Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {skillCats.map(([cat, list], catIdx) => (
                <div key={cat} className="card" style={{ padding: '18px 20px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                    {cat.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {list.map((sk, i) => <SkillChip key={i} label={sk} idx={catIdx} />)}
                  </div>
                  <div className="progress-bar-track" style={{ height: 4 }}>
                    <div className="progress-bar-fill" style={{ width: `${Math.min((list.length / 10) * 100, 100)}%`, background: CHIP_PALETTES[catIdx % CHIP_PALETTES.length].color }} />
                  </div>
                </div>
              ))}
              {!skillCats.length && <div className="card"><p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skills extracted from resume</p></div>}
            </div>

            {/* Skill Distribution Pie Chart */}
            <div className="card" style={{ padding: '20px' }}>
              <SectionHeader icon={Layers} title="Skill Distribution" iconColor="#6C5CE7" iconBg="#F3F0FF" />
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {pieData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, fontWeight: 600 }}>{d.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skill data</p>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          5. AI FEEDBACK TAB
      ══════════════════════════════════════════════════════════ */}
      {activeSection === 'feedback' && (
        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { title: 'Strengths', icon: CheckCircle2, color: '#38A169', bg: '#F0FFF4', border: '#C6F6D5', items: fb.strengths, bullet: '✓', dotColor: '#38A169', textColor: '#276749' },
              { title: 'Weaknesses', icon: AlertTriangle, color: '#E53E3E', bg: '#FFF5F5', border: '#FED7D7', items: fb.weaknesses, bullet: '⚠', dotColor: '#E53E3E', textColor: '#C53030' },
              { title: 'Grammar Suggestions', icon: BookOpen, color: '#3182CE', bg: '#EBF8FF', border: '#BEE3F8', items: fb.grammarSuggestions, bullet: '→', dotColor: '#3182CE', textColor: '#2B6CB0' },
              { title: 'Formatting Suggestions', icon: Layers, color: '#6C5CE7', bg: '#F3F0FF', border: '#D6D0FF', items: fb.formattingSuggestions, bullet: '→', dotColor: '#6C5CE7', textColor: '#553C9A' },
              { title: 'Project Suggestions', icon: Code, color: '#DD6B20', bg: '#FFFAF0', border: '#FEEBC8', items: fb.projectSuggestions, bullet: '→', dotColor: '#DD6B20', textColor: '#C05621' },
              { title: 'Bullet Rewrites', icon: Zap, color: '#805AD5', bg: '#FAF5FF', border: '#E9D8FD', items: fb.rewriteSuggestions, bullet: '✎', dotColor: '#805AD5', textColor: '#553C9A' },
            ].map((sec, i) => (
              <div key={i} className="card" style={{ background: sec.bg, borderColor: sec.border }}>
                <SectionHeader icon={sec.icon} title={sec.title} iconColor={sec.color} iconBg={sec.border} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(sec.items || []).map((item, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, padding: '8px 12px', background: '#FFFFFF', borderRadius: 10, border: `1px solid ${sec.border}` }}>
                      <span style={{ color: sec.dotColor, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{sec.bullet}</span>
                      <span style={{ fontSize: 12, color: sec.textColor, lineHeight: 1.6, fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                  {!(sec.items || []).length && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Not available</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Actionable Improvement Roadmap */}
          <div className="card" style={{ background: '#1A202C', borderColor: '#2D3748' }}>
            <SectionHeader icon={Target} title="Improvement Roadmap & Action Plan" iconColor="#A78BFA" iconBg="#4C1D95" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {(fb.actionableImprovements || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.07)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #6C5CE7, #3182CE)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 12, color: '#E2E8F0', lineHeight: 1.6, fontWeight: 500 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
