/**
 * WebSocket Server for Realtime Events
 *
 * Provides realtime push notifications via WebSocket.
 * Clients connect with JWT auth, receive events scoped to their org.
 *
 * Events:
 *   notification:new — New notification for user
 *   scan:complete    — QR scan completed
 *   product:updated  — Product data changed
 *   alert:fraud      — Fraud alert triggered
 *   alert:anomaly    — Anomaly detected
 *
 * Usage:
 *   const ws = require('./lib/websocket');
 *   ws.init(httpServer);
 *   ws.emit(userId, 'notification:new', { title: '...' });
 *   ws.broadcast(orgId, 'scan:complete', { productId: '...' });
 */
const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');

class RealtimeServer {
    constructor() {
        this.wss = null;
        this.clients = new Map();  // userId -> Set<ws>
        this.orgClients = new Map(); // orgId -> Set<ws>
        this._pingInterval = null;
    }

    /**
     * Initialize WebSocket server on existing HTTP server
     */
    init(httpServer) {
        this.wss = new WebSocketServer({
            server: httpServer,
            path: '/ws',
            maxPayload: 64 * 1024, // 64KB max message
        });

        this.wss.on('connection', (ws, req) => this._onConnection(ws, req));

        // Heartbeat every 30s
        this._pingInterval = setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (ws._isAlive === false) return ws.terminate();
                ws._isAlive = false;
                ws.ping();
            });
        }, 30000);
        if (this._pingInterval.unref) this._pingInterval.unref();

        console.log('[ws] WebSocket server started on /ws');
    }

    _onConnection(ws, req) {
        // Extract token from query string
        const query = url.parse(req.url, true).query;
        const token = query.token;

        if (!token) {
            ws.close(4001, 'Missing token');
            return;
        }

        // Verify JWT
        let user;
        try {
            user = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
        } catch(e) {
            ws.close(4002, 'Invalid token');
            return;
        }

        // Track client
        ws._userId = user.id || user.sub;
        ws._orgId = user.org_id;
        ws._isAlive = true;

        if (!this.clients.has(ws._userId)) this.clients.set(ws._userId, new Set());
        this.clients.get(ws._userId).add(ws);

        if (ws._orgId) {
            if (!this.orgClients.has(ws._orgId)) this.orgClients.set(ws._orgId, new Set());
            this.orgClients.get(ws._orgId).add(ws);
        }

        // Send welcome
        ws.send(JSON.stringify({
            type: 'connected',
            userId: ws._userId,
            timestamp: new Date().toISOString(),
        }));

        ws.on('pong', () => { ws._isAlive = true; });

        ws.on('close', () => {
            this.clients.get(ws._userId)?.delete(ws);
            if (this.clients.get(ws._userId)?.size === 0) this.clients.delete(ws._userId);
            if (ws._orgId) {
                this.orgClients.get(ws._orgId)?.delete(ws);
                if (this.orgClients.get(ws._orgId)?.size === 0) this.orgClients.delete(ws._orgId);
            }
        });

        ws.on('error', () => { ws.terminate(); });
    }

    /**
     * Send event to specific user
     */
    emit(userId, event, data = {}) {
        const sockets = this.clients.get(userId);
        if (!sockets) return;
        const msg = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
        for (const ws of sockets) {
            if (ws.readyState === 1) ws.send(msg);
        }
    }

    /**
     * Broadcast event to all users in an org
     */
    broadcast(orgId, event, data = {}) {
        const sockets = this.orgClients.get(orgId);
        if (!sockets) return;
        const msg = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
        for (const ws of sockets) {
            if (ws.readyState === 1) ws.send(msg);
        }
    }

    /**
     * Broadcast to all connected clients
     */
    broadcastAll(event, data = {}) {
        if (!this.wss) return;
        const msg = JSON.stringify({ type: event, data, timestamp: new Date().toISOString() });
        this.wss.clients.forEach(ws => {
            if (ws.readyState === 1) ws.send(msg);
        });
    }

    /**
     * Get connection stats
     */
    getStats() {
        return {
            total_connections: this.wss?.clients?.size || 0,
            unique_users: this.clients.size,
            unique_orgs: this.orgClients.size,
        };
    }

    /**
     * Shutdown
     */
    close() {
        if (this._pingInterval) clearInterval(this._pingInterval);
        if (this.wss) this.wss.close();
    }
}

module.exports = new RealtimeServer();
