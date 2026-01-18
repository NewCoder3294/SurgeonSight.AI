/**
 * KeyConceptsFooter - Renders Key Concepts as a tagline below both panels
 * Only renders after Overshoot successfully parses and provides keyConcepts
 */

interface KeyConceptsFooterProps {
    keyConcepts: string[];
    lowSignal?: boolean;
    scaffold?: string[];
    embedded?: boolean;
}

export default function KeyConceptsFooter({ keyConcepts, lowSignal, scaffold, embedded = true }: KeyConceptsFooterProps) {
    // Merge scaffold items into keyConcepts if lowSignal (remove "Focus areas to review:" prefix)
    const conceptsToShow = keyConcepts.length > 0
        ? keyConcepts
        : (lowSignal && scaffold
            ? scaffold.map(item => item.replace(/^Focus areas to review: /i, ''))
            : []);

    if (conceptsToShow.length === 0) {
        return null;
    }

    // If embedded is false, we don't render the header title or top border, just the chips
    if (!embedded) {
        return (
            <div className="flex flex-wrap gap-2">
                {conceptsToShow.map((concept, i) => (
                    <span
                        key={i}
                        className={`px-2.5 py-1 rounded text-xs border ${keyConcepts.length > 0
                            ? 'bg-[rgba(0,180,216,0.1)] text-accent-rust border-accent-rust-glow'
                            : 'bg-[rgba(255,255,255,0.05)] text-text-muted border-[rgba(255,255,255,0.1)] italic'
                            }`}
                    >
                        {concept}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="mt-6 pt-4 border-t border-accent-rust/20">
            <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-3 font-mono">
                Key Concepts
            </h4>
            <div className="flex flex-wrap gap-2">
                {conceptsToShow.map((concept, i) => (
                    <span
                        key={i}
                        className={`px-2.5 py-1 rounded text-xs border ${keyConcepts.length > 0
                            ? 'bg-[rgba(0,180,216,0.1)] text-accent-rust border-accent-rust-glow'
                            : 'bg-[rgba(255,255,255,0.05)] text-text-muted border-[rgba(255,255,255,0.1)] italic'
                            }`}
                    >
                        {concept}
                    </span>
                ))}
            </div>
        </div>
    );
}
