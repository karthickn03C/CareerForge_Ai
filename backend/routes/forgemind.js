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

let chatDbInitialized = false;

function initChatDb() {
  if (chatDbInitialized) return;
  try {
    execute(`
      CREATE TABLE IF NOT EXISTS forgemind_conversations (
        id TEXT PRIMARY KEY,
        student_id INTEGER,
        title TEXT,
        pinned INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    execute(`
      CREATE TABLE IF NOT EXISTS forgemind_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        sender TEXT,
        text TEXT,
        file_name TEXT,
        agent_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    chatDbInitialized = true;
  } catch (e) {
    console.warn('[ForgeMind DB Init Note]', e.message);
  }
}

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
router.get('/:studentId/conversations', (req, res) => {
  try {
    initChatDb();
    const { studentId } = req.params;
    const rows = queryAll(
      'SELECT * FROM forgemind_conversations WHERE student_id = ? ORDER BY pinned DESC, updated_at DESC',
      [studentId]
    );
    res.json(rows);
  } catch (e) {
    res.json([]);
  }
});

// ── GET Conversation Messages ─────────────────────────────────────────────
router.get('/messages/:conversationId', (req, res) => {
  try {
    initChatDb();
    const { conversationId } = req.params;
    const rows = queryAll(
      'SELECT * FROM forgemind_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [conversationId]
    );
    const parsed = rows.map(r => ({
      ...r,
      agentDetails: r.agent_details ? JSON.parse(r.agent_details) : null
    }));
    res.json(parsed);
  } catch (e) {
    res.json([]);
  }
});

// ── POST Send Chat Message (Main Orchestrator Entrypoint) ───────────────────
router.post('/:studentId/chat', upload.single('file'), async (req, res) => {
  try {
    initChatDb();
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
      execute(
        `INSERT INTO forgemind_conversations (id, student_id, title) VALUES (?, ?, ?)`,
        [conversationId, studentId, titleSnippet || 'New Conversation']
      );
    } else {
      execute(`UPDATE forgemind_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [conversationId]);
    }

    // Store User Message
    const userMsgId = `msg_user_${Date.now()}`;
    execute(
      `INSERT INTO forgemind_messages (id, conversation_id, sender, text, file_name) VALUES (?, ?, ?, ?, ?)`,
      [userMsgId, conversationId, 'user', userQuery, fileName]
    );

    // Fetch Student Name
    const studentObj = queryOne('SELECT * FROM students WHERE id = ?', [studentId]);
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
    execute(
      `INSERT INTO forgemind_messages (id, conversation_id, sender, text, agent_details) VALUES (?, ?, ?, ?, ?)`,
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
router.delete('/conversations/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params;
    execute('DELETE FROM forgemind_conversations WHERE id = ?', [conversationId]);
    execute('DELETE FROM forgemind_messages WHERE conversation_id = ?', [conversationId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST Pin/Unpin Conversation ───────────────────────────────────────────
router.post('/conversations/:conversationId/pin', (req, res) => {
  try {
    const { conversationId } = req.params;
    const existing = queryOne('SELECT pinned FROM forgemind_conversations WHERE id = ?', [conversationId]);
    const nextPinned = existing && existing.pinned ? 0 : 1;
    execute('UPDATE forgemind_conversations SET pinned = ? WHERE id = ?', [nextPinned, conversationId]);
    res.json({ success: true, pinned: Boolean(nextPinned) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
