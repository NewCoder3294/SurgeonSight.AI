import './SponsorLogos.css';

/**
 * Sponsor logos component for hackathon page footer
 * Displays all integrated sponsor technologies
 */

const SPONSORS = [
    {
        name: 'LiveKit',
        url: 'https://livekit.io',
        logo: null, // Will use text fallback
        description: 'Real-time Video'
    },
    {
        name: 'Smallest.ai',
        url: 'https://smallest.ai',
        logo: null,
        description: 'Voice Synthesis'
    },
    {
        name: 'Mastra',
        url: 'https://mastra.ai',
        logo: null,
        description: 'Agent Orchestration'
    },
    {
        name: 'MediaPipe',
        url: 'https://developers.google.com/mediapipe',
        logo: null,
        description: 'Hand Detection'
    },
    {
        name: 'OpenAI',
        url: 'https://openai.com',
        logo: null,
        description: 'GPT-4o-mini'
    },
    {
        name: 'Arize Phoenix',
        url: 'https://arize.com',
        logo: null,
        description: 'LLM Tracing'
    }
];

export default function SponsorLogos({ compact = false }) {
    return (
        <div className={`sponsor-logos ${compact ? 'compact' : ''}`}>
            <span className="sponsor-label">Powered By</span>
            <div className="sponsor-grid">
                {SPONSORS.map((sponsor) => (
                    <a
                        key={sponsor.name}
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sponsor-item"
                        title={`${sponsor.name} - ${sponsor.description}`}
                    >
                        {sponsor.logo ? (
                            <img src={sponsor.logo} alt={sponsor.name} className="sponsor-logo-img" />
                        ) : (
                            <span className="sponsor-name">{sponsor.name}</span>
                        )}
                        {!compact && (
                            <span className="sponsor-desc">{sponsor.description}</span>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
}
