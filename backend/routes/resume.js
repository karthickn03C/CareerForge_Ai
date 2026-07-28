const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { queryOne, execute } = require('../db/database');
const {
  parseResumeWithAI,
  analyzeATSWithAI,
  matchJobDescription,
  chatAboutResume,
} = require('../agents/resumeAgent');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

/**
 * Extract plain text from uploaded buffer based on file mimetype / extension.
 * Uses pdf-parse v1.1.1 which exports a default async function: pdfParse(buffer) → { text }
 */
async function extractTextFromBuffer(buffer, file) {
  const mime = file.mimetype || '';
  const originalName = (file.originalname || '').toLowerCase();

  // ── PDF ──────────────────────────────────────────────────────────
  if (mime === 'application/pdf' || originalName.endsWith('.pdf')) {
    try {
      // pdf-parse v1.1.1: pdfParse(dataBuffer) → Promise<{ text, numpages, ... }>
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();
      if (!text) {
        throw new Error('Unable to read this PDF. The file may be image-based or password-protected. Please upload a text-based PDF.');
      }
      return text;
    } catch (err) {
      // Re-throw with user-friendly message if it is not already ours
      if (err.message && err.message.includes('Unable to read')) throw err;
      throw new Error(`Unable to read this PDF. Please upload a valid, text-based resume PDF. (${err.message})`);
    }
  }

  // ── DOCX / DOC ───────────────────────────────────────────────────
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    originalName.endsWith('.docx') ||
    originalName.endsWith('.doc')
  ) {
    try {
      const res = await mammoth.extractRawText({ buffer });
      const text = (res.value || '').trim();
      if (!text) throw new Error('Unable to extract text from this Word document.');
      return text;
    } catch (err) {
      throw new Error(`Unable to read DOCX file: ${err.message}`);
    }
  }

  // ── Plain Text / Markdown ─────────────────────────────────────────
  if (
    mime.startsWith('text/') ||
    originalName.endsWith('.txt') ||
    originalName.endsWith('.md')
  ) {
    const text = buffer.toString('utf-8').trim();
    if (!text) throw new Error('The uploaded text file appears to be empty.');
    return text;
  }

  // ── Image fallback ───────────────────────────────────────────────
  if (mime.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/.test(originalName)) {
    return `[IMAGE RESUME]\nFile: ${file.originalname}\nThis is an image-based resume. Please extract available information from the filename context.`;
  }

  throw new Error(`Unsupported file type "${mime || originalName}". Upload PDF, DOCX, DOC, or TXT.`);
}

// ── GET latest resume analysis ────────────────────────────────────
router.get('/:studentId', (req, res) => {
  const record = queryOne(
    'SELECT * FROM resume_analyses WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 1',
    [req.params.studentId]
  );

  if (!record) return res.json(null);

  try {
    res.json({
      id: record.id,
      student_id: record.student_id,
      file_name: record.file_name,
      file_type: record.file_type,
      raw_text: record.raw_text,
      parsed_json: JSON.parse(record.parsed_json),
      ats_scores: JSON.parse(record.ats_scores),
      feedback_json: JSON.parse(record.feedback_json),
      uploaded_at: record.uploaded_at,
    });
  } catch (err) {
    console.error('Resume GET parse error:', err);
    res.status(500).json({ error: 'Failed to parse stored resume record.' });
  }
});

