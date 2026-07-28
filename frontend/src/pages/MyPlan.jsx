import { useState, useEffect } from 'react';
import { generatePlan, getLatestPlan } from '../api/client';
import { Calendar, Zap, CheckSquare, RefreshCw, Building2, Briefcase, CheckCircle2, AlertCircle } from 'lucide-react';

const TOPIC_COLORS = [
  '#6C5CE7', '#3182CE', '#00B5D8', '#38A169',
  '#DD6B20', '#E53E3E', '#D69E2E', '#805AD5',
];

const COMPANIES = [
  { id: 'tcs', name: 'TCS', domain: 'tcs.com', tag: 'Service-based' },
  { id: 'infosys', name: 'Infosys', domain: 'infosys.com', tag: 'Service-based' },
  { id: 'wipro', name: 'Wipro', domain: 'wipro.com', tag: 'Service-based' },
  { id: 'cognizant', name: 'Cognizant', domain: 'cognizant.com', tag: 'Service-based' },
  { id: 'accenture', name: 'Accenture', domain: 'accenture.com', tag: 'Service-based' },
  { id: 'capgemini', name: 'Capgemini', domain: 'capgemini.com', tag: 'Service-based' },
  { id: 'hcl', name: 'HCL Tech', domain: 'hcltech.com', tag: 'Service-based' },
  { id: 'techmahindra', name: 'Tech Mahindra', domain: 'techmahindra.com', tag: 'Service-based' },
  { id: 'zoho', name: 'Zoho', domain: 'zoho.com', tag: 'Product-based' },
  { id: 'google', name: 'Google', domain: 'google.com', tag: 'Product-based' },
  { id: 'amazon', name: 'Amazon', domain: 'amazon.com', tag: 'Product-based' },
  { id: 'microsoft', name: 'Microsoft', domain: 'microsoft.com', tag: 'Product-based' },
  { id: 'other', name: 'Other', domain: null, tag: 'Custom' },
];

function CompanyCard({ company, isSelected, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);

  const initials = company.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const logoUrl = company.domain ? `https://logo.clearbit.com/${company.domain}` : null;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius: 14,
        padding: '14px 10px',
        background: isSelected ? 'rgba(108,92,231,0.06)' : '#FFFFFF',
        border: `2px solid ${isSelected ? '#6C5CE7' : 'var(--border)'}`,
        boxShadow: isSelected ? '0 4px 14px rgba(108,92,231,0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'all 150ms ease-in-out',
        userSelect: 'none',
      }}
      className="company-card"
    >
      {isSelected && (
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <CheckCircle2 size={16} color="#6C5CE7" />
        </div>
      )}

      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: '#F8F9FC', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, overflow: 'hidden', flexShrink: 0,
      }}>
        {company.id === 'other' ? (
          <Briefcase size={20} color="#6C5CE7" />
        ) : logoUrl && !imgFailed ? (
          <img
            src={logoUrl}
            alt={company.name}
            onError={() => setImgFailed(true)}
            style={{ width: 32, height: 32, objectFit: 'contain' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
            color: '#FFFFFF', fontWeight: 800, fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {initials}
          </div>
        )}
      </div>

      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
        {company.name}
      </span>

      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8,
        background: company.tag === 'Product-based' ? '#F0FFF4' : company.tag === 'Service-based' ? '#EBF8FF' : '#F7FAFC',
        color: company.tag === 'Product-based' ? '#276749' : company.tag === 'Service-based' ? '#2B6CB0' : '#4A5568',
        border: `1px solid ${company.tag === 'Product-based' ? '#9AE6B4' : company.tag === 'Service-based' ? '#90CDF4' : '#CBD5E0'}`,
      }}>
        {company.tag}
      </span>
    </div>
  );
}

