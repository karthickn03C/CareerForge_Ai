/**
 * Server-Sent Events (SSE) infrastructure for CareerForge AI.
 * Provides real-time push updates from server to all connected browsers.
 * Works on Render.com free tier (HTTP-based, no WebSocket needed).
 */

const express = require('express');
const router = express.Router();

// Registry of all connected SSE clients: { id -> response }
const clients = new Map();
let clientCounter = 0;

/**
 * Broadcast an event to all connected SSE clients.
 * Called from any backend route when a significant event occurs.
 * @param {string} eventType - e.g. 'student_registered', 'resume_uploaded'
 * @param {object} data - payload to send
 */
function broadcastEvent(eventType, data = {}) {
  if (clients.size === 0) return;
  const payload = JSON.stringify({ type: eventType, data, ts: new Date().toISOString() });
  const deadClients = [];
  for (const [id, res] of clients) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch (e) {
      deadClients.push(id);
    }
  }
  // Clean up dead connections
  for (const id of deadClients) {
    clients.delete(id);
  }
}

// Register broadcaster in global scope so database.js logActivity can reach it
global.__ssebroadcast = broadcastEvent;

/**
 * GET /api/events/stream
 * SSE endpoint. Client connects once and receives all real-time events.
 */
router.get('/stream', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering on Render
  res.flushHeaders();

  const clientId = ++clientCounter;
  clients.set(clientId, res);

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected', clientId, ts: new Date().toISOString() })}\n\n`);

  // Heartbeat every 25 seconds to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
      clients.delete(clientId);
    }
  }, 25000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
    console.log(`[SSE] Client ${clientId} disconnected. Active clients: ${clients.size}`);
  });

  console.log(`[SSE] Client ${clientId} connected. Active clients: ${clients.size}`);
});

/**
 * GET /api/events/status
 * Returns count of active SSE connections (for monitoring).
 */
router.get('/status', (_req, res) => {
  res.json({ activeConnections: clients.size, ts: new Date().toISOString() });
});

module.exports = { router, broadcastEvent };