// ── POST upload and analyze resume file ──────────────────────────
router.post('/:studentId/upload', upload.single('resume'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const textOverride = req.body?.rawText;

    let rawText = '';
    let fileName = 'Pasted Resume Text';
    let fileType = 'text/plain';

    if (req.file) {
      fileName = req.file.originalname;
      fileType = req.file.mimetype || 'application/octet-stream';

      // Step 1: Extract text
      try {
        rawText = await extractTextFromBuffer(req.file.buffer, req.file);
      } catch (extractErr) {
        // Return specific parsing error to frontend with 422 status
        return res.status(422).json({
          error: extractErr.message || 'Unable to read this PDF. Please upload a valid resume.',
          step: 'extraction',
        });
      }
    } else if (textOverride && textOverride.trim()) {
      rawText = textOverride.trim();
    } else {
      return res.status(400).json({ error: 'Please upload a PDF, DOCX, or TXT file, or paste resume text.' });
    }

    // Validate minimum text content
    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({
        error: 'Could not extract enough text from the file. Please ensure the PDF is text-based and not an image scan.',
        step: 'validation',
      });
    }

    // Step 2: AI Parsing
    let parsedData;
    try {
      console.log(`[POST /upload] Step 2: Parsing resume with AI (studentId=${studentId}, file=${fileName})...`);
      parsedData = await parseResumeWithAI(rawText);
    } catch (parseErr) {
      console.error('[POST /upload] AI parse error details:', parseErr);
      return res.status(500).json({ error: parseErr.message || 'AI resume parsing failed.', step: 'ai_parse', details: process.env.NODE_ENV !== 'production' ? parseErr.stack : undefined });
    }

    // Step 3: ATS Scoring + Feedback
    let atsResult;
    try {
      console.log(`[POST /upload] Step 3: Running ATS analysis (studentId=${studentId})...`);
      atsResult = await analyzeATSWithAI(parsedData);
    } catch (atsErr) {
      console.error('[POST /upload] ATS analysis error details:', atsErr);
      return res.status(500).json({ error: atsErr.message || 'ATS analysis failed.', step: 'ats', details: process.env.NODE_ENV !== 'production' ? atsErr.stack : undefined });
    }

    const parsedJsonStr = JSON.stringify(parsedData);
    const atsScoresStr = JSON.stringify(atsResult.atsScores || {});
    const feedbackStr = JSON.stringify(atsResult.feedback || {});

    // Step 4: Save to Database (always insert new record, most recent wins on GET)
    const result = execute(
      `INSERT INTO resume_analyses (student_id, file_name, file_type, raw_text, parsed_json, ats_scores, feedback_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [studentId, fileName, fileType, rawText, parsedJsonStr, atsScoresStr, feedbackStr]
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      student_id: studentId,
      file_name: fileName,
      file_type: fileType,
      raw_text: rawText,
      parsed_json: parsedData,
      ats_scores: atsResult.atsScores,
      feedback_json: atsResult.feedback,
      uploaded_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Resume upload unhandled error:', err);
    res.status(500).json({ error: err.message || 'Resume analysis failed. Please try again.' });
  }
});

// ── POST match Job Description ────────────────────────────────────
router.post('/:studentId/job-match', async (req, res) => {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: 'Job description is required.' });
    }

    const record = queryOne(
      'SELECT * FROM resume_analyses WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 1',
      [req.params.studentId]
    );

    if (!record) {
      return res.status(400).json({ error: 'No resume found. Upload a resume first.' });
    }

    const parsedResume = JSON.parse(record.parsed_json);
    const matchResult = await matchJobDescription(parsedResume, jobDescription);
    res.json(matchResult);
  } catch (err) {
    console.error('Job match error:', err);
    res.status(500).json({ error: err.message || 'Job matching failed.' });
  }
});

// ── POST chat with AI about resume ───────────────────────────────
router.post('/:studentId/chat', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const record = queryOne(
      'SELECT * FROM resume_analyses WHERE student_id = ? ORDER BY uploaded_at DESC LIMIT 1',
      [req.params.studentId]
    );

    if (!record) {
      return res.status(400).json({ error: 'No resume found. Upload a resume first.' });
    }

    const parsedResume = JSON.parse(record.parsed_json);
    const feedback = JSON.parse(record.feedback_json);
    const reply = await chatAboutResume(parsedResume, feedback, history || [], prompt);
    res.json({ reply });
  } catch (err) {
    console.error('Resume chat error:', err);
    res.status(500).json({ error: err.message || 'Resume chat failed.' });
  }
});

module.exports = router;