function TimelineItem({ item, index, total }) {
  const color = TOPIC_COLORS[index % TOPIC_COLORS.length];
  const isLast = index === total - 1;

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, flexShrink: 0 }}>
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          border: `3px solid ${color}`,
          background: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, zIndex: 1,
          boxShadow: `0 2px 8px ${color}30`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        </div>
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 40,
            background: `linear-gradient(to bottom, ${color}50, transparent)`,
          }} />
        )}
      </div>

      <div style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 24 }}>
        <div className="card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.8px', color,
              }}>{item.day_or_week}</span>
              <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: 'var(--text-primary)' }}>
                {item.focus_topic}
              </h4>
            </div>
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: `${color}10`,
              border: `1px solid ${color}30`,
              fontSize: 11, fontWeight: 700, color,
            }}>
              {item.tasks?.length || 0} tasks
            </div>
          </div>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(item.tasks || []).map((task, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  background: `${color}15`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <CheckSquare size={12} color={color} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 500 }}>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function MyPlan({ student, onStudentUpdate }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [targetDate, setTargetDate] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('tcs');
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [error, setError] = useState('');

  const today = new Date();
  const minDate = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    if (student?.target_date) {
      setTargetDate(student.target_date);
    }
    loadPlan();
  }, [student?.id]);

  async function loadPlan() {
    setLoading(true);
    try {
      const p = await getLatestPlan(student.id);
      setPlan(p);
      if (p?.target_company) {
        const found = COMPANIES.find(c => c.name.toLowerCase() === p.target_company.toLowerCase());
        if (found) {
          setSelectedCompanyId(found.id);
        } else {
          setSelectedCompanyId('other');
          setCustomCompanyName(p.target_company);
        }
      }
    } catch {
      setError('Failed to load study plan.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!targetDate) {
      setError('Please select your placement drive target date');
      return;
    }
    if (selectedCompanyId === 'other' && !customCompanyName.trim()) {
      setError('Please enter your custom target company name');
      return;
    }

    setGenerating(true);
    setError('');

    const targetCompany = selectedCompanyId === 'other'
      ? customCompanyName.trim()
      : (COMPANIES.find(c => c.id === selectedCompanyId)?.name || 'General');

    try {
      const result = await generatePlan(student.id, {
        target_date: targetDate,
        targetCompany,
      });
      setPlan(result);
      if (onStudentUpdate) {
        onStudentUpdate({ ...student, target_date: targetDate });
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate plan. Ensure you have progress entries recorded.');
    } finally {
      setGenerating(false);
    }
  }

  const planData = plan?.plan_json;
  const targetCompanyDisplay = plan?.target_company || planData?.targetCompany || '';
  const matchedCompany = COMPANIES.find(c => c.name.toLowerCase() === targetCompanyDisplay.toLowerCase());

  const daysLeft = targetDate
    ? Math.ceil((new Date(targetDate) - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Control Card: Company & Drive Date Picker ─────────────────────── */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={22} color="var(--accent-purple)" />
              Company-Specific Prep Mode
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Select your target company to generate a roadmap tailored to their specific interview patterns.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <label className="label" style={{ marginBottom: 4 }}>Placement Drive Date</label>
              <input
                className="input"
                type="date"
                min={minDate}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ padding: '8px 12px', width: 170 }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={generating || !targetDate}
              style={{ marginTop: 18, height: 38 }}
            >
              {generating ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Zap size={15} />}
              <span>{generating ? 'Generating Schedule...' : plan ? 'Regenerate Plan' : 'Generate My Plan'}</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16, fontSize: 13 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* ── Company Logo Grid Picker ────────────────────────────────────────── */}
        <label className="label" style={{ marginBottom: 12 }}>Target Company</label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}>
          {COMPANIES.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isSelected={selectedCompanyId === company.id}
              onClick={() => setSelectedCompanyId(company.id)}
            />
          ))}
        </div>

        {/* Inline custom company input for "Other" */}
        {selectedCompanyId === 'other' && (
          <div style={{
            padding: 16, borderRadius: 12, background: '#F8F9FC',
            border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center',
            animation: 'fadeIn 200ms ease-in-out'
          }}>
            <Briefcase size={20} color="#6C5CE7" />
            <div style={{ flex: 1 }}>
              <label className="label" style={{ marginBottom: 4 }}>Custom Company Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Goldman Sachs, Atlassian, Oracle, Startup X..."
                value={customCompanyName}
                onChange={(e) => setCustomCompanyName(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Roadmap Display Section ───────────────────────────────────────────── */}
      <div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 130, borderRadius: 16 }} />
            ))}
          </div>
        ) : !planData ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#FFFFFF', borderRadius: 20, border: '1px solid var(--border)',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)',
          }}>
            <Calendar size={48} style={{ opacity: 0.3, margin: '0 auto 16px', color: 'var(--accent-purple)' }} />
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No Study Plan Generated Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
              Select a target company and drive date above, then click "Generate My Plan"
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              The AI Planner generates a company-weighted roadmap prioritizing your weak areas
            </p>
          </div>
        ) : (
          <div>
            {/* Header with Target Company Badge */}
            <div className="card" style={{ marginBottom: 20, padding: '18px 24px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: '#F0FFF4', border: '1px solid #9AE6B4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {matchedCompany?.domain ? (
                      <img
                        src={`https://logo.clearbit.com/${matchedCompany.domain}`}
                        alt={targetCompanyDisplay}
                        style={{ width: 28, height: 28, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <Building2 size={22} color="#276749" />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                        Study Roadmap
                      </h2>
                      {targetCompanyDisplay && (
                        <span className="badge badge-strong" style={{ background: '#EBF8FF', color: '#2B6CB0', borderColor: '#90CDF4', fontSize: 12, padding: '3px 10px' }}>
                          Target: {targetCompanyDisplay}
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                      {planData.planType === 'weekly' ? 'Week-by-week' : 'Day-by-day'} action plan · {planData.plan?.length} structured modules
                      {daysLeft !== null && ` · ${daysLeft} days remaining`}
                    </p>
                  </div>
                </div>

                <button className="btn btn-secondary btn-sm" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw size={13} /> Regenerate Plan
                </button>
              </div>

              {planData.companyNote && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertCircle size={14} color="#DD6B20" />
                  <span>{planData.companyNote}</span>
                </div>
              )}
            </div>

            {/* Timeline Item Modules */}
            <div>
              {planData.plan?.map((item, i) => (
                <TimelineItem key={i} item={item} index={i} total={planData.plan.length} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
