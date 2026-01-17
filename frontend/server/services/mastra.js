import OpenAI from 'openai';

/**
 * Mastra-style Agent for Surgical Coaching Feedback
 * Uses GPT-4o-mini for fast, affordable feedback generation
 * Falls back to pre-defined messages if API key not configured
 */

// Pre-defined feedback messages (fallback + variety)
const CORRECTION_MESSAGES = [
    "Try the pencil grip—thumb and index finger only.",
    "Loosen your grip. Less tension.",
    "Rotate wrist clockwise slightly.",
    "Anchor your hand for stability.",
    "Slower, more controlled movements.",
    "Watch your angle of approach.",
    "Don't palm the instrument.",
    "Fingers closer to the tip.",
    "Steady your forearm.",
    "Relax your shoulders."
];

const ENCOURAGEMENT_MESSAGES = [
    "Good grip position. Keep it steady.",
    "Nice angle. Well done.",
    "Smooth motion. Excellent.",
    "Great control there.",
    "That's the technique.",
    "Perfect adjustment.",
    "Excellent form.",
    "You're getting it.",
    "Keep it up!",
    "Wonderful improvement."
];

// Grip-specific corrections
const GRIP_SPECIFIC_MESSAGES = {
    palmed: [
        "Don't palm the instrument—try the pencil grip.",
        "Open your hand more. Fingers near the tip.",
        "Less fist, more finesse. Thumb and index only."
    ],
    angled: [
        "Adjust your wrist angle slightly.",
        "Rotate to find the natural approach angle.",
        "Watch your angle—perpendicular works better."
    ],
    tremor: [
        "Anchor your hand for stability.",
        "Rest your forearm on the surface.",
        "Take a breath. Steady hands come from steady breaths."
    ],
    other_error: [
        "Check your grip position.",
        "Reset and try the standard technique.",
        "Focus on controlled, deliberate movements."
    ]
};

let openaiClient = null;

/**
 * Initialize OpenAI client
 */
function getOpenAIClient() {
    if (!openaiClient && process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== 'your_openai_api_key') {
        openaiClient = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openaiClient;
}

/**
 * Generate feedback using Mastra-style agent pattern
 * @param {string} type - 'correction' or 'encouragement'
 * @param {string} gripState - Current grip state from CV
 * @returns {string} - Feedback message
 */
export async function generateFeedback(type, gripState) {
    const client = getOpenAIClient();

    // Use AI if available
    if (client) {
        try {
            const response = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a surgical skills coach. Generate brief, encouraging feedback for medical students practicing suturing.

Rules:
- Keep feedback under 12 words
- Be supportive, never critical
- Use active voice
- Be specific about what to do, not what not to do
- Sound like a friendly mentor, not a robot

Current context: Student is practicing suturing technique.`
                    },
                    {
                        role: 'user',
                        content: type === 'correction'
                            ? `The student's grip is "${gripState}". Give a brief correction.`
                            : `The student is doing well. Give brief encouragement.`
                    }
                ],
                max_tokens: 30,
                temperature: 0.7
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API error, using fallback:', error.message);
            // Fall through to pre-defined messages
        }
    }

    // Fallback to pre-defined messages
    console.log('⚠️  Using pre-defined feedback messages');

    if (type === 'encouragement') {
        return ENCOURAGEMENT_MESSAGES[Math.floor(Math.random() * ENCOURAGEMENT_MESSAGES.length)];
    }

    // For corrections, try grip-specific first
    if (GRIP_SPECIFIC_MESSAGES[gripState]) {
        const messages = GRIP_SPECIFIC_MESSAGES[gripState];
        return messages[Math.floor(Math.random() * messages.length)];
    }

    return CORRECTION_MESSAGES[Math.floor(Math.random() * CORRECTION_MESSAGES.length)];
}

/**
 * Generate session summary notes
 * @param {Array} events - Session events
 * @param {number} duration - Session duration in seconds
 * @returns {string} - Summary text
 */
export async function generateSessionSummary(events, duration) {
    const client = getOpenAIClient();
    const corrections = events.filter(e => e.type === 'correction').length;
    const encouragements = events.filter(e => e.type === 'encouragement').length;

    if (client) {
        try {
            const response = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Generate a brief, encouraging session summary for a surgical training session. Be positive and constructive.'
                    },
                    {
                        role: 'user',
                        content: `Session lasted ${Math.floor(duration / 60)} minutes. ${corrections} corrections given, ${encouragements} encouragements. Events: ${JSON.stringify(events.slice(-5))}`
                    }
                ],
                max_tokens: 150,
                temperature: 0.7
            });

            return response.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API error for summary:', error.message);
        }
    }

    // Fallback summary
    return `Great practice session! You completed ${Math.floor(duration / 60)} minutes of training with ${corrections + encouragements} feedback moments. Keep up the dedicated practice!`;
}
