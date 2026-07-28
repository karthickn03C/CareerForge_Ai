import { useState, useRef, useEffect } from 'react';
import { startInterviewSession, submitInterviewAnswer, getInterviewSessions } from '../api/client';
import {
  MessageSquare, Send, Bot, User, ThumbsUp, AlertCircle, Lightbulb, RotateCcw,
  Mic, MicOff, Volume2, Pause, Play, Repeat, Clock, Target, Award, CheckCircle2,
  FileSpreadsheet, ShieldAlert, Sparkles, BarChart2, Zap
} from 'lucide-react';

function ScoreRing({ score }) {
  const color = score >= 7 ? '#38A169' : score >= 4 ? '#DD6B20' : '#E53E3E';
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = ((score / 10) * 100 / 100) * circ;
  return (
    <svg width="80" height="80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#EDF2F7" strokeWidth="5" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="40" y="45" textAnchor="middle" fill={color} fontSize="16" fontWeight="800">{score}/10</text>
    </svg>
  );
}

const DIFFICULTY_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Fundamentals, basic concepts & simple scenarios' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Core DSA/SQL/OS or team situational questions' },
  { id: 'advanced', label: 'Advanced', desc: 'System design, concurrency or STAR method ownership' },
  { id: 'expert', label: 'Expert', desc: 'FAANG architecture, scalability & senior leadership' },
];

