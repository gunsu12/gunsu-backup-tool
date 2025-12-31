import React, { createContext, useContext, useEffect, useState, useLayoutEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Apply theme immediately to prevent flash
const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
        root.classList.remove('light');
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
        root.classList.add('light');
    }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [theme, setThemeState] = useState<Theme>('dark');
    const [isLoaded, setIsLoaded] = useState(false);

    // Use useLayoutEffect to apply theme before paint
    useLayoutEffect(() => {
        // Load theme from storage on mount
        const loadTheme = async () => {
            try {
                const savedTheme = await window.api.settings.getTheme();
                if (savedTheme) {
                    setThemeState(savedTheme);
                    applyTheme(savedTheme);
                } else {
                    applyTheme('dark');
                }
            } catch {
                applyTheme('dark');
            } finally {
                setIsLoaded(true);
            }
        };
        loadTheme();
    }, []);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        applyTheme(newTheme);
        await window.api.settings.setTheme(newTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isLoaded }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
