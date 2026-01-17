import { AccessToken } from 'livekit-server-sdk';

/**
 * Generate a LiveKit access token for room connection
 * Falls back to mock token if API keys not configured
 */
export async function generateLiveKitToken(roomName, participantId) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    // If no API keys, return mock token for demo
    if (!apiKey || !apiSecret || apiKey === 'your_livekit_api_key') {
        console.log('⚠️  LiveKit API keys not configured, using mock token');
        return `mock_token_${roomName}_${participantId}_${Date.now()}`;
    }

    try {
        const token = new AccessToken(apiKey, apiSecret, {
            identity: participantId,
            ttl: '1h', // Token expires in 1 hour
        });

        token.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        return await token.toJwt();
    } catch (error) {
        console.error('Error generating LiveKit token:', error);
        throw error;
    }
}

/**
 * Create a LiveKit room (optional - rooms auto-create on join)
 */
export async function createRoom(roomName) {
    // Rooms are auto-created when first participant joins
    // This function is here for future expansion
    return { name: roomName, created: true };
}