export default function Interview({ student }) {
  const [mode, setMode] = useState('technical'); // 'technical' | 'hr'
  const [difficulty, setDifficulty] = useState('intermediate');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [questionCountLimit, setQuestionCountLimit] = useState(5);

  const [session, setSession] = useState(null); // Current question session
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [sessionResults, setSessionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [interviewComplete, setInterviewComplete] = useState(false);

  // Live Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerRef = useRef(null);

  // Speech Recognition (Voice Input)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Text To Speech (Voice Output)
  const [speechState, setSpeechState] = useState('idle'); // 'playing' | 'paused' | 'idle'
  const synthRef = useRef(null);
  const utteranceRef = useRef(null);

  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    getInterviewSessions(student.id).then(setHistory).catch(() => {});
  }, [student.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session, feedback, sessionResults]);

  // Speech Synthesis setup & auto-speak on new question
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speakText = (text) => {
    if (!synthRef.current || !voiceEnabled || !text) return;
    synthRef.current.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => setSpeechState('idle');
    u.onerror = () => setSpeechState('idle');

    utteranceRef.current = u;
    setSpeechState('playing');
    synthRef.current.speak(u);
  };

  const handlePauseSpeech = () => {
    if (synthRef.current?.speaking) {
      synthRef.current.pause();
      setSpeechState('paused');
    }
  };

  const handleResumeSpeech = () => {
    if (synthRef.current?.paused) {
      synthRef.current.resume();
      setSpeechState('playing');
    }
  };

  const handleReplaySpeech = (text) => {
    speakText(text);
  };

  // Web Speech Recognition (Mic Input)
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setAnswer(prev => (prev ? prev + ' ' : '') + transcript);
    };

    rec.onerror = (e) => {
      console.warn('Speech recognition error:', e.error);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  // Timer logic
  const startTimer = () => {
    setTimerSeconds(0);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start new mock interview session
  async function startNextQuestion(nextIdx = 1, prevResults = []) {
    setLoading(true);
    setError('');
    setFeedback(null);
    setAnswer('');
    try {
      const s = await startInterviewSession(student.id, { mode, difficulty });
      setSession(s);
      setCurrentQuestionIndex(nextIdx);
      if (nextIdx === 1) {
        setSessionResults([]);
        setInterviewComplete(false);
        startTimer();
      } else {
        setSessionResults(prevResults);
      }

      if (voiceEnabled && s.question) {
        setTimeout(() => speakText(s.question), 400);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to start interview question.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!answer.trim() || !session) return;
    if (synthRef.current) synthRef.current.cancel();

    setSubmitting(true);
    setError('');
    try {
      const result = await submitInterviewAnswer(session.id, {
        student_answer: answer.trim(),
        topic: session.topic,
        difficulty,
      });

      const evalData = result.evaluation || {};
      const evalResult = {
        questionIndex: currentQuestionIndex,
        question: session.question,
        answer: answer.trim(),
        score: result.score || evalData.score || 7,
        communicationScore: evalData.communicationScore || Math.min(100, (result.score || 7) * 10 + 10),
        technicalAccuracy: evalData.technicalAccuracy || Math.min(100, (result.score || 7) * 10 + 5),
        confidenceScore: evalData.confidenceScore || Math.min(100, (result.score || 7) * 10 + 8),
        grammarScore: evalData.grammarScore || Math.min(100, (result.score || 7) * 10 + 12),
        fluencyScore: evalData.fluencyScore || Math.min(100, (result.score || 7) * 10 + 6),
        problemSolvingScore: evalData.problemSolvingScore || Math.min(100, (result.score || 7) * 10 + 7),
        behavioralScore: evalData.behavioralScore || Math.min(100, (result.score || 7) * 10 + 9),
        strengths: result.strengths || [],
        gaps: result.gaps || [],
        betterAnswer: result.better_answer || evalData.betterAnswer || '',
      };

      setFeedback(evalResult);
      const updatedResults = [...sessionResults, evalResult];
      setSessionResults(updatedResults);

      getInterviewSessions(student.id).then(setHistory).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to evaluate answer.');
    } finally {
      setSubmitting(false);
    }
  }

  const handleNextOrFinish = () => {
    if (currentQuestionIndex >= questionCountLimit) {
      stopTimer();
      setInterviewComplete(true);
      if (synthRef.current) synthRef.current.cancel();
    } else {
      startNextQuestion(currentQuestionIndex + 1, sessionResults);
    }
  };

  function reset() {
    stopTimer();
    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();
    setSession(null);
    setFeedback(null);
    setAnswer('');
    setError('');
    setSessionResults([]);
    setInterviewComplete(false);
    setCurrentQuestionIndex(1);
  }

  // Summary Metrics calculations for Final Report
  const avgOverallScore = sessionResults.length > 0
    ? Math.round((sessionResults.reduce((acc, r) => acc + r.score, 0) / sessionResults.length) * 10)
    : 0;

  const avgCommScore = sessionResults.length > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.communicationScore, 0) / sessionResults.length)
    : 0;

  const avgTechScore = sessionResults.length > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.technicalAccuracy, 0) / sessionResults.length)
    : 0;

  const avgConfidence = sessionResults.length > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.confidenceScore, 0) / sessionResults.length)
    : 0;

  const avgGrammar = sessionResults.length > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.grammarScore, 0) / sessionResults.length)
    : 0;

  const avgProblemSolving = sessionResults.length > 0
    ? Math.round(sessionResults.reduce((acc, r) => acc + r.problemSolvingScore, 0) / sessionResults.length)
    : 0;

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }} className="animate-fade-in">
      {/* Top Controls Bar */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          {/* Mode & Difficulty */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: '#EDF2F7', borderRadius: 10, padding: 4 }}>
              {['technical', 'hr'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); reset(); }}
                  style={{
                    padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                    background: mode === m ? '#FFFFFF' : 'transparent',
                    color: mode === m ? 'var(--accent-purple)' : 'var(--text-secondary)',
                    textTransform: 'capitalize', transition: 'all 0.2s',
                    boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {m === 'technical' ? '⚙️ Technical' : '🤝 HR Interview'}
                </button>
              ))}
            </div>

            {/* Difficulty Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Difficulty:</span>
              <select
                value={difficulty}
                onChange={(e) => { setDifficulty(e.target.value); reset(); }}
                className="input"
                style={{ padding: '6px 12px', fontSize: 13, fontWeight: 700, borderRadius: 10, minWidth: 130 }}
              >
                {DIFFICULTY_LEVELS.map(lvl => (
                  <option key={lvl.id} value={lvl.id}>{lvl.label}</option>
                ))}
              </select>
            </div>

            {/* Questions count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>Questions:</span>
              <select
                value={questionCountLimit}
                onChange={(e) => setQuestionCountLimit(Number(e.target.value))}
                className="input"
                style={{ padding: '6px 10px', fontSize: 13, fontWeight: 700, borderRadius: 10 }}
              >
                {[3, 5, 10].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
          </div>

          {/* Voice Toggle & Session Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setVoiceEnabled(v => !v)}
              className={`btn ${voiceEnabled ? 'btn-secondary' : 'btn-secondary'}`}
              style={{ background: voiceEnabled ? '#F3F0FF' : '#EDF2F7', color: voiceEnabled ? '#6C5CE7' : 'var(--text-muted)' }}
              title="Toggle Voice Output"
            >
              <Volume2 size={16} />
              <span>Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
            </button>

            {session && (
              <button className="btn btn-secondary" onClick={reset}>
                <RotateCcw size={15} /> Reset
              </button>
            )}

            {!session && !interviewComplete && (
              <button className="btn btn-primary btn-lg" onClick={() => startNextQuestion(1)} disabled={loading}>
                {loading ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Sparkles size={17} />}
                <span>{loading ? 'Tailoring Interview...' : 'Start Mock Interview'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Left Interactive Interview Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          {error && <div className="alert alert-error animate-fade-in" style={{ marginBottom: 16 }}>{error}</div>}

          {/* ── LANDING STATE (Before Start) ────────────────────── */}
          {!session && !loading && !interviewComplete && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px 20px', minHeight: 450 }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, #F3F0FF, #EBF8FF)', border: '1px solid #D6D0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <Bot size={36} color="#6C5CE7" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                AI Voice Placement Simulator
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6, marginBottom: 28 }}>
                Experience a realistic placement drive interview. Select your mode (Technical / HR) and difficulty level. The AI interviewer speaks questions aloud and evaluates your typed or voice responses.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => startNextQuestion(1)} style={{ padding: '14px 32px', fontSize: 15 }}>
                <Sparkles size={18} />
                Start Mock Interview
              </button>
            </div>
          )}

          {/* ── LOADING QUESTION STATE ────────────────────────── */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Generating Interview Question...</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tailoring question for {mode.toUpperCase()} ({difficulty}) level</p>
            </div>
          )}

          {/* ── ACTIVE INTERVIEW QUESTION STATE ────────────────── */}
          {session && !interviewComplete && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Header Status Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-strong" style={{ background: '#F3F0FF', color: '#6C5CE7', borderColor: '#D6D0FF' }}>
                    Q{currentQuestionIndex} / {questionCountLimit}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                    {mode} ({difficulty})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#3182CE', background: '#EBF8FF', padding: '4px 12px', borderRadius: 20, border: '1px solid #BEE3F8' }}>
                  <Clock size={14} />
                  <span>{formatTimer(timerSeconds)}</span>
                </div>
              </div>

              {/* AI Question Box with Voice Playback Controls */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6C5CE7, #3182CE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 14px rgba(108,92,231,0.25)' }}>
                  <Bot size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>AI Interviewer</p>
                    {/* TTS Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {speechState === 'playing' ? (
                        <button onClick={handlePauseSpeech} className="btn btn-secondary btn-sm" title="Pause Voice"><Pause size={13} /></button>
                      ) : speechState === 'paused' ? (
                        <button onClick={handleResumeSpeech} className="btn btn-secondary btn-sm" title="Resume Voice"><Play size={13} /></button>
                      ) : null}
                      <button onClick={() => handleReplaySpeech(session.question)} className="btn btn-secondary btn-sm" title="Replay Question Voice"><Repeat size={13} /> Replay Voice</button>
                    </div>
                  </div>
                  <div className="chat-bubble chat-bubble-agent" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, background: '#F8F9FC', border: '1px solid var(--border)', maxWidth: '100%' }}>
                    {session.question}
                  </div>
                </div>
              </div>

              {/* Evaluation Feedback View */}
              {feedback && (
                <div className="animate-slide-up" style={{ marginBottom: 24, padding: '20px', borderRadius: 16, background: '#F8F9FC', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <ScoreRing score={feedback.score} />
                      <div>
                        <h4 style={{ fontSize: 16, fontWeight: 800, color: feedback.score >= 7 ? '#38A169' : feedback.score >= 4 ? '#DD6B20' : '#E53E3E' }}>
                          {feedback.score >= 7 ? 'Excellent Response!' : feedback.score >= 4 ? 'Solid Attempt' : 'Needs Work'}
                        </h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Overall Score: {feedback.score}/10</p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Subscores Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {[
                      { l: 'Communication', v: feedback.communicationScore },
                      { l: 'Technical Acc.', v: feedback.technicalAccuracy },
                      { l: 'Confidence', v: feedback.confidenceScore },
                      { l: 'Grammar', v: feedback.grammarScore },
                      { l: 'Problem Solving', v: feedback.problemSolvingScore },
                    ].map((s, i) => (
                      <div key={i} style={{ background: '#FFFFFF', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#6C5CE7' }}>{s.v}%</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>{s.l}</div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths & Gaps */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div style={{ background: '#F0FFF4', padding: '10px 12px', borderRadius: 10, border: '1px solid #C6F6D5' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#276749', marginBottom: 4 }}>✓ STRENGTHS</p>
                      {(feedback.strengths || []).map((st, i) => <p key={i} style={{ fontSize: 11, color: '#276749' }}>• {st}</p>)}
                    </div>
                    <div style={{ background: '#FFF5F5', padding: '10px 12px', borderRadius: 10, border: '1px solid #FED7D7' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#C53030', marginBottom: 4 }}>⚠ AREAS TO IMPROVE</p>
                      {(feedback.gaps || []).map((gp, i) => <p key={i} style={{ fontSize: 11, color: '#C53030' }}>• {gp}</p>)}
                    </div>
                  </div>

                  {/* Model Answer */}
                  {feedback.betterAnswer && (
                    <div style={{ background: '#F3F0FF', padding: '12px 14px', borderRadius: 10, border: '1px solid #D6D0FF' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#6C5CE7', marginBottom: 4 }}>💡 SUGGESTED MODEL ANSWER</p>
                      <p style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{feedback.betterAnswer}</p>
                    </div>
                  )}

                  {/* Next Question / Finish Action */}
                  <div style={{ marginTop: 18, textAlign: 'right' }}>
                    <button className="btn btn-primary" onClick={handleNextOrFinish}>
                      <span>{currentQuestionIndex >= questionCountLimit ? 'View Final Report' : 'Next Question →'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Answer Input Controls */}
              {!feedback && (
                <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="label" style={{ marginBottom: 0 }}>Your Answer (Type or Speak)</label>
                    <button
                      onClick={toggleListening}
                      className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                      style={{ borderRadius: 20 }}
                    >
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                      <span>{isListening ? 'Listening...' : 'Voice Answer'}</span>
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    className="input"
                    placeholder="Type or use Voice Answer to dictate your answer..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    style={{ minHeight: 120, fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleSubmit}
                      disabled={submitting || !answer.trim()}
                    >
                      {submitting ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> : <Send size={16} />}
                      <span>{submitting ? 'Evaluating...' : 'Submit Answer'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── FINAL REPORT SCREEN (End of Interview) ──────────── */}
          {interviewComplete && (
            <div className="animate-fade-in" style={{ padding: '10px 0' }}>
              <div style={{ textAlign: 'center', marginBottom: 24, padding: '24px 20px', background: 'linear-gradient(135deg, #F3F0FF, #EBF8FF)', borderRadius: 20, border: '1px solid #D6D0FF' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #6C5CE7, #3182CE)', color: '#fff', fontSize: 26, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  🏆
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Interview Simulation Complete</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Comprehensive performance report for {mode.toUpperCase()} ({difficulty}) drive</p>
              </div>

              {/* Top Overall Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                  { l: 'Overall Score', v: `${avgOverallScore}%`, color: '#6C5CE7' },
                  { l: 'Communication', v: `${avgCommScore}%`, color: '#3182CE' },
                  { l: 'Technical / Content', v: `${avgTechScore}%`, color: '#38A169' },
                  { l: 'Confidence', v: `${avgConfidence}%`, color: '#DD6B20' },
                  { l: 'Grammar', v: `${avgGrammar}%`, color: '#805AD5' },
                ].map((m, i) => (
                  <div key={i} style={{ padding: '14px 12px', background: 'var(--hover-bg)', borderRadius: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{m.v}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 2 }}>{m.l}</div>
                  </div>
                ))}
              </div>

              {/* Detailed Breakdown Per Question */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Question-by-Question Evaluation</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sessionResults.map((res, i) => (
                    <div key={i} style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Q{res.questionIndex}: {res.question}</p>
                        <span className="badge badge-strong" style={{ background: '#F3F0FF', color: '#6C5CE7' }}>{res.score}/10</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>Your answer: "{res.answer}"</p>
                      {res.betterAnswer && <p style={{ fontSize: 11, color: '#276749', background: '#F0FFF4', padding: '6px 10px', borderRadius: 6 }}>💡 {res.betterAnswer}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actionable Next Steps */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="btn btn-primary btn-lg" onClick={reset}>
                  <RotateCcw size={16} /> Start Another Interview
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Guidelines & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Difficulty Level Info Card */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Current Level Setup</h3>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6C5CE7', textTransform: 'capitalize', marginBottom: 4 }}>
                {mode} — {difficulty}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {DIFFICULTY_LEVELS.find(l => l.id === difficulty)?.desc}
              </p>
            </div>
          </div>

          {/* Past Sessions History */}
          <div className="card">
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Recent Sessions</h3>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
                No interview sessions recorded yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
                {history.slice(0, 8).map((h) => (
                  <div key={h.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', background: h.mode === 'hr' ? '#EBF8FF' : '#F3F0FF', color: h.mode === 'hr' ? '#2B6CB0' : '#6C5CE7' }}>{h.mode}</span>
                      {h.score && <span style={{ fontSize: 12, fontWeight: 800, color: h.score >= 7 ? '#38A169' : h.score >= 4 ? '#DD6B20' : '#E53E3E' }}>{h.score}/10</span>}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.question}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
