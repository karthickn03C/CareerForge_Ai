/**
 * Reports module for CareerForge AI.
 * Provides CSV and JSON export of student placement data for Staff Portal.
 */

const express = require('express');
const router = express.Router();
const { queryAll, queryOne } = require('../db/database');

// ── GET /api/reports/weekly ─────────────────────────────────────────────────
router.get('/weekly', (req, res) => {
  try {
    const students = queryAll(
      `SELECT * FROM students WHERE role = 'student' OR role IS NULL ORDER BY created_at DESC`
    );

    const activities = queryAll(
      `SELECT sa.*, s.name as student_name
       FROM student_activity sa
       JOIN students s ON sa.student_id = s.id
       WHERE sa.created_at >= datetime('now', '-7 days')
       ORDER BY sa.created_at DESC`
    );

    const weekRegistrations = activities.filter(a => a.event_type === 'student_registered').length;
    const weekLogins = activities.filter(a => a.event_type === 'login').length;
    const weekResumes = activities.filter(a => a.event_type === 'resume_uploaded').length;
    const weekCodingSolved = activities.filter(a => a.event_type === 'coding_solved').length;
    const weekInterviews = activities.filter(a => a.event_type === 'interview_completed').length;

    const avgReadiness = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.placement_readiness || 0), 0) / students.length)
      : 0;

    const eligibleForDrives = students.filter(s => (s.placement_readiness || 0) >= 75).length;
    const atRisk = students.filter(s => (s.placement_readiness || 0) < 50).length;

    res.json({
      success: true,
      period: 'last_7_days',
      generatedAt: new Date().toISOString(),
      summary: {
        totalStudents: students.length,
        avgPlacementReadiness: avgReadiness,
        eligibleForDrives,
        atRisk,
        weeklyActivity: {
          newRegistrations: weekRegistrations,
          logins: weekLogins,
          resumesUploaded: weekResumes,
          codingProblems: weekCodingSolved,
          mockInterviews: weekInterviews,
        }
      },
      topPerformers: students
        .filter(s => (s.placement_readiness || 0) >= 75)
        .sort((a, b) => (b.placement_readiness || 0) - (a.placement_readiness || 0))
        .slice(0, 5)
        .map(s => ({
          name: s.name, email: s.email,
          department: s.department, year: s.year,
          readiness: s.placement_readiness,
          coding: s.coding_score, resume: s.resume_score, interview: s.interview_score
        })),
      atRiskStudents: students
        .filter(s => (s.placement_readiness || 0) < 50)
        .map(s => ({
          name: s.name, email: s.email,
          department: s.department,
          readiness: s.placement_readiness
        }))
    });
  } catch (err) {
    console.error('Weekly report error:', err);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// ── GET /api/reports/download/csv ───────────────────────────────────────────
// Downloads all students as a CSV file (opens in Excel)
router.get('/download/csv', (req, res) => {
  try {
    const students = queryAll(
      `SELECT * FROM students WHERE role = 'student' OR role IS NULL ORDER BY created_at DESC`
    );

    const headers = [
      'ID', 'Name', 'Email', 'Department', 'Year',
      'Resume Score', 'Coding Score', 'Interview Score', 'Placement Readiness',
      'Study Hours', 'Problems Solved', 'Current Streak',
      'Resume Uploaded', 'Planner Completed', 'Profile Completion',
      'Status', 'Last Login', 'Registered On'
    ];

    const rows = students.map(s => [
      s.id,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.email || '').replace(/"/g, '""')}"`,
      `"${(s.department || 'CSE').replace(/"/g, '""')}"`,
      `"${(s.year || '4th Year').replace(/"/g, '""')}"`,
      s.resume_score || 0,
      s.coding_score || 0,
      s.interview_score || 0,
      s.placement_readiness || 0,
      s.study_hours || 0,
      s.problems_solved || 0,
      s.current_streak || 0,
      s.resume_uploaded ? 'Yes' : 'No',
      s.planner_completed ? 'Yes' : 'No',
      `${s.profile_completion || 20}%`,
      `"${(s.status || 'New Student').replace(/"/g, '""')}"`,
      s.last_login ? `"${s.last_login}"` : 'Never',
      s.created_at ? `"${s.created_at}"` : 'Unknown'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const filename = `careerforge_students_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csvContent); // BOM for Excel UTF-8 compatibility
  } catch (err) {
    console.error('CSV download error:', err);
    res.status(500).json({ error: 'Failed to generate CSV report' });
  }
});

// ── GET /api/reports/download/json ──────────────────────────────────────────
// Full JSON export of all student data
router.get('/download/json', (req, res) => {
  try {
    const students = queryAll(
      `SELECT * FROM students WHERE role = 'student' OR role IS NULL ORDER BY created_at DESC`
    );

    const filename = `careerforge_data_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json({
      exportedAt: new Date().toISOString(),
      totalStudents: students.length,
      students
    });
  } catch (err) {
    console.error('JSON export error:', err);
    res.status(500).json({ error: 'Failed to generate JSON export' });
  }
});

// ── GET /api/reports/department ─────────────────────────────────────────────
// Department-wise breakdown
router.get('/department', (req, res) => {
  try {
    const students = queryAll(
      `SELECT department, 
        COUNT(*) as total,
        AVG(COALESCE(placement_readiness, 0)) as avg_readiness,
        AVG(COALESCE(coding_score, 0)) as avg_coding,
        AVG(COALESCE(resume_score, 0)) as avg_resume,
        SUM(CASE WHEN placement_readiness >= 75 THEN 1 ELSE 0 END) as eligible_count
       FROM students 
       WHERE role = 'student' OR role IS NULL
       GROUP BY department
       ORDER BY avg_readiness DESC`
    );

    res.json({
      success: true,
      departments: students.map(d => ({
        ...d,
        avg_readiness: Math.round(d.avg_readiness || 0),
        avg_coding: Math.round(d.avg_coding || 0),
        avg_resume: Math.round(d.avg_resume || 0),
      }))
    });
  } catch (err) {
    console.error('Department report error:', err);
    res.status(500).json({ error: 'Failed to generate department report' });
  }
});

module.exports = router;
