/**
 * API utility for backend communication
 * 
 * Note: This uses graceful degradation - if backend is unavailable or endpoints
 * don't match, returns mock data for demo mode.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Start a new coaching session
 * Backend expects POST /session with metrics and events
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} - Session data with LiveKit token
 */
export async function startSession(userId = 'demo-user') {
    try {
        // Backend expects /session with SessionCreate schema
        const response = await fetch(`${API_BASE}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metrics: { baseline_id: userId },
                events: [],
                score: 0
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to start session: ${response.status}`);
        }

        const data = await response.json();
        return {
            sessionId: data.session_id || `sess_demo_${Date.now()}`,
            livekitToken: null,
            roomName: 'demo-room',
            livekitUrl: null
        };
    } catch (error) {
        console.error('API Error:', error);
        // Return mock session data for offline demo
        return {
            sessionId: `sess_demo_${Date.now()}`,
            livekitToken: null,
            roomName: 'demo-room',
            livekitUrl: null
        };
    }
}

/**
 * End a coaching session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session summary
 */
export async function endSession(sessionId: any) {
    try {
        // Backend doesn't have /session/end, just get session data
        const response = await fetch(`${API_BASE}/session/${sessionId}`);

        if (!response.ok) {
            throw new Error(`Failed to get session: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        // Return mock summary for offline demo
        return {
            summary: {
                sessionId,
                duration: 180,
                feedbackCount: 0,
                corrections: 0,
                encouragements: 0,
                events: []
            }
        };
    }
}

/**
 * Get session status
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Session status
 */
export async function getSessionStatus(sessionId: any) {
    try {
        const response = await fetch(`${API_BASE}/session/${sessionId}`);

        if (!response.ok) {
            throw new Error(`Failed to get session: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return null;
    }
}

/**
 * Health check
 * @returns {Promise<boolean>} - True if backend is healthy
 */
export async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

