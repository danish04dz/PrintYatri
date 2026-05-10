/**
 * PrintYatri Real-Time Agency Status Stream
 * Uses Server-Sent Events (SSE) — zero extra packages needed.
 *
 * Admin panel connects to: GET /api/admin/stream/agencies
 * This streams live agency status updates when admin suspends/upgrades.
 *
 * Architecture: In-memory pub/sub (clients Map).
 * For multi-instance production → replace with Redis pub/sub.
 */

// ── Client registry (in-memory) ──────────────────────────────
const clients = new Map(); // clientId → res (SSE stream)
let clientIdCounter = 0;

/**
 * Register an SSE client and return cleanup function.
 */
const addClient = (res) => {
  const id = ++clientIdCounter;
  clients.set(id, res);
  return () => clients.delete(id);
};

/**
 * Broadcast a JSON event to ALL connected SSE clients.
 * @param {string} event  - event name (e.g. "agency_status_change")
 * @param {object} data   - payload
 */
const broadcast = (event, data) => {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, res] of clients) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
};

/**
 * GET /api/admin/stream/agencies
 * Admin panel subscribes here to receive live events.
 */
const agencyStream = (req, res) => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders();

  // Send a heartbeat every 25s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(":heartbeat\n\n"); } catch { clearInterval(heartbeat); }
  }, 25000);

  // Initial connected message
  res.write(`event: connected\ndata: ${JSON.stringify({ message: "PrintYatri SSE connected", ts: Date.now() })}\n\n`);

  const remove = addClient(res);

  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
};

module.exports = { broadcast, agencyStream };
