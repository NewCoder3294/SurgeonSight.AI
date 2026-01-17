/**
 * Smallest.ai TTS Integration
 * Synthesizes speech from text with sub-100ms latency
 * Falls back to null (client uses Web Speech API) if not configured
 */

const SMALLEST_API_URL = 'https://api.smallest.ai/v1/speech';

/**
 * Pre-defined feedback phrases for caching
 */
const CACHED_PHRASES = new Map();

/**
 * Synthesize speech from text using Smallest.ai
 * @param {string} text - Text to convert to speech
 * @returns {string|null} - Base64 audio data or null for client fallback
 */
export async function synthesizeSpeech(text) {
    const apiKey = process.env.SMALLEST_API_KEY;

    // If no API key, return null (client will use Web Speech API)
    if (!apiKey || apiKey === 'your_smallest_api_key') {
        console.log('⚠️  Smallest.ai API key not configured, using client-side TTS fallback');
        return null;
    }

    // Check cache first
    if (CACHED_PHRASES.has(text)) {
        return CACHED_PHRASES.get(text);
    }

    try {
        const response = await fetch(SMALLEST_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text,
                voice_id: 'coach-friendly', // Warm, encouraging voice
                model: 'lightning', // Fastest model for low latency
                speed: 1.0,
                format: 'mp3'
            })
        });

        if (!response.ok) {
            throw new Error(`Smallest.ai API error: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        // Cache the result
        CACHED_PHRASES.set(text, base64Audio);

        return base64Audio;
    } catch (error) {
        console.error('Error synthesizing speech:', error);
        return null; // Fallback to client-side TTS
    }
}

/**
 * Pre-cache common feedback phrases on startup
 */
export async function preCacheCommonPhrases() {
    const commonPhrases = [
        "Good grip position. Keep it steady.",
        "Try the pencil grip—thumb and index finger only.",
        "Loosen your grip. Less tension.",
        "Nice angle. Well done.",
        "Rotate wrist clockwise slightly.",
        "Smooth motion. Excellent.",
        "Anchor your hand for stability.",
        "Great control there.",
        "Slower, more controlled movements.",
        "That's the technique."
    ];

    console.log('Pre-caching common phrases...');
    for (const phrase of commonPhrases) {
        await synthesizeSpeech(phrase);
    }
    console.log('Pre-caching complete.');
}
