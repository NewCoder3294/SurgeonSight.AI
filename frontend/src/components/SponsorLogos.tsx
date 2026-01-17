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
        <div className={`flex flex-col items-center gap-4 py-6 ${compact ? 'py-2' : ''}`}>
            <span className="font-mono text-[0.6rem] tracking-[0.3em] uppercase text-text-dim">Powered By</span>
            <div className={`flex flex-wrap justify-center gap-6 ${compact ? 'gap-4' : ''}`}>
                {SPONSORS.map((sponsor) => (
                    <a
                        key={sponsor.name}
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex flex-col items-center gap-1 px-4 py-2 no-underline transition-all duration-250 border border-transparent hover:border-border-subtle hover:bg-bg-secondary [data-theme="light"]:hover:bg-bg-tertiary ${compact ? 'px-2 py-1' : ''}`}
                        title={`${sponsor.name} - ${sponsor.description}`}
                    >
                        {sponsor.logo ? (
                            <img 
                                src={sponsor.logo} 
                                alt={sponsor.name} 
                                className="h-6 w-auto grayscale brightness-80 opacity-70 transition-all duration-250 hover:grayscale-0 hover:brightness-100 hover:opacity-100" 
                            />
                        ) : (
                            <span className={`font-display tracking-wider text-text-muted transition-colors duration-250 hover:text-accent-rust ${compact ? 'text-xs' : 'text-base'}`}>
                                {sponsor.name}
                            </span>
                        )}
                        {!compact && (
                            <span className="font-mono text-[0.5rem] tracking-wider uppercase text-text-dim">{sponsor.description}</span>
                        )}
                    </a>
                ))}
            </div>
        </div>
    );
}
