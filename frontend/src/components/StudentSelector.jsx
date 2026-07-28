import { useState, useEffect } from 'react';
import { getStudents, createStudent, deleteStudent } from '../api/client';
import { Plus, Trash2, User, X } from 'lucide-react';

export default function StudentSelector({ onSelect, onClose, currentStudent }) {
  const [students, setStudents] = useState([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch {
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const student = await createStudent({ name: newName.trim() });
      setStudents((prev) => [student, ...prev]);
      setNewName('');
      onSelect(student);
    } catch {
      setError('Failed to create student');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this student and all their data?')) return;
    try {
      await deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (currentStudent?.id === id) {
        localStorage.removeItem('preppilot_student_id');
      }
    } catch {
      setError('Failed to delete student');
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div className="card animate-slide-up" style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>Student Profiles</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
              Select an existing profile or create a new one
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={20} />
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Create new student */}
        <form onSubmit={handleCreate} style={{ marginBottom: 20 }}>
          <label className="label">Create New Profile</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              placeholder="Enter your name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className="btn btn-primary" type="submit" disabled={creating || !newName.trim()} style={{ flexShrink: 0 }}>
              {creating ? <span className="spinner" /> : <Plus size={16} />}
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>

        <div className="divider" />

        {/* Existing students */}
        <label className="label" style={{ marginBottom: 12 }}>Existing Profiles</label>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <span className="spinner-lg spinner" />
          </div>
        ) : students.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontSize: 14 }}>
            No profiles yet. Create one above!
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 10,
                  background: currentStudent?.id === s.id ? 'var(--glow-purple)' : 'var(--bg-secondary)',
                  border: `1px solid ${currentStudent?.id === s.id ? 'var(--accent-purple)' : 'var(--border)'}`,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0,
                }}>
                  {s.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{s.name}</div>
                  {s.target_date && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Target: {new Date(s.target_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
