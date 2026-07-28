import { useState, useEffect, useRef } from 'react';
import {
  sendForgemindChat, getForgemindConversations, getForgemindMessages,
  deleteForgemindConversation, togglePinForgemindConversation, saveOpportunity
} from '../api/client';
import {
  Brain, Sparkles, Mic, MicOff, Send, Paperclip, FileText, CheckCircle2,
  Bookmark, ExternalLink, ChevronRight, Zap, Plus, Search, Trash2, Pin, MessageSquare,
  RefreshCw, Volume2, VolumeX, Camera
} from 'lucide-react';

const DYNAMIC_SUGGESTIONS = [
  { label: 'Analyze Resume & Weak Spots', query: 'Review my resume and highlight my top technical strengths and weak areas.' },
  { label: 'Prepare for Amazon SDE Interview', query: 'I want a Software Engineer job at Amazon. Prepare me completely.' },
  { label: 'Practice Weak DSA Topics', query: 'Analyze my weak DSA topics and give me a targeted coding challenge.' },
  { label: 'Generate 14-Day Study Plan', query: 'Create a 14-day study plan targeting product-based placement drives.' },
  { label: 'Find Internships & Hackathons', query: 'Find Flutter and Python internships or hackathons suitable for my level.' },
  { label: 'Review Placement Readiness', query: 'Review my overall practice progress, interview scores, and placement readiness.' },
];

