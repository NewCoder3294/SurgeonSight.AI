export default function MetadataDisplay({
    label,
    value,
    position = 'static',
    className = ''
}: any) {
    return (
        <div className={`font-mono text-xs tracking-wider uppercase flex flex-col gap-0.5 ${position === 'static' ? '' : 'absolute z-[100]'} ${className}`}>
            <span className="text-text-dim text-[0.55rem]">{label}</span>
            <span className="text-text-muted">{value}</span>
        </div>
    );
}

export function FloatingMetadata({ items = [], position = 'top-right' }: any) {
    const positionClasses = {
        'top-right': 'top-6 right-6 items-end text-right',
        'top-left': 'top-6 left-6 items-start',
        'bottom-right': 'bottom-6 right-6 items-end text-right',
        'bottom-left': 'bottom-6 left-6 items-start',
    };

    const positionClass = positionClasses[position as keyof typeof positionClasses] || positionClasses['top-right'];

    return (
        <div className={`absolute flex flex-col gap-2 p-2 z-[100] ${positionClass}`}>
            {items.map((item: any, index: any) => (
                <div 
                    key={index} 
                    className={`flex flex-col gap-0.5 px-1 py-0.5 bg-bg-secondary backdrop-blur-sm ${position === 'top-right' || position === 'bottom-right' ? 'border-r border-border-subtle' : 'border-l border-border-subtle'}`}
                >
                    <span className="font-mono text-[0.5rem] tracking-widest uppercase text-text-dim">{item.label}</span>
                    <span className="font-mono text-[0.7rem] tracking-wider text-accent-rust">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
