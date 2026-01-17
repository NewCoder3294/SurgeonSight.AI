import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext<any>(null);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Check localStorage or default to dark
        const saved = localStorage.getItem('surgeonsight-theme');
        return saved || 'dark';
    });

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('surgeonsight-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
