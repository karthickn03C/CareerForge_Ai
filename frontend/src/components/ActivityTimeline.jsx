/**
 * ActivityTimeline — Premium activity feed component for CareerForge AI.
 * Used in both Student Dashboard (personal) and Staff Portal (all students).
 */

import { useState, useEffect } from 'react';
import {
  LogIn, FileText, Code2, MessageSquare, BookOpen, Brain, User, Zap, Clock, ChevronDown
} from 'lucide-react';

const EVENT_CONFIG = {
  login:              { icon: LogIn,          color: '#10B981', label: 'Logged In',            bg: 'rgba(16,185,129,0.12)' },
  student_registered: { icon: User,           color: '#6366F1', label: 'Registered',           bg: 'rgba(99,102,241,0.12)' },
  resume_uploaded:    { icon: FileText,        color: '#F59E0B', label: 'Resume Analyzed',      bg: 'rgba(245,158,11,0.12)' },
  coding_solved:      { icon: Code2,           color: '#3B82F6', label: 'Coding Problem Solved',bg: 'rgba(59,130,246,0.12)' },
  interview_completed:{ icon: MessageSquare,   color: '#8B5CF6', label: 'Mock Interview Done',  bg: 'rgba(139,92,246,0.12)' },
  plan_generated:     { icon: BookOpen,        color: '#EC4899', label: 'Study Plan Created',   bg: 'rgba(236,72,153,0.12)' },
  forgemind_chat:     { icon: Brain,           color: '#06B6D4', label: 'ForgeMind AI Used',    bg: 'rgba(6,182,212,0.12)' },
};

function timeAgo(isoStr) {
  if (!isoStr) return 'Just now';
  const now = new Date();
  const then = new Date(isoStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * @param {Array} activities - list of activity objects
 * @param {boolean} compact - compact mode for sidebar/feed
 * @param {boolean} showStudent - show student name (for staff view)
 * @param {string} title - section title
 * @param {boolean} dark - dark mode (staff dashboard)
 * @param {number} maxItems - max items to show initially
 */
export default function ActivityTimeline({
  activities = [],
  compact = false,
  showStudent = false,
  title = 'Activity Timeline',
  dark = false,
  maxItems = 8
}) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? activities : activities.slice(0, maxItems);

  const bg = dark ? '#0F172A' : 'var(--bg-card, #fff)';
  const textPrimary = dark ? '#F1F5F9' : 'var(--text-primary, #1e293b)';
  const textSecondary = dark ? '#94A3B8' : 'var(--text-secondary, #64748b)';
  const border = dark ? 'rgba(255,255,255,0.06)' : 'var(--border, #e2e8f0)';
  const lineColor = dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

  if (activities.length === 0) {
    return (
      <div style={{
        padding: compact ? '12px 16px' : '24px',
        background: bg,
        borderRadius: 12,
        border: `1px solid ${border}`,
        textAlign: 'center'
      }}>
        <Clock size={20} style={{ color: textSecondary, margin: '0 auto 8px', display: 'block' }} />
        <p style={{ color: textSecondary, fontSize: 13, margin: 0 }}>No activity yet</p>
      </div>
    );
  }

  return (
    <div style={{
      background: bg,
      borderRadius: compact ? 10 : 16,
      border: `1px solid ${border}`,
      overflow: 'hidden'
    }}>
      {!compact && (
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <Zap size={16} style={{ color: '#10B981' }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{title}</h3>
          <span style={{
            marginLeft: 'auto', fontSize: 11, fontWeight: 600,
            background: 'rgba(16,185,129,0.12)', color: '#10B981',
            padding: '2px 8px', borderRadius: 20
          }}>
            {activities.length} events
          </span>
        </div>
      )}

      <div style={{ padding: compact ? '8px 12px' : '16px 20px' }}>
        {displayed.map((activity, idx) => {
          const config = EVENT_CONFIG[activity.event_type] || {
            icon: Zap, color: '#94A3B8', label: activity.event_type, bg: 'rgba(148,163,184,0.1)'
          };
          const Icon = config.icon;
          const isLast = idx === displayed.length - 1;

          return (
            <div key={activity.id || idx} style={{ display: 'flex', gap: 12, position: 'relative' }}>
              {/* Vertical line */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: compact ? 13 : 17,
                  top: compact ? 22 : 28,
                  bottom: 0,
                  width: 1,
                  background: lineColor,
                  zIndex: 0
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: compact ? 26 : 34,
                height: compact ? 26 : 34,
                minWidth: compact ? 26 : 34,
                borderRadius: '50%',
                background: config.bg,
                border: `1.5px solid ${config.color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1,
                marginTop: 2
              }}>
                <Icon size={compact ? 12 : 15} style={{ color: config.color }} />
              </div>

              {/* Content */}
              <div style={{
                flex: 1,
                paddingBottom: isLast ? 0 : compact ? 10 : 16,
                minWidth: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {showStudent && activity.student_name && (
                      <span style={{
                        fontSize: compact ? 10 : 11,
                        fontWeight: 700,
                        color: config.color,
                        display: 'block',
                        marginBottom: 1
                      }}>
                        {activity.student_name}
                        {activity.department && <span style={{ fontWeight: 400, color: textSecondary }}> · {activity.department}</span>}
                      </span>
                    )}
                    <p style={{
                      margin: 0,
                      fontSize: compact ? 12 : 13,
                      fontWeight: 600,
                      color: textPrimary,
                      lineHeight: 1.35,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {activity.description || config.label}
                    </p>
                  </div>
                  <span style={{
                    fontSize: compact ? 10 : 11,
                    color: textSecondary,
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    flexShrink: 0
                  }}>
                    {compact ? timeAgo(activity.created_at) : formatTime(activity.created_at)}
                  </span>
                </div>
                {!compact && (
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: textSecondary }}>
                    {timeAgo(activity.created_at)}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {activities.length > maxItems && (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '8px',
              background: 'transparent',
              border: `1px dashed ${border}`,
              borderRadius: 8,
              color: textSecondary,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4
            }}
          >
            <ChevronDown size={13} style={{ transform: showAll ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            {showAll ? 'Show less' : `Show ${activities.length - maxItems} more events`}
          </button>
        )}
      </div>
    </div>
  );
}
