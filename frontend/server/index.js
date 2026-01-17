import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import { generateLiveKitToken } from './services/livekit.js';
import { generateFeedback } from './services/mastra.js';
import { synthesizeSpeech } from './services/smallest.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

// In-memory session storage (for demo purposes)
const sessions = new Map();

// ===================================
// REST API Routes
// ===================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Start a new session
app.post('/api/session/start', async (req, res) => {
    try {
        const sessionId = `sess_${uuidv4().slice(0, 8)}`;
        const roomName = `surgery-room-${sessionId}`;
        const participantId = req.body.userId || 'demo-user';

        // Generate LiveKit token (will use mock if no API keys)
        const livekitToken = await generateLiveKitToken(roomName, participantId);

        // Initialize session
        sessions.set(sessionId, {
            id: sessionId,
            roomName,
            participantId,
            startTime: Date.now(),
            events: [],
            feedbackCount: 0,
            lastFeedbackTime: 0
        });

        res.json({
            sessionId,
            livekitToken,
            roomName,
            livekitUrl: process.env.LIVEKIT_URL || 'wss://demo.livekit.cloud'
        });
    } catch (error) {
        console.error('Error starting session:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// End a session
app.post('/api/session/end', (req, res) => {
    const { sessionId } = req.body;
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const duration = Math.floor((Date.now() - session.startTime) / 1000);
    const corrections = session.events.filter(e => e.type === 'correction').length;
    const encouragements = session.events.filter(e => e.type === 'encouragement').length;

    const summary = {
        sessionId,
        duration,
        feedbackCount: session.events.length,
        corrections,
        encouragements,
        events: session.events
    };

    // Clean up session
    sessions.delete(sessionId);

    res.json({ summary });
});

// Get session status
app.get('/api/session/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    res.json({
        sessionId: session.id,
        duration: Math.floor((Date.now() - session.startTime) / 1000),
        eventCount: session.events.length
    });
});

// ===================================
// HTTP Server + WebSocket
// ===================================

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    let clientSessionId = null;

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());

            switch (message.type) {
                case 'join':
                    clientSessionId = message.sessionId;
                    ws.send(JSON.stringify({ type: 'joined', sessionId: clientSessionId }));
                    break;

                case 'grip_state':
                    await handleGripState(ws, clientSessionId, message);
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Handle grip state changes and generate feedback
async function handleGripState(ws, sessionId, message) {
    const session = sessions.get(sessionId);
    if (!session) return;

    const { gripState, landmarks, timestamp } = message;
    const now = Date.now();

    // Cooldown: no feedback within 3 seconds of last feedback
    if (now - session.lastFeedbackTime < 3000) {
        return;
    }

    // Only trigger feedback on errors or significant changes
    if (gripState === 'correct') {
        // Occasionally give encouragement
        if (Math.random() < 0.1 && now - session.lastFeedbackTime > 10000) {
            await sendFeedback(ws, session, 'encouragement', gripState);
        }
        return;
    }

    // Trigger correction feedback
    await sendFeedback(ws, session, 'correction', gripState);
}

async function sendFeedback(ws, session, type, gripState) {
    try {
        // Generate feedback text using Mastra agent
        const feedbackText = await generateFeedback(type, gripState);

        // Synthesize speech using Smallest.ai
        const audioData = await synthesizeSpeech(feedbackText);

        const timestamp = Math.floor((Date.now() - session.startTime) / 1000);

        // Log event
        const event = {
            id: uuidv4(),
            type,
            message: feedbackText,
            timestamp,
            gripState
        };
        session.events.push(event);
        session.lastFeedbackTime = Date.now();

        // Send to client
        ws.send(JSON.stringify({
            type: 'feedback',
            category: type,
            message: feedbackText,
            timestamp,
            audioData // base64 encoded audio or URL
        }));

    } catch (error) {
        console.error('Error sending feedback:', error);
    }
}

// ===================================
// Start Server
// ===================================

server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           SurgeonSight AI Backend Server                   ║
╠═══════════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}/api                   ║
║  WebSocket:   ws://localhost:${PORT}/ws                      ║
║  Health:      http://localhost:${PORT}/api/health            ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
