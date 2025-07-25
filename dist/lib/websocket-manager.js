"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
exports.getWebSocketManager = getWebSocketManager;
exports.updateProgress = updateProgress;
exports.startWebSocketServer = startWebSocketServer;
const ws_1 = require("ws");
const http_1 = require("http");
const url_1 = require("url");
const logger_1 = require("@/lib/logger");
class WebSocketManager {
    wss = null;
    connections = new Map();
    server = null;
    port;
    isRunning = false;
    constructor(port = 3001) {
        this.port = port;
    }
    start() {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                resolve();
                return;
            }
            try {
                this.server = (0, http_1.createServer)();
                this.wss = new ws_1.WebSocketServer({ server: this.server });
                this.wss.on('connection', (ws, request) => {
                    this.handleConnection(ws, request);
                });
                this.server.listen(this.port, () => {
                    this.isRunning = true;
                    logger_1.logger.debug(`WebSocket server started on port ${this.port}`);
                    resolve();
                });
                this.server.on('error', (error) => {
                    logger_1.logger.error('WebSocket server error:', error);
                    reject(error);
                });
                setInterval(() => {
                    this.cleanupConnections();
                }, 30000);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    stop() {
        return new Promise((resolve) => {
            if (!this.isRunning) {
                resolve();
                return;
            }
            this.connections.forEach(connections => {
                connections.forEach(conn => {
                    if (conn.ws.readyState === ws_1.WebSocket.OPEN) {
                        conn.ws.close();
                    }
                });
            });
            this.connections.clear();
            if (this.wss) {
                this.wss.close(() => {
                    if (this.server) {
                        this.server.close(() => {
                            this.isRunning = false;
                            logger_1.logger.debug('WebSocket server stopped');
                            resolve();
                        });
                    }
                    else {
                        this.isRunning = false;
                        resolve();
                    }
                });
            }
            else {
                this.isRunning = false;
                resolve();
            }
        });
    }
    handleConnection(ws, request) {
        const url = (0, url_1.parse)(request.url, true);
        const sessionId = url.query.sessionId || 'default';
        const subscriptions = url.query.subscribe?.split(',') || ['progress', 'status'];
        const connection = {
            ws,
            sessionId,
            subscriptions,
            lastActivity: new Date(),
        };
        if (!this.connections.has(sessionId)) {
            this.connections.set(sessionId, []);
        }
        this.connections.get(sessionId).push(connection);
        logger_1.logger.debug(`WebSocket connected: sessionId=${sessionId}, subscriptions=${subscriptions.join(',')}`);
        this.sendToConnection(connection, {
            type: 'status',
            sessionId,
            data: {
                status: 'connected',
                subscriptions,
                serverTime: new Date(),
            },
            timestamp: new Date(),
            source: 'websocket-manager',
        });
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleClientMessage(connection, message);
            }
            catch (error) {
                logger_1.logger.error('Invalid WebSocket message:', error);
            }
        });
        ws.on('close', () => {
            this.removeConnection(sessionId, connection);
            logger_1.logger.debug(`WebSocket disconnected: sessionId=${sessionId}`);
        });
        ws.on('error', (error) => {
            logger_1.logger.error(`WebSocket error for session ${sessionId}:`, error);
            this.removeConnection(sessionId, connection);
        });
        ws.on('pong', () => {
            connection.lastActivity = new Date();
        });
    }
    handleClientMessage(connection, message) {
        connection.lastActivity = new Date();
        switch (message.type) {
            case 'subscribe':
                if (message.topics && Array.isArray(message.topics)) {
                    connection.subscriptions = Array.from(new Set([...connection.subscriptions, ...message.topics]));
                    this.sendToConnection(connection, {
                        type: 'status',
                        sessionId: connection.sessionId,
                        data: { subscriptions: connection.subscriptions },
                        timestamp: new Date(),
                        source: 'websocket-manager',
                    });
                }
                break;
            case 'unsubscribe':
                if (message.topics && Array.isArray(message.topics)) {
                    connection.subscriptions = connection.subscriptions.filter(sub => !message.topics.includes(sub));
                }
                break;
            case 'ping':
                this.sendToConnection(connection, {
                    type: 'status',
                    sessionId: connection.sessionId,
                    data: { type: 'pong', serverTime: new Date() },
                    timestamp: new Date(),
                    source: 'websocket-manager',
                });
                break;
            default:
                logger_1.logger.warn('Unknown message type:', message.type);
        }
    }
    removeConnection(sessionId, connection) {
        const connections = this.connections.get(sessionId);
        if (connections) {
            const index = connections.indexOf(connection);
            if (index > -1) {
                connections.splice(index, 1);
            }
            if (connections.length === 0) {
                this.connections.delete(sessionId);
            }
        }
    }
    cleanupConnections() {
        const now = new Date();
        const timeout = 5 * 60 * 1000;
        this.connections.forEach((connections, sessionId) => {
            const activeConnections = connections.filter(conn => {
                const inactive = now.getTime() - conn.lastActivity.getTime() > timeout;
                const disconnected = conn.ws.readyState !== ws_1.WebSocket.OPEN;
                if (inactive || disconnected) {
                    if (conn.ws.readyState === ws_1.WebSocket.OPEN) {
                        conn.ws.close();
                    }
                    return false;
                }
                if (conn.ws.readyState === ws_1.WebSocket.OPEN) {
                    conn.ws.ping();
                }
                return true;
            });
            if (activeConnections.length === 0) {
                this.connections.delete(sessionId);
            }
            else {
                this.connections.set(sessionId, activeConnections);
            }
        });
    }
    sendProgress(update) {
        this.broadcast(update.sessionId, {
            type: 'progress',
            sessionId: update.sessionId,
            data: update,
            timestamp: new Date(),
            source: 'problem-solving-agent',
        });
    }
    sendStatus(sessionId, status, source) {
        this.broadcast(sessionId, {
            type: 'status',
            sessionId,
            data: status,
            timestamp: new Date(),
            source: source || 'system',
        });
    }
    sendResult(sessionId, result, source) {
        this.broadcast(sessionId, {
            type: 'result',
            sessionId,
            data: result,
            timestamp: new Date(),
            source: source || 'system',
        });
    }
    sendError(sessionId, error, source) {
        this.broadcast(sessionId, {
            type: 'error',
            sessionId,
            data: error,
            timestamp: new Date(),
            source: source || 'system',
        });
    }
    sendLog(sessionId, log, source) {
        this.broadcast(sessionId, {
            type: 'log',
            sessionId,
            data: log,
            timestamp: new Date(),
            source: source || 'system',
        });
    }
    broadcast(sessionId, message) {
        const connections = this.connections.get(sessionId);
        if (!connections || connections.length === 0) {
            return;
        }
        connections.forEach(connection => {
            if (connection.subscriptions.includes(message.type) &&
                connection.ws.readyState === ws_1.WebSocket.OPEN) {
                this.sendToConnection(connection, message);
            }
        });
    }
    sendToConnection(connection, message) {
        try {
            connection.ws.send(JSON.stringify(message));
        }
        catch (error) {
            logger_1.logger.error('Failed to send WebSocket message:', error);
            this.removeConnection(connection.sessionId, connection);
        }
    }
    broadcastToAll(message) {
        this.connections.forEach((connections, sessionId) => {
            this.broadcast(sessionId, { ...message, sessionId });
        });
    }
    getStats() {
        const totalConnections = Array.from(this.connections.values())
            .reduce((sum, connections) => sum + connections.length, 0);
        const sessionCount = this.connections.size;
        return {
            isRunning: this.isRunning,
            port: this.port,
            totalConnections,
            sessionCount,
            sessions: Array.from(this.connections.entries()).map(([sessionId, connections]) => ({
                sessionId,
                connectionCount: connections.length,
                subscriptions: connections[0]?.subscriptions || [],
            })),
        };
    }
}
exports.WebSocketManager = WebSocketManager;
let globalWebSocketManager = null;
function getWebSocketManager() {
    if (!globalWebSocketManager) {
        const port = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);
        globalWebSocketManager = new WebSocketManager(port);
    }
    return globalWebSocketManager;
}
function updateProgress(sessionId, progress) {
    const wsManager = getWebSocketManager();
    wsManager.sendProgress({
        sessionId,
        operation: 'unknown',
        progress: 0,
        currentStep: '',
        totalSteps: 1,
        completedSteps: 0,
        status: 'in_progress',
        ...progress,
    });
}
async function startWebSocketServer() {
    const wsManager = getWebSocketManager();
    if (!wsManager['isRunning']) {
        await wsManager.start();
    }
    return wsManager;
}
//# sourceMappingURL=websocket-manager.js.map