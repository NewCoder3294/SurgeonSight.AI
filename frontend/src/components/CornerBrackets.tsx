export default function CornerBrackets({ children, className = '', size = 'md', animated = false }) {
    // Size variants for brackets - using Tailwind classes
    const sizeClasses = {
        sm: 'w-3 h-3 border',
        md: 'w-5 h-5 border-2',
        lg: 'w-8 h-8 border-[3px]',
        xl: 'w-12 h-12 border-[3px]',
    };

    const bracketSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`relative p-6 group ${className}`}>
            {/* Top-left bracket */}
            <span 
                className={`absolute top-0 left-0 ${bracketSize} border-t border-l border-accent-rust opacity-80 transition-all group-hover:opacity-100 ${animated ? 'animate-bracket-pulse' : ''}`} 
                style={animated ? { animationDelay: '0s' } : {}}
            />
            {/* Top-right bracket */}
            <span 
                className={`absolute top-0 right-0 ${bracketSize} border-t border-r border-accent-rust opacity-80 transition-all group-hover:opacity-100 ${animated ? 'animate-bracket-pulse' : ''}`} 
                style={animated ? { animationDelay: '0.5s' } : {}}
            />
            {/* Bottom-left bracket */}
            <span 
                className={`absolute bottom-0 left-0 ${bracketSize} border-b border-l border-accent-rust opacity-80 transition-all group-hover:opacity-100 ${animated ? 'animate-bracket-pulse' : ''}`} 
                style={animated ? { animationDelay: '1s' } : {}}
            />
            {/* Bottom-right bracket */}
            <span 
                className={`absolute bottom-0 right-0 ${bracketSize} border-b border-r border-accent-rust opacity-80 transition-all group-hover:opacity-100 ${animated ? 'animate-bracket-pulse' : ''}`} 
                style={animated ? { animationDelay: '1.5s' } : {}}
            />
            {children}
        </div>
    );
}
