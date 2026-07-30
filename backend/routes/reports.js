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

// ── PDF GENERATION HELPER ──────────────────────────────────────────────────
const PDFDocument = require('pdfkit');

function buildPdfReport(res, { title, subtitle, sections, studentName, dateStr }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const filename = `CareerForge_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Header Banner
  doc.rect(0, 0, 595.28, 80).fill('#1E1B4B');
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold').text('CareerForge AI', 40, 20);
  doc.fontSize(12).font('Helvetica').text('AI Placement Command Center Report', 40, 48);
  doc.fontSize(9).text(`Generated: ${dateStr || new Date().toLocaleString()}`, 400, 48, { align: 'right' });

  doc.moveDown(3);
  doc.fillColor('#1F2937').fontSize(18).font('Helvetica-Bold').text(title, 40, 100);
  if (subtitle) {
    doc.fontSize(11).font('Helvetica-Oblique').fillColor('#4B5563').text(subtitle, 40, 125);
  }
  if (studentName) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#4F46E5').text(`Student: ${studentName}`, 40, 142);
  }

  doc.moveDown(2);
  let currentY = studentName ? 165 : 145;

  (sections || []).forEach(sec => {
    if (currentY > 700) {
      doc.addPage();
      currentY = 40;
    }
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1E1B4B').text(sec.heading, 40, currentY);
    currentY += 20;

    if (sec.content) {
      doc.fontSize(10).font('Helvetica').fillColor('#374151').text(sec.content, 40, currentY, { width: 515, align: 'justify' });
      currentY += doc.heightOfString(sec.content, { width: 515 }) + 10;
    }

    if (Array.isArray(sec.items)) {
      sec.items.forEach(item => {
        if (currentY > 720) {
          doc.addPage();
          currentY = 40;
        }
        doc.fontSize(10).font('Helvetica').fillColor('#4F46E5').text('• ', 45, currentY);
        doc.fillColor('#1F2937').text(item, 55, currentY, { width: 500 });
        currentY += doc.heightOfString(item, { width: 500 }) + 6;
      });
      currentY += 8;
    }
  });

  // Footer
  doc.fontSize(8).fillColor('#9CA3AF').text('CareerForge AI Platform — Confidential & Proprietary Report', 40, 800, { align: 'center' });

  doc.end();
}

// ── POST /api/reports/generate-pdf ─────────────────────────────────────────
router.post('/generate-pdf', (req, res) => {
  try {
    const { reportType, studentId, customTitle, customContent } = req.body;
    let student = null;
    if (studentId) {
      student = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
    }

    let title = customTitle || 'Placement Performance Report';
    let subtitle = 'CareerForge AI Placement Intelligence';
    let sections = [];
    const dateStr = new Date().toLocaleString();
    const studentName = student ? student.name : (req.body.studentName || 'Student');

    switch ((reportType || '').toLowerCase()) {
      case 'resume':
      case 'resume_analysis':
        title = 'Resume ATS & Skills Analysis Report';
        subtitle = 'Automated Evaluation & Keyword Gap Analysis';
        sections = [
          { heading: 'Overview', content: `ATS Score: ${student?.resume_score || 75}/100\nStatus: ${student?.resume_uploaded ? 'Uploaded & Analyzed' : 'Pending Upload'}` },
          { heading: 'Key Strengths', items: ['Strong technical project highlights', 'Clean structural formatting', 'Clear education credentials'] },
          { heading: 'Areas for Improvement', items: ['Add measurable outcome metrics (e.g. %, $)', 'Include missing industry keywords (Docker, AWS, Microservices)', 'Expand on role responsibilities'] }
        ];
        break;

      case 'progress':
      case 'coding':
        title = 'Coding & DSA Progress Report';
        subtitle = 'Performance Tracking & Topic Mastery';
        sections = [
          { heading: 'Performance Summary', content: `Total Problems Solved: ${student?.problems_solved || 0}\nCoding Score: ${student?.coding_score || 0}/100\nCurrent Streak: ${student?.current_streak || 0} Days\nStudy Hours: ${student?.study_hours || 0} Hours` },
          { heading: 'Topic Breakdown', items: ['Arrays & Strings: Strong', 'Dynamic Programming: Weak (Action Required)', 'SQL & Databases: Moderate', 'System Design: Moderate'] }
        ];
        break;

      case 'interview':
        title = 'Mock Interview Evaluation Report';
        subtitle = 'Technical & Behavioral Performance Breakdown';
        sections = [
          { heading: 'Interview Score Summary', content: `Overall Score: ${student?.interview_score || 0}/100\nReadiness Level: ${student?.placement_readiness || 0}%` },
          { heading: 'Evaluated Competencies', items: ['Technical Problem Solving: Good', 'Communication Clarity: Excellent', 'System Architecture Knowledge: Needs Practice'] }
        ];
        break;

      case 'plan':
      case 'study_plan':
        title = 'Personalized Study Roadmap';
        subtitle = 'AI-Generated Placement Strategy Plan';
        sections = [
          { heading: 'Target Goals', content: `Placement Target Date: ${student?.target_date || 'Upcoming Drive'}\nCurrent Readiness: ${student?.placement_readiness || 0}%` },
          { heading: 'Recommended Daily Schedule', items: ['Day 1-3: Intensive Dynamic Programming & Graph Theory', 'Day 4-7: Mock Interviews & System Design Concepts', 'Day 8-14: Aptitude Tests & Company Specific Previous Papers'] }
        ];
        break;

      default:
        title = customTitle || 'Placement Readiness Report';
        subtitle = 'Comprehensive Candidate Assessment';
        sections = [
          { heading: 'Student Overview', content: `Name: ${studentName}\nEmail: ${student?.email || 'N/A'}\nDepartment: ${student?.department || 'CSE'}\nReadiness Score: ${student?.placement_readiness || 0}%` },
          { heading: 'Score Breakdown', items: [`Resume Score: ${student?.resume_score || 0}/100`, `Coding Score: ${student?.coding_score || 0}/100`, `Interview Score: ${student?.interview_score || 0}/100`] },
          { heading: 'Custom Insights', content: customContent || 'The candidate has demonstrated strong dedication across coding practice and mock interviews. Continued practice on weak topics is recommended before top-tier placement drives.' }
        ];
        break;
    }

    buildPdfReport(res, { title, subtitle, sections, studentName, dateStr });
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

module.exports = router;

