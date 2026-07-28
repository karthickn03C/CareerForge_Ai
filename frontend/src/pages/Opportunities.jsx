import { useState, useEffect } from 'react';
import { discoverOpportunities, getSavedOpportunities, saveOpportunity } from '../api/client';
import {
  Compass, Search, Bookmark, BookmarkCheck, ExternalLink, Sparkles, Filter,
  Building2, Calendar, Award, Globe, DollarSign, CheckCircle2, Zap, Shield, ChevronRight
} from 'lucide-react';

const DOMAINS = ['All Domains', 'Web Development', 'AI & Machine Learning', 'Mobile Apps', 'Cloud & DevOps', 'Cybersecurity', 'Data Science'];
const SKILL_LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const CATEGORIES = [
  'All Categories',
  'Hackathons',
  'Internships',
  'Coding Contests',
  'Scholarships',
  'Research Programs',
  'Open Source Programs',
  'Certifications',
  'Bootcamps',
  'Campus Events'
];

export default function Opportunities({ student }) {
  const [careerGoal, setCareerGoal] = useState('Software Engineer');
  const [role, setRole] = useState('Full Stack / AI Engineer');
  const [domain, setDomain] = useState('All Domains');
  const [skillLevel, setSkillLevel] = useState('Intermediate');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [isRemoteOnly, setIsRemoteOnly] = useState(false);
  const [isPaidOnly, setIsPaidOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [opportunities, setOpportunities] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState('discover'); // 'discover' | 'saved'
  const [savedList, setSavedList] = useState([]);

  useEffect(() => {
    if (student?.id) {
      loadSavedOpportunities();
    }
  }, [student?.id]);

  async function loadSavedOpportunities() {
    try {
      const saved = await getSavedOpportunities(student.id);
      setSavedList(saved || []);
      setSavedIds(new Set((saved || []).map(s => s.id)));
    } catch (e) {
      console.warn('Load saved opportunities error:', e.message);
    }
  }

  async function handleDiscover() {
    setLoading(true);
    setError('');
    try {
      const res = await discoverOpportunities(student.id, {
        careerGoal,
        role,
        domain: domain === 'All Domains' ? 'Web Development & AI' : domain,
        skillLevel,
        remote: isRemoteOnly,
        paid: isPaidOnly,
        skills: ['Python', 'JavaScript', 'React', 'DSA', 'SQL'],
      });

      setAiSummary(res.aiSummary || '');
      setOpportunities(res.opportunities || []);
      setActiveTab('discover');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to discover opportunities.');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSave(opp) {
    try {
      const res = await saveOpportunity(student.id, opp);
      if (res.saved) {
        setSavedIds(prev => new Set([...prev, opp.id]));
      } else {
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(opp.id);
          return next;
        });
      }
      loadSavedOpportunities();
    } catch (e) {
      console.error('Save toggle error:', e);
    }
  }

  // Normalize Category Strings for filtering tolerance
  const normalizeCat = (catStr) => (catStr || '').toLowerCase().replace(/[^a-z]/g, '');

  const filteredOpportunities = opportunities.filter(opp => {
    if (categoryFilter !== 'All Categories') {
      const targetNorm = normalizeCat(categoryFilter);
      const oppNorm = normalizeCat(opp.category);
      if (!oppNorm.includes(targetNorm) && !targetNorm.includes(oppNorm)) {
        return false;
      }
    }
    if (isRemoteOnly && !opp.remote && !opp.isRemote) return false;
    if (isPaidOnly && !opp.paid && !opp.isPaid) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }} className="animate-fade-in">
      {/* Hero Header Card */}
      <div className="card" style={{
        marginBottom: 24, padding: '32px 28px',
        borderRadius: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 20, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              <Compass size={14} /> AI Talent & Opportunity Discovery Agent
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.5px' }}>
              Opportunity Discovery Agent
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Discover real competitions, hackathons, internships, certifications, and open-source programs tailored specifically to your skills and career goals.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className={`btn ${activeTab === 'discover' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('discover')}
              style={{ borderRadius: 10 }}
            >
              <Sparkles size={16} /> Discover ({opportunities.length})
            </button>
            <button
              className={`btn ${activeTab === 'saved' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('saved')}
              style={{ borderRadius: 10 }}
            >
              <Bookmark size={16} /> Saved Bookmarks ({savedList.length})
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Career Goal</label>
            <input
              className="input"
              value={careerGoal}
              onChange={e => setCareerGoal(e.target.value)}
              placeholder="e.g. Software Engineer"
              style={{ fontSize: 13, borderRadius: 10 }}
            />
          </div>

          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Role Preference</label>
            <input
              className="input"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Full Stack / AI"
              style={{ fontSize: 13, borderRadius: 10 }}
            />
          </div>

          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Domain</label>
            <select className="input" value={domain} onChange={e => setDomain(e.target.value)} style={{ fontSize: 13, borderRadius: 10 }}>
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Skill Level</label>
            <select className="input" value={skillLevel} onChange={e => setSkillLevel(e.target.value)} style={{ fontSize: 13, borderRadius: 10 }}>
              {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 14, paddingBottom: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={isRemoteOnly} onChange={e => setIsRemoteOnly(e.target.checked)} /> Remote Only
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={isPaidOnly} onChange={e => setIsPaidOnly(e.target.checked)} /> Paid Only
            </label>
          </div>

          <div>
            <button className="btn btn-primary" onClick={handleDiscover} disabled={loading} style={{ width: '100%', height: 42, borderRadius: 10, justifyContent: 'center' }}>
              {loading ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Sparkles size={16} />}
              <span>{loading ? 'AI Discovering...' : 'Discover Opportunities'}</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error animate-fade-in" style={{ marginBottom: 20 }}>{error}</div>}

      {/* Discover Opportunities View */}
      {activeTab === 'discover' && (
        <>
          {/* AI Summary Recommendation Box */}
          {aiSummary && (
            <div className="animate-slide-up" style={{
              marginBottom: 24, padding: '18px 22px', borderRadius: 16,
              background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex', alignItems: 'flex-start', gap: 14
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>AI Recommendations Summary</h4>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{aiSummary}</p>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          {opportunities.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 20 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
                    background: categoryFilter === cat ? 'var(--primary)' : 'var(--bg-card)',
                    color: categoryFilter === cat ? '#FFFFFF' : 'var(--text-secondary)',
                    boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Initial State / Empty State */}
          {opportunities.length === 0 && !loading && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Compass size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No Opportunities Discovered Yet</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 450, margin: '0 auto 20px' }}>
                Click "Discover Opportunities" above to let CareerForge AI fetch real hackathons, internships, open-source programs, and certifications.
              </p>
              <button className="btn btn-primary" onClick={handleDiscover}>
                <Sparkles size={16} /> Discover Opportunities Now
              </button>
            </div>
          )}

          {/* Opportunities Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {filteredOpportunities.map(opp => {
              const isSaved = savedIds.has(opp.id);
              const score = opp.matchScore || opp.matchPercentage || 88;
              const skillsList = opp.skills || opp.skillsRequired || [];
              const companyName = opp.company || opp.platform || 'Tech Organization';
              return (
                <div key={opp.id} className="card card-hover animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                      {opp.category}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                        {score}% Match
                      </span>
                      <button
                        onClick={() => handleToggleSave(opp)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSaved ? 'var(--primary)' : 'var(--text-muted)', padding: 4 }}
                        title={isSaved ? 'Remove bookmark' : 'Bookmark opportunity'}
                      >
                        {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>
                    {opp.title}
                  </h3>

                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} /> {companyName}
                  </p>

                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5, background: 'var(--hover-bg)', padding: '10px 12px', borderRadius: 10 }}>
                    💡 <strong>Reason:</strong> {opp.reason || opp.reasonRecommended || 'Matches your profile and skills'}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {opp.deadline}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={13} /> {(opp.remote || opp.isRemote) ? 'Remote' : opp.location || 'On-site'}</span>
                    {(opp.paid || opp.isPaid) && <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981', fontWeight: 700 }}><DollarSign size={13} /> Paid Stipend</span>}
                  </div>

                  {/* Skills badges */}
                  <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {skillsList.map((sk, idx) => (
                        <span key={idx} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--hover-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                          {sk}
                        </span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <a
                        href={opp.applyUrl || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center', borderRadius: 8 }}
                      >
                        Apply Now <ExternalLink size={13} />
                      </a>
                      <button
                        onClick={() => handleToggleSave(opp)}
                        className={`btn ${isSaved ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
                        style={{ borderRadius: 8, color: isSaved ? 'var(--primary)' : 'var(--text-secondary)' }}
                      >
                        {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Saved Bookmarks View */}
      {activeTab === 'saved' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {savedList.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
              <Bookmark size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>No Bookmarked Opportunities</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Click the bookmark icon on any opportunity card to save it here for quick access.</p>
            </div>
          ) : (
            savedList.map(opp => (
              <div key={opp.id} className="card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700, background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                    {opp.category}
                  </span>
                  <button onClick={() => handleToggleSave(opp)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                    <BookmarkCheck size={20} />
                  </button>
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{opp.title}</h3>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>{opp.company || opp.platform}</p>

                <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                  <a href={opp.apply_url || opp.applyUrl || '#'} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                    Apply Opportunity <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