export default function ForgeMind({ student, theme, onNavigate }) {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState('new');
  const [searchConvQuery, setSearchConvQuery] = useState('');

  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streamingStep, setStreamingStep] = useState(''); // Thinking, Planning, Calling Agent, Synthesizing
  const [error, setError] = useState('');

  // Voice STT & TTS State
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (student?.id) {
      loadConversations();
    }
  }, [student?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingStep]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);

      recognitionRef.current = rec;
    }
  }, []);

  async function loadConversations() {
    try {
      const convs = await getForgemindConversations(student.id);
      setConversations(convs || []);
    } catch (e) {
      console.warn('Load conversations error:', e.message);
    }
  }

  async function handleSelectConversation(convId) {
    setCurrentConvId(convId);
    setLoading(true);
    try {
      const msgs = await getForgemindMessages(convId);
      setMessages(msgs || []);
    } catch (e) {
      console.error('Load messages error:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleStartNewChat() {
    setCurrentConvId('new');
    setMessages([]);
    setInputQuery('');
    setFile(null);
  }

  async function handleDeleteConv(e, convId) {
    e.stopPropagation();
    try {
      await deleteForgemindConversation(convId);
      if (currentConvId === convId) {
        handleStartNewChat();
      }
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleTogglePinConv(e, convId) {
    e.stopPropagation();
    try {
      await togglePinForgemindConversation(convId);
      loadConversations();
    } catch (e) {
      console.error(e);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function toggleListen() {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported on this device.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  }

  function speakText(text) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, '').substring(0, 250);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(utterance);
  }

  async function handleSend(customText = null) {
    const queryToSend = customText || inputQuery;
    if (!queryToSend.trim() && !file) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: queryToSend,
      file_name: file ? file.name : null,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);
    setError('');

    // Simulate ChatGPT multi-stage thinking indicator
    setStreamingStep('Analyzing Intent...');
    setTimeout(() => setStreamingStep('Task Planning & Agent Routing...'), 500);
    setTimeout(() => setStreamingStep('Executing Parallel Agents & Synthesizing...'), 1200);

    try {
      const formData = new FormData();
      formData.append('query', queryToSend);
      formData.append('conversationId', currentConvId);
      if (file) {
        formData.append('file', file);
      }

      const res = await sendForgemindChat(student.id, formData);

      if (res.conversationId && res.conversationId !== currentConvId) {
        setCurrentConvId(res.conversationId);
        loadConversations();
      }

      const agentMsg = {
        id: res.agentMessageId || `agent_${Date.now()}`,
        sender: 'agent',
        text: res.markdownResponse || 'Forgemind response processed.',
        agentDetails: res.agentOutputs,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, agentMsg]);
      setFile(null);
      if (voiceEnabled) {
        speakText(agentMsg.text);
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'ForgeMind failed to process request.');
    } finally {
      setLoading(false);
      setStreamingStep('');
    }
  }

  async function handleBookmarkOpp(opp) {
    try {
      await saveOpportunity(student.id, opp);
      alert(`Saved "${opp.title}" to bookmarks!`);
    } catch (e) {
      console.error(e);
    }
  }

  const filteredConvs = conversations.filter(c =>
    (c.title || '').toLowerCase().includes(searchConvQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 110px)', maxWidth: 1300, margin: '0 auto' }} className="animate-fade-in">
      {/* Left History Sidebar (ChatGPT Style) */}
      <div className="card" style={{ width: 270, flexShrink: 0, padding: 16, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-primary" onClick={handleStartNewChat} style={{ width: '100%', borderRadius: 12, justifyContent: 'center' }}>
          <Plus size={16} /> New Chat
        </button>

        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 11 }} />
          <input
            className="input"
            value={searchConvQuery}
            onChange={e => setSearchConvQuery(e.target.value)}
            placeholder="Search chats..."
            style={{ paddingLeft: 30, fontSize: 12, borderRadius: 10, height: 36 }}
          />
        </div>

        {/* Conversation List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredConvs.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No recent chats</div>
          ) : (
            filteredConvs.map(conv => {
              const isActive = currentConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  style={{
                    padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                    background: isActive ? 'var(--hover-bg)' : 'transparent',
                    border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <MessageSquare size={14} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                      {conv.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={(e) => handleTogglePinConv(e, conv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: conv.pinned ? 'var(--primary)' : 'var(--text-muted)' }}>
                      <Pin size={12} />
                    </button>
                    <button onClick={(e) => handleDeleteConv(e, conv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Controls Bar */}
        <div className="card" style={{ padding: '14px 20px', borderRadius: 20, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>ForgeMind AI</h2>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Master Multi-Agent Career Orchestrator</span>
            </div>
          </div>

          <button
            className={`btn ${voiceEnabled ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            style={{ borderRadius: 20 }}
          >
            {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 14 }}>
          {messages.length === 0 && !loading && (
            <div style={{ textAlign: 'center', margin: 'auto 0', padding: '40px 20px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Brain size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Hi {student?.name || 'Karthick'} 👋</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto 20px', lineHeight: 1.6 }}>
                I am your Master AI Orchestrator. Ask me anything or choose a quick action below to coordinate Resume Analysis, Coding Practice, Mock Interviews, Study Plans, Progress, and Opportunities.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                gap: 10,
              }}
            >
              {msg.sender === 'agent' && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                  <Brain size={16} />
                </div>
              )}

              <div style={{ maxWidth: '85%' }}>
                <div
                  className={`card ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-agent'}`}
                  style={{
                    borderRadius: 16,
                    padding: '14px 18px',
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'var(--bg-card)',
                    color: msg.sender === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {msg.file_name && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                      <Paperclip size={12} /> {msg.file_name}
                    </div>
                  )}

                  <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.text}
                  </div>

                  {/* Sub-Agent Widgets */}
                  {msg.agentDetails && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {msg.agentDetails.practiceData && (
                        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--hover-bg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Recommended Coding Challenge</div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)' }}>{msg.agentDetails.practiceData.title}</div>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => onNavigate && onNavigate('practice')}>Solve <ChevronRight size={12} /></button>
                        </div>
                      )}

                      {msg.agentDetails.opportunityData?.opportunities?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Matched Opportunities ({msg.agentDetails.opportunityData.opportunities.length})</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
                            {msg.agentDetails.opportunityData.opportunities.slice(0, 2).map(opp => (
                              <div key={opp.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--hover-bg)', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-primary)' }}>{opp.title}</div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                  <a href={opp.applyUrl || '#'} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center', fontSize: 10 }}>Apply <ExternalLink size={10} /></a>
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleBookmarkOpp(opp)}><Bookmark size={10} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking / Streaming Indicator */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--hover-bg)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
              <div className="spinner" style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: 'var(--primary)', width: 16, height: 16 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{streamingStep || 'ForgeMind thinking...'}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic AI Suggestions Grid */}
        {messages.length === 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14, flexShrink: 0 }}>
            {DYNAMIC_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => handleSend(sug.query)}
                className="card card-hover"
                style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border-color)', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{sug.label}</div>
              </button>
            ))}
          </div>
        )}

        {error && <div className="alert alert-error" style={{ marginBottom: 10 }}>{error}</div>}

        {/* File Preview Pill */}
        {file && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderRadius: 16, background: 'var(--hover-bg)', border: '1px solid var(--primary)', fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8, alignSelf: 'flex-start' }}>
            <FileText size={13} /> {file.name}
            <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>✕</button>
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="card" style={{ padding: '8px 12px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files[0])} accept=".pdf,.docx,.doc,.txt,image/*" style={{ display: 'none' }} />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ borderRadius: 10, padding: 8 }} title="Upload File or Resume">
            <Paperclip size={16} />
          </button>
          <button className={`btn ${isListening ? 'btn-primary' : 'btn-secondary'}`} onClick={toggleListen} style={{ borderRadius: 10, padding: 8 }} title="Voice Input">
            <Mic size={16} />
          </button>

          <input
            className="input"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask ForgeMind AI anything (e.g. Prepare me for Amazon, review resume...)"
            style={{ border: 'none', background: 'transparent', fontSize: 14 }}
          />

          <button className="btn btn-primary" onClick={() => handleSend()} disabled={loading || (!inputQuery.trim() && !file)} style={{ borderRadius: 10, padding: '8px 14px' }}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
