import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { generateQuestion, generateCodingProblem, getCodingHint, executeCode, getProgress, logPrepPilotSolved } from '../api/client';
import { Sparkles, CheckCircle, XCircle, BookOpen, Code2, HelpCircle, Play, Lightbulb, Award, ChevronRight, Terminal, BookMarked, Copy, Check } from 'lucide-react';

const TOPICS = [
  'Arrays', 'Strings', 'Linked List', 'Stack', 'Queue', 'Hash Table',
  'Binary Search', 'Sorting', 'Dynamic Programming', 'Graph', 'Tree',
  'Recursion', 'Backtracking', 'Greedy', 'Heap', 'Two Pointers',
  'Sliding Window', 'Bit Manipulation', 'Math', 'Divide and Conquer',
];

const LANGUAGES = [
  { id: 'python', name: 'Python', monaco: 'python' },
  { id: 'java', name: 'Java', monaco: 'java' },
  { id: 'cpp', name: 'C++', monaco: 'cpp' },
];

const DIFFICULTY_COLORS = {
  easy: '#38A169',
  medium: '#DD6B20',
  hard: '#E53E3E',
};

function formatValue(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }
  return String(val);
}

export default function Practice({ student, theme }) {
  // Mode selection: null (show selector) | 'mcq' | 'coding'
  const [practiceMode, setPracticeMode] = useState(null);

  // Common controls
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('python');
  const [weakestTopic, setWeakestTopic] = useState('');
  const [sessionCount, setSessionCount] = useState(0);

  // ── MCQ Mode State ────────────────────────────────────────────────────────
  const [mcqQuestion, setMcqQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqError, setMcqError] = useState('');

  // ── Coding Challenge State ────────────────────────────────────────────────
  const [codingProblem, setCodingProblem] = useState(null);
  const [studentCode, setStudentCode] = useState('');
  const [codingLoading, setCodingLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [runningCode, setRunningCode] = useState(false);
  const [hint, setHint] = useState('');
  const [gettingHint, setGettingHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);
  const [codingError, setCodingError] = useState('');

  useEffect(() => {
    getProgress(student.id).then((d) => {
      if (d.analysis.length > 0) {
        const weak = d.analysis.find((t) => t.status === 'weak') || d.analysis[0];
        setWeakestTopic(weak.topic);
      }
    }).catch(() => {});
  }, [student.id]);

  // ── MCQ Handler ──────────────────────────────────────────────────────────
  async function handleGenerateMCQ() {
    setMcqLoading(true);
    setMcqError('');
    setMcqQuestion(null);
    setSelectedAnswer(null);
    setMcqSubmitted(false);
    try {
      const q = await generateQuestion(student.id, { topic: topic || undefined, difficulty });
      setMcqQuestion(q);
    } catch (err) {
      setMcqError(err?.response?.data?.error || 'Failed to generate MCQ question.');
    } finally {
      setMcqLoading(false);
    }
  }

  function handleMcqSubmit() {
    if (!selectedAnswer) return;
    setMcqSubmitted(true);
    setSessionCount((prev) => prev + 1);
  }

  // ── Coding Challenge Handlers ─────────────────────────────────────────────
  async function handleGenerateCoding(overrideLang) {
    const targetLang = overrideLang || language;
    setCodingLoading(true);
    setCodingError('');
    setCodingProblem(null);
    setTestResults(null);
    setHint('');
    setShowSolution(false);
    setCopiedSolution(false);
    try {
      const problem = await generateCodingProblem(student.id, {
        topic: topic || undefined,
        difficulty,
        language: targetLang,
      });
      setCodingProblem(problem);
      setStudentCode(problem.starterCode || '');
    } catch (err) {
      setCodingError(err?.response?.data?.error || 'Failed to generate coding problem.');
    } finally {
      setCodingLoading(false);
    }
  }

  // Handle mid-session language switch
  function handleLanguageChange(newLang) {
    setLanguage(newLang);
    if (practiceMode === 'coding') {
      handleGenerateCoding(newLang);
    }
  }

  async function handleRunCode() {
    if (!codingProblem || !studentCode) return;
    setRunningCode(true);
    setTestResults(null);

    // Call backend execution engine API (Python, Java, C++)
    try {
      const res = await executeCode({
        code: studentCode,
        language,
        testCases: codingProblem.testCases,
      });

      if (res.results) {
        setTestResults(res.results);
        if (res.results.every(r => r.passed)) {
          setShowSolution(true);
          setSessionCount((prev) => prev + 1);
          // Log solved coding challenge to PrepPilot history
          if (student?.id && codingProblem.title) {
            logPrepPilotSolved(student.id, {
              title: codingProblem.title,
              topic: codingProblem.topic || topic || 'General',
              difficulty: codingProblem.difficulty || difficulty || 'medium',
              language: language || 'python',
            }).catch(() => {});
          }
        }
      } else {
        throw new Error('No execution output received');
      }
    } catch (err) {
      setTestResults([{
        testIndex: 1,
        passed: false,
        actual: `Execution Error: ${err?.response?.data?.error || err.message}`,
        expected: 'Successful Execution',
        error: true,
      }]);
    } finally {
      setRunningCode(false);
    }
  }

  async function handleGetHint() {
    if (!codingProblem || !studentCode) return;
    setGettingHint(true);
    try {
      const res = await getCodingHint({
        title: codingProblem.title,
        description: codingProblem.description,
        code: studentCode,
        language,
      });
      setHint(res.hint);
    } catch (err) {
      setHint('Check your loop boundaries, variable initialization, and edge cases!');
    } finally {
      setGettingHint(false);
    }
  }

  function handleLoadSolutionToEditor() {
    if (!codingProblem?.solutionCode) return;
    setStudentCode(codingProblem.solutionCode);
    setCopiedSolution(true);
    setTimeout(() => setCopiedSolution(false), 2000);
  }

  const currentMonacoLang = LANGUAGES.find(l => l.id === language)?.monaco || 'javascript';

  // ── Mode Selector Screen ─────────────────────────────────────────────────
  if (!practiceMode) {
    return (
      <div style={{ maxWidth: 860, margin: '20px auto 0' }} className="animate-fade-in">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Interactive Practice Portal
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            Choose your learning mode to practice targeted placement questions with your AI tutor
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* MCQ Practice Card */}
          <div
            className="card"
            style={{
              padding: 32, cursor: 'pointer', textAlign: 'center',
              border: '2px solid transparent', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={() => { setPracticeMode('mcq'); handleGenerateMCQ(); }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <BookOpen size={28} color="var(--accent-purple)" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>MCQ Practice</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Multiple-choice questions with step-by-step concept explanations and detailed "Why this matters" tutor insights.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)',
            }}>
              <span>Start MCQ Practice</span>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Coding Challenge Card */}
          <div
            className="card"
            style={{
              padding: 32, cursor: 'pointer', textAlign: 'center',
              border: '2px solid transparent', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={() => { setPracticeMode('coding'); handleGenerateCoding(); }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3182CE'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: '#EBF8FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Code2 size={28} color="#3182CE" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Coding Challenge</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Multi-language code editor (JS, Python, Java, C++), test case runners, AI hints, and solution breakdowns.
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 14, fontWeight: 700, color: '#3182CE',
            }}>
              <span>Start Coding Challenge</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Practice View Top Controls ───────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Bar */}
      <div className="card" style={{ padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPracticeMode(null)}>
              ← Switch Mode
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              Mode: <strong style={{ color: 'var(--accent-purple)' }}>{practiceMode === 'mcq' ? 'MCQ Practice' : 'Coding Challenge'}</strong>
            </span>
            <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={15} color="var(--accent-purple)" />
              Session Progress: {sessionCount} completed
            </span>
          </div>

          {/* Control Dropdowns */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Language Selector (Coding Mode) */}
            {practiceMode === 'coding' && (
              <select
                className="input font-mono"
                style={{ width: 130, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: 'var(--accent-purple)' }}
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}

            <select
              className="input"
              style={{ width: 190, padding: '6px 12px', fontSize: 13 }}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">{weakestTopic ? `Auto: ${weakestTopic} (weakest)` : 'Auto-detect weakest'}</option>
              {TOPICS.map((t) => <option key={t}>{t}</option>)}
            </select>

            <select
              className="input"
              style={{ width: 100, padding: '6px 12px', fontSize: 13 }}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => practiceMode === 'mcq' ? handleGenerateMCQ() : handleGenerateCoding()}
              disabled={mcqLoading || codingLoading}
            >
              {(mcqLoading || codingLoading) ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Sparkles size={14} />}
              <span>Generate New</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── MCQ MODE VIEW ──────────────────────────────────────────────────────── */}
      {practiceMode === 'mcq' && (
        <div style={{ maxWidth: 880, margin: '0 auto', width: '100%' }}>
          {mcqError && <div className="alert alert-error animate-fade-in" style={{ marginBottom: 16 }}>{mcqError}</div>}

          {mcqLoading && (
            <div className="card animate-fade-in">
              <div className="skeleton" style={{ height: 24, width: '40%', marginBottom: 16 }} />
              <div className="skeleton" style={{ height: 18, width: '85%', marginBottom: 24 }} />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 50, marginBottom: 10, borderRadius: 12 }} />
              ))}
            </div>
          )}

          {mcqQuestion && !mcqLoading && (
            <div className="card animate-slide-up" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge" style={{
                    background: `${DIFFICULTY_COLORS[difficulty]}15`,
                    color: DIFFICULTY_COLORS[difficulty],
                    border: `1px solid ${DIFFICULTY_COLORS[difficulty]}40`,
                  }}>
                    {difficulty}
                  </span>
                  <span className="badge badge-weak">
                    {mcqQuestion.topic || topic || weakestTopic}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI Tutor MCQ</span>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, lineHeight: 1.6, color: 'var(--text-primary)' }}>
                {mcqQuestion.question}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {mcqQuestion.options.map((opt, i) => {
                  let cls = 'mcq-option';
                  if (mcqSubmitted) {
                    if (opt === mcqQuestion.correctAnswer) cls += ' correct';
                    else if (opt === selectedAnswer && opt !== mcqQuestion.correctAnswer) cls += ' wrong';
                  } else if (opt === selectedAnswer) {
                    cls += ' selected';
                  }
                  return (
                    <button
                      key={i}
                      className={cls}
                      onClick={() => !mcqSubmitted && setSelectedAnswer(opt)}
                      disabled={mcqSubmitted}
                    >
                      <span className="mcq-option-letter">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="mcq-option-text">
                        {opt}
                      </span>
                      {mcqSubmitted && opt === mcqQuestion.correctAnswer && (
                        <CheckCircle size={18} color="#38A169" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                      {mcqSubmitted && opt === selectedAnswer && opt !== mcqQuestion.correctAnswer && (
                        <XCircle size={18} color="#E53E3E" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {!mcqSubmitted && (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleMcqSubmit}
                  disabled={!selectedAnswer}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Submit Answer
                </button>
              )}

              {mcqSubmitted && (
                <div className="animate-slide-up" style={{ marginTop: 24 }}>
                  <div style={{
                    padding: '16px 20px', borderRadius: 12, marginBottom: 16,
                    background: selectedAnswer === mcqQuestion.correctAnswer ? '#F0FFF4' : '#FFF5F5',
                    border: `1px solid ${selectedAnswer === mcqQuestion.correctAnswer ? '#9AE6B4' : '#FEB2B2'}`,
                  }}>
                    <p style={{
                      fontWeight: 700, fontSize: 15, marginBottom: 4,
                      color: selectedAnswer === mcqQuestion.correctAnswer ? '#276749' : '#C53030',
                    }}>
                      {selectedAnswer === mcqQuestion.correctAnswer
                        ? "🎉 Nice work! Here's why that's the right approach:"
                        : "Good attempt! Let me guide you on where to adjust your thinking:"}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Correct Option: <strong style={{ color: 'var(--text-primary)' }}>{mcqQuestion.correctAnswer}</strong>
                    </p>
                  </div>

                  <div style={{
                    padding: '20px 24px', borderRadius: 14,
                    background: '#F8F9FC', border: '1px solid var(--border)',
                  }}>
                    <p style={{
                      fontSize: 12, fontWeight: 700, color: 'var(--accent-purple)',
                      textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <Lightbulb size={16} /> Why This Matters & Concept Breakdown
                    </p>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                      {mcqQuestion.explanation}
                    </p>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}
                    onClick={handleGenerateMCQ}
                  >
                    Next Question →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CODING CHALLENGE MODE VIEW ─────────────────────────────────────────── */}
      {practiceMode === 'coding' && (
        <div>
          {codingError && <div className="alert alert-error animate-fade-in" style={{ marginBottom: 16 }}>{codingError}</div>}

          {codingLoading && (
            <div className="card animate-fade-in" style={{ padding: 32, textAlign: 'center' }}>
              <span className="spinner-lg spinner" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 600 }}>
                Your AI tutor is crafting a {LANGUAGES.find(l => l.id === language)?.name} coding problem...
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Preparing {language.toUpperCase()} starter code & test cases
              </p>
            </div>
          )}

          {codingProblem && !codingLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start', minWidth: 0 }}>
              {/* Left Panel: Description & Feedback */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, overflow: 'hidden' }}>
                <div className="card animate-slide-up" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="badge" style={{
                        background: `${DIFFICULTY_COLORS[difficulty]}15`,
                        color: DIFFICULTY_COLORS[difficulty],
                        border: `1px solid ${DIFFICULTY_COLORS[difficulty]}40`,
                      }}>
                        {difficulty}
                      </span>
                      <span className="badge badge-weak">{codingProblem.topic || topic || weakestTopic}</span>
                    </div>
                    <span className="badge" style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', textTransform: 'uppercase' }}>
                      {LANGUAGES.find(l => l.id === (codingProblem.language || language))?.name}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
                    {codingProblem.title}
                  </h3>

                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                    {codingProblem.description}
                  </p>

                  {codingProblem.inputOutputFormat && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EDF2F7', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Format:</strong> {codingProblem.inputOutputFormat}
                    </div>
                  )}

                  {codingProblem.constraints && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFF5F5', border: '1px solid #FEB2B2', fontSize: 12, color: '#C53030', marginBottom: 16 }}>
                      <strong style={{ color: '#9B2C2C' }}>Constraints:</strong> {codingProblem.constraints}
                    </div>
                  )}

                  {/* Examples */}
                  {codingProblem.examples?.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Examples
                      </p>
                      {codingProblem.examples.map((ex, i) => (
                        <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: '#F7FAFC', border: '1px solid var(--border)', marginBottom: 6, fontSize: 13 }}>
                          <div><strong style={{ color: 'var(--text-primary)' }}>Input:</strong> <span className="font-mono">{typeof ex.input === 'object' ? JSON.stringify(ex.input) : String(ex.input)}</span></div>
                          <div><strong style={{ color: 'var(--text-primary)' }}>Output:</strong> <span className="font-mono">{typeof ex.output === 'object' ? JSON.stringify(ex.output) : String(ex.output)}</span></div>
                          {ex.explanation && (
                            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic' }}>
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hint Card */}
                {hint && (
                  <div className="card animate-slide-up" style={{ background: '#FFFAF0', border: '1px solid #FEEBC8', padding: 20 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#C05621', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HelpCircle size={16} /> AI Tutor Hint ({LANGUAGES.find(l => l.id === language)?.name})
                    </p>
                    <p style={{ fontSize: 13, color: '#7B341E', lineHeight: 1.6 }}>{hint}</p>
                  </div>
                )}

                {/* Solution & Concept Explanation Card */}
                {showSolution && (
                  <div className="card animate-slide-up" style={{ background: '#F8F9FC', border: '2px solid var(--accent-purple)', padding: 22 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <p style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--accent-purple)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <BookMarked size={18} /> Complete Solution & Learning Breakdown ({LANGUAGES.find(l => l.id === language)?.name})
                      </p>
                      {codingProblem.solutionCode && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={handleLoadSolutionToEditor}
                          style={{ fontSize: 12 }}
                        >
                          {copiedSolution ? <Check size={14} color="#38A169" /> : <Copy size={14} />}
                          <span>{copiedSolution ? 'Loaded to Editor!' : 'Load to Editor'}</span>
                        </button>
                      )}
                    </div>

                    {/* Complexity Badges */}
                    {(codingProblem.timeComplexity || codingProblem.spaceComplexity) && (
                      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                        {codingProblem.timeComplexity && (
                          <span className="badge" style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', fontSize: 12 }}>
                            ⏱️ Time Complexity: {codingProblem.timeComplexity}
                          </span>
                        )}
                        {codingProblem.spaceComplexity && (
                          <span className="badge" style={{ background: '#F0FFF4', color: '#276749', border: '1px solid #9AE6B4', fontSize: 12 }}>
                            💾 Space Complexity: {codingProblem.spaceComplexity}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Solution Code Display */}
                    {codingProblem.solutionCode && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
                          Optimal Solution Code ({language.toUpperCase()}):
                        </p>
                        <pre style={{
                          background: '#1E1E1E', color: '#D4D4D4', padding: 14, borderRadius: 10,
                          fontSize: 12, fontFamily: 'monospace',
                          overflowX: 'auto', overflowY: 'auto', maxHeight: 320,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0,
                        }}>
                          {codingProblem.solutionCode}
                        </pre>
                      </div>
                    )}

                    {/* Step-by-Step Concept Breakdown */}
                    <div style={{
                      padding: 16, borderRadius: 10, background: '#FFFFFF',
                      border: '1px solid var(--border)', fontSize: 13, lineHeight: 1.7,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Lightbulb size={16} color="var(--accent-purple)" /> Concept & Intuition Breakdown
                      </p>
                      <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-line', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {codingProblem.explanation}
                      </p>
                    </div>

                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => handleGenerateCoding()}>
                        Try Next Problem →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel: Code Editor & Test Cases */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, overflow: 'hidden' }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div style={{
                    padding: '10px 16px', background: '#F7FAFC', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Terminal size={14} color="var(--text-secondary)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        solution.{language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : 'js'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleGetHint}
                        disabled={gettingHint}
                      >
                        {gettingHint ? <span className="spinner" /> : <HelpCircle size={13} />}
                        <span>Get Hint</span>
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ border: '1px solid var(--accent-purple)', color: 'var(--accent-purple)' }}
                        onClick={() => setShowSolution(!showSolution)}
                      >
                        <BookMarked size={13} />
                        <span>{showSolution ? 'Hide Solution' : 'Explain & Solution'}</span>
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={handleRunCode}
                        disabled={runningCode}
                      >
                        {runningCode ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Play size={13} />}
                        <span>{runningCode ? 'Executing...' : 'Run Code'}</span>
                      </button>
                    </div>
                  </div>

                  <Editor
                    height="350px"
                    language={currentMonacoLang}
                    value={studentCode}
                    onChange={(val) => setStudentCode(val || '')}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbersMinChars: 3,
                      padding: { top: 12 },
                    }}
                  />
                </div>

                {/* Test Results Output */}
                {testResults && (
                  <div className="card animate-slide-up" style={{ padding: 20, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Execution Output</h4>
                        <span className="badge" style={{
                          background: testResults.every(r => r.passed) ? 'rgba(56, 161, 105, 0.15)' : 'rgba(229, 62, 62, 0.15)',
                          color: testResults.every(r => r.passed) ? '#38A169' : '#E53E3E',
                          border: `1px solid ${testResults.every(r => r.passed) ? 'rgba(56, 161, 105, 0.3)' : 'rgba(229, 62, 62, 0.3)'}`,
                          fontSize: 12, padding: '4px 10px', borderRadius: 8
                        }}>
                          {testResults.every(r => r.passed) ? 'Accepted' : 'Wrong Answer / Runtime Error'}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Passed: <strong style={{ color: testResults.every(r => r.passed) ? '#38A169' : '#E53E3E' }}>{testResults.filter(r => r.passed).length}/{testResults.length}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                      {testResults.map((r, i) => {
                        const isError = r.error || String(r.actual).includes('Runtime Error') || String(r.actual).includes('Error');
                        const statusLabel = r.passed ? 'Passed' : isError ? 'Runtime Error' : 'Wrong Answer';
                        const statusColor = r.passed ? '#38A169' : '#E53E3E';
                        const bgColor = r.passed ? 'rgba(56, 161, 105, 0.08)' : 'rgba(229, 62, 62, 0.08)';
                        const borderColor = r.passed ? 'rgba(56, 161, 105, 0.25)' : 'rgba(229, 62, 62, 0.25)';

                        return (
                          <div key={i} style={{
                            padding: '12px 14px', borderRadius: 10,
                            background: bgColor,
                            border: `1px solid ${borderColor}`,
                            fontSize: 13,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, marginBottom: 6, alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-primary)' }}>Case {r.testIndex || i + 1}</span>
                              <span style={{
                                fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                                color: statusColor, padding: '2px 8px', borderRadius: 6,
                                background: `${statusColor}18`, border: `1px solid ${statusColor}33`
                              }}>
                                {r.passed ? '✓ ' : '✕ '}{statusLabel}
                              </span>
                            </div>

                            {r.input && (
                              <div style={{ marginBottom: 4, color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Input:</strong> <code style={{ background: 'var(--hover-bg)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>{formatValue(r.input)}</code>
                              </div>
                            )}

                            <div style={{ marginBottom: r.expected ? 4 : 0, color: statusColor }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Actual Output:</strong> <code style={{ background: 'var(--hover-bg)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', color: statusColor }}>{formatValue(r.actual)}</code>
                            </div>

                            {!r.passed && r.expected && (
                              <div style={{ color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Expected:</strong> <code style={{ background: 'var(--hover-bg)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', color: '#38A169' }}>{formatValue(r.expected)}</code>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {testResults.every(r => r.passed) && (
                      <div style={{ marginTop: 16, textAlign: 'center', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: '#38A169', marginBottom: 10 }}>
                          🎉 All Test Cases Passed! Ready for Next Challenge!
                        </p>
                        <button className="btn btn-primary btn-sm" onClick={() => handleGenerateCoding()}>
                          Next Coding Challenge →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
