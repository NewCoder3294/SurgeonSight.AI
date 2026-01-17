import './MetadataDisplay.css';

export default function MetadataDisplay({
    label,
    value,
    position = 'static',
    className = ''
}: any) {
    return (
        <div className={`metadata-display ${position} ${className}`}>
            <span className="metadata-label">{label}</span>
            <span className="metadata-value">{value}</span>
        </div>
    );
}

export function FloatingMetadata({ items = [], position = 'top-right' }: any) {
    return (
        <div className={`floating-metadata ${position}`}>
            {items.map((item: any, index: any) => (
                <div key={index} className="floating-metadata-item">
                    <span className="metadata-label">{item.label}</span>
                    <span className="metadata-value">{item.value}</span>
                </div>
            ))}
        </div>
    );
}
