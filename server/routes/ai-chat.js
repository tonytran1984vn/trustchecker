const { safeError } = require('../utils/safe-error');
/**
 * AI Assistant & Live Chat Routes
 * AI chatbot (rule-based), live chat with WebSocket bridge, conversation history
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../auth');
const aiAssistant = require('../engines/ai-assistant');

router.use(authMiddleware);

// ─── POST /ask — Ask the AI assistant ───────────────────────
router.post('/ask', async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) return res.status(400).json({ error: 'message required' });

        const enrichedContext = {
            ...context,
            role: req.user.role,
            username: req.user.username,
        };

        const response = aiAssistant.respond(message, enrichedContext);

        // Log conversation
        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'AI_CHAT', 'chatbot', 'assistant',
                JSON.stringify({ question: message.substring(0, 200), category: response.category, confidence: response.confidence }));

        res.json({
            bot: 'TrustBot',
            ...response,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /suggestions — Get contextual quick actions ────────
router.get('/suggestions', async (req, res) => {
    try {
        const { page } = req.query;
        const suggestions = aiAssistant.getSuggestions({
            role: req.user.role,
            current_page: page
        });
        res.json({ suggestions });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /chat/start — Start a live chat session ───────────
router.post('/chat/start', async (req, res) => {
    try {
        const { topic } = req.body;
        const sessionId = uuidv4();

        // Store chat session in audit
        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'CHAT_STARTED', 'chat', sessionId,
                JSON.stringify({ topic: topic || 'General Support', started_at: new Date().toISOString() }));

        res.json({
            session_id: sessionId,
            status: 'active',
            topic: topic || 'General Support',
            message: 'Live chat session started. A support agent will join shortly.',
            agent: {
                name: 'TrustBot',
                type: 'ai',
                note: 'AI assistant will handle your request. If needed, you will be escalated to a human agent.'
            },
            auto_response: aiAssistant.respond(topic || 'help', { role: req.user.role })
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /chat/:sessionId/message — Send message in chat ──
router.post('/chat/:sessionId/message', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'message required' });

        const sessionId = req.params.sessionId;

        // AI auto-response
        const aiResponse = aiAssistant.respond(message, {
            role: req.user.role,
            session_id: sessionId
        });

        // Determine if escalation is needed
        const needsEscalation = aiResponse.confidence < 0.3;

        const response = {
            session_id: sessionId,
            user_message: { id: uuidv4(), text: message, sender: req.user.username, timestamp: new Date().toISOString() },
            bot_response: { id: uuidv4(), text: aiResponse.response, sender: 'TrustBot', timestamp: new Date().toISOString(), ...aiResponse },
        };

        if (needsEscalation) {
            response.escalation = {
                needed: true,
                reason: 'AI confidence too low for reliable response',
                action: 'Creating support ticket for human agent review',
                ticket_suggestion: { subject: `Chat escalation: ${message.substring(0, 80)}`, priority: 'high', category: 'technical' }
            };
        }

        res.json(response);
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /chat/history — Get chat history ───────────────────
router.get('/chat/history', async (req, res) => {
    try {
        const chatSessions = await db.all(
            "SELECT id, actor_id, entity_id as session_id, details, timestamp FROM audit_log WHERE action = 'CHAT_STARTED' AND actor_id = ? ORDER BY timestamp DESC LIMIT 20",
            [req.user.id]
        );

        const sessions = chatSessions.map(s => {
            const details = JSON.parse(s.details || '{}');
            return {
                session_id: s.session_id,
                topic: details.topic,
                started_at: details.started_at || s.timestamp,
            };
        });

        res.json({ sessions, total: sessions.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

module.exports = router;
