import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';
import { Zap, Mail, Lock, User, ShieldCheck } from 'lucide-react';

export function LoginPage({ onLoginSuccess, onNavigateRegister, onBackHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'staff'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in both Email and Password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await loginUser({ email: email.trim(), password, role });
      if (res.success && res.token) {
        localStorage.setItem('careerforge_token', res.token);
        onLoginSuccess(res.user, res.token);
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }} className="animate-fade-in">
      <div className="card" style={{ maxWidth: 440, width: '100%', padding: '40px 36px', borderRadius: 24, boxShadow: 'var(--shadow-lg)' }}>
        <button onClick={onBackHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back to Home
        </button>

        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
          <Zap size={28} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>Sign In to CareerForge AI</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 20 }}>Select your portal role to continue</p>

        {/* Role Segmented Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 4, background: 'var(--bg-secondary)', borderRadius: 14, marginBottom: 20, border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setRole('student')}
            style={{
              padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: role === 'student' ? 'linear-gradient(135deg, var(--primary), var(--accent))' : 'transparent',
              color: role === 'student' ? '#FFFFFF' : 'var(--text-secondary)', transition: 'all 0.2s'
            }}
          >
            🎓 Student Portal
          </button>
          <button
            type="button"
            onClick={() => setRole('staff')}
            style={{
              padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: role === 'staff' ? 'linear-gradient(135deg, #10B981, #059669)' : 'transparent',
              color: role === 'staff' ? '#FFFFFF' : 'var(--text-secondary)', transition: 'all 0.2s'
            }}
          >
            🏫 Staff / Admin
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{ paddingLeft: 40, borderRadius: 12 }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="label" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', margin: 0 }}>Password</label>
              <button type="button" onClick={() => alert('Please contact administrator or re-register if password is lost.')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ paddingLeft: 40, borderRadius: 12 }}
              />
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', borderRadius: 12, marginTop: 8 }}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Don't have an account?{' '}
            <button onClick={onNavigateRegister} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export function RegisterPage({ onRegisterSuccess, onNavigateLogin, onBackHome }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full Name is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role
      });

      if (res.success) {
        alert('Account created successfully! Please sign in with your credentials.');
        onNavigateLogin();
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 24 }} className="animate-fade-in">
      <div className="card" style={{ maxWidth: 460, width: '100%', padding: '40px 36px', borderRadius: 24, boxShadow: 'var(--shadow-lg)' }}>
        <button onClick={onBackHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back to Home
        </button>

        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(79,70,229,0.3)' }}>
          <Zap size={28} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', textAlign: 'center', marginBottom: 4 }}>Create Account</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>Join CareerForge AI to supercharge your placement prep</p>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Karthick Naveen S" required style={{ paddingLeft: 40, borderRadius: 12 }} />
            </div>
          </div>

          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required style={{ paddingLeft: 40, borderRadius: 12 }} />
            </div>
          </div>

          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Password (Min 8 chars)</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingLeft: 40, borderRadius: 12 }} />
            </div>
          </div>

          <div>
            <label className="label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <ShieldCheck size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 14, top: 13 }} />
              <input className="input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required style={{ paddingLeft: 40, borderRadius: 12 }} />
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', borderRadius: 12, marginTop: 8 }}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Already have an account?{' '}
            <button onClick={onNavigateLogin} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
