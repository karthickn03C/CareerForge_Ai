const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const { processChatMessage } = require('../agents/forgemindAgent');
const { queryAll, queryOne, execute } = require('../db/database');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function extractText(buffer, mimeType, name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    const res = await pdfParse(buffer);
    return res.text || '';
  } else if (mimeType.includes('word') || ext === 'docx' || ext === 'doc') {
    const res = await mammoth.extractRawText({ buffer });
    return res.value || '';
  }
  return buffer.toString('utf-8');
}

// ── GET Conversations List ────────────────────────────────────────────────
router.get('/:studentId/conversations', async (req, res) => {
  try {
    const { studentId } = req.params;
    const rows = await queryAll(
      'SELECT * FROM forgemind_conversations WHERE student_id = $1 ORDER BY pinned DESC, updated_at DESC',
      [studentId]
    );
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

// ── GET Conversation Messages ─────────────────────────────────────────────
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const rows = await queryAll(
      'SELECT * FROM forgemind_messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );
    const parsed = rows.map(r => ({
      ...r,
      agentDetails: r.agent_details ? (typeof r.agent_details === 'string' ? JSON.parse(r.agent_details) : r.agent_details) : null
    }));
    res.json(parsed);
  } catch (e) {
    res.json([]);
  }
});

// ── POST Send Chat Message (Main Orchestrator Entrypoint) ───────────────────
router.post('/:studentId/chat', upload.single('file'), async (req, res) => {
  try {
    const { studentId } = req.params;
    const userQuery = req.body.query || 'Hello';
    let conversationId = req.body.conversationId;

    let attachedText = '';
    let fileName = null;
    if (req.file) {
      fileName = req.file.originalname;
      attachedText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (req.body.resumeText) {
      attachedText = req.body.resumeText;
    }

    // Create conversation session if new
    if (!conversationId || conversationId === 'new') {
      conversationId = `conv_${Date.now()}`;
      const titleSnippet = userQuery.length > 28 ? `${userQuery.substring(0, 28)}...` : userQuery;
      await execute(
        `INSERT INTO forgemind_conversations (id, student_id, title) VALUES ($1, $2, $3)`,
        [conversationId, studentId, titleSnippet || 'New Conversation']
      );
    } else {
      await execute(`UPDATE forgemind_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [conversationId]);
    }

    // Store User Message
    const userMsgId = `msg_user_${Date.now()}`;
    await execute(
      `INSERT INTO forgemind_messages (id, conversation_id, sender, text, file_name) VALUES ($1, $2, $3, $4, $5)`,
      [userMsgId, conversationId, 'user', userQuery, fileName]
    );

    // Fetch Student Name
    const studentObj = await queryOne('SELECT * FROM students WHERE id = $1', [studentId]);
    const studentName = studentObj ? studentObj.name : 'Candidate';

    // Orchestrate Multi-Agent Execution
    const result = await processChatMessage({
      studentId,
      studentName,
      userQuery,
      conversationId,
      attachedText
    });

    // Store Agent Message
    const agentMsgId = `msg_agent_${Date.now()}`;
    await execute(
      `INSERT INTO forgemind_messages (id, conversation_id, sender, text, agent_details) VALUES ($1, $2, $3, $4, $5)`,
      [agentMsgId, conversationId, 'agent', result.markdownResponse, JSON.stringify(result.agentOutputs)]
    );

    res.json({
      conversationId,
      userMessageId: userMsgId,
      agentMessageId: agentMsgId,
      markdownResponse: result.markdownResponse,
      agentOutputs: result.agentOutputs,
      routing: result.routing
    });
  } catch (err) {
    console.error('[ForgeMind Route Error]', err.message);
    res.status(500).json({ error: `ForgeMind Error: ${err.message}` });
  }
});

// ── DELETE Conversation ───────────────────────────────────────────────────
router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    await execute('DELETE FROM forgemind_conversations WHERE id = $1', [conversationId]);
    await execute('DELETE FROM forgemind_messages WHERE conversation_id = $1', [conversationId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST Pin/Unpin Conversation ───────────────────────────────────────────
router.post('/conversations/:conversationId/pin', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const existing = await queryOne('SELECT pinned FROM forgemind_conversations WHERE id = $1', [conversationId]);
    const nextPinned = existing && existing.pinned ? 0 : 1;
    await execute('UPDATE forgemind_conversations SET pinned = $1 WHERE id = $2', [nextPinned, conversationId]);
    res.json({ success: true, pinned: Boolean(nextPinned) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
