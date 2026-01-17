import './CornerBrackets.css';

export default function CornerBrackets({ children, className = '', size = 'md', animated = false }) {
    return (
        <div className={`corner-brackets-container ${className} ${animated ? 'animated' : ''} size-${size}`}>
            <span className="bracket bracket-tl" />
            <span className="bracket bracket-tr" />
            <span className="bracket bracket-bl" />
            <span className="bracket bracket-br" />
            {children}
        </div>
    );
}
