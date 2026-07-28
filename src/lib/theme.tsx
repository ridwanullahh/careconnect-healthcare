// Theme System for CareConnect Platform
import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'custom' | 'system';
export type ThemePreset = 'default' | 'ocean' | 'sunset' | 'forest' | 'royal';

interface CustomTheme {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}

interface ThemeState {
  theme: Theme;
  customTheme: CustomTheme;
  isTransitioning: boolean;
  systemPreference: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  updateCustomTheme: (updates: Partial<CustomTheme>) => void;
  applyThemePreset: (preset: ThemePreset) => void;
  toggleTheme: () => void;
  applyTheme: () => void;
}

const defaultCustomTheme: CustomTheme = {
  primary: '#05B34D',
  accent: '#F2B91C',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#181F25',
  textSecondary: '#6B7280'
};

const themePresets: Record<ThemePreset, CustomTheme> = {
  default: defaultCustomTheme,
  ocean: {
    primary: '#0077B6',
    accent: '#00B4D8',
    background: '#FFFFFF',
    surface: '#F0F7FF',
    text: '#0A1428',
    textSecondary: '#4B5563'
  },
  sunset: {
    primary: '#E63946',
    accent: '#F9A826',
    background: '#FFFFFF',
    surface: '#FFF8F0',
    text: '#1D3557',
    textSecondary: '#4B5563'
  },
  forest: {
    primary: '#2D6A4F',
    accent: '#95D5B2',
    background: '#FFFFFF',
    surface: '#F0FFF4',
    text: '#081C15',
    textSecondary: '#4B5563'
  },
  royal: {
    primary: '#7209B7',
    accent: '#F72585',
    background: '#FFFFFF',
    surface: '#F8F0FC',
    text: '#240046',
    textSecondary: '#4B5563'
  }
};

const lightTheme = {
  '--color-primary': '#05B34D',
  '--color-accent': '#F2B91C',
  '--color-dark': '#181F25',
  '--color-light': '#E9FBF1',
  '--color-white': '#FFFFFF',
  '--color-background': '#FFFFFF',
  '--color-surface': '#F8F9FA',
  '--color-text': '#181F25',
  '--color-text-secondary': '#6B7280',
  '--color-border': '#E5E7EB',
  '--color-shadow': 'rgba(0, 0, 0, 0.1)',
  '--gradient-background': 'linear-gradient(135deg, #E9FBF1 0%, #FFFFFF 100%)',
  '--gradient-primary': 'linear-gradient(135deg, #05B34D 0%, #04A041 100%)',
  '--gradient-accent': 'linear-gradient(135deg, #F2B91C 0%, #E6A500 100%)'
};

const darkTheme = {
  '--color-primary': '#06D455',
  '--color-accent': '#FFD700',
  '--color-dark': '#FFFFFF',
  '--color-light': '#1F2937',
  '--color-white': '#111827',
  '--color-background': '#111827',
  '--color-surface': '#1F2937',
  '--color-text': '#F9FAFB',
  '--color-text-secondary': '#D1D5DB',
  '--color-border': '#374151',
  '--color-shadow': 'rgba(0, 0, 0, 0.3)',
  '--gradient-background': 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
  '--gradient-primary': 'linear-gradient(135deg, #06D455 0%, #059142 100%)',
  '--gradient-accent': 'linear-gradient(135deg, #FFD700 0%, #F59E0B 100%)'
};

export const useTheme = create<ThemeState>()(persist(
  (set, get) => ({
    theme: 'system',
    customTheme: defaultCustomTheme,
    isTransitioning: false,
    systemPreference: 'light',

    setTheme: (theme: Theme) => {
      set({ theme, isTransitioning: true });
      get().applyTheme();
      setTimeout(() => set({ isTransitioning: false }), 300);
    },

    updateCustomTheme: (updates: Partial<CustomTheme>) => {
      const customTheme = { ...get().customTheme, ...updates };
      set({ customTheme });
      if (get().theme === 'custom') {
        get().applyTheme();
      }
    },

    toggleTheme: () => {
      const currentTheme = get().theme;
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      get().setTheme(newTheme);
    },

    applyThemePreset: (preset: ThemePreset) => {
      const presetTheme = themePresets[preset];
      set({ customTheme: presetTheme });
      if (get().theme === 'custom') {
        get().applyTheme();
      }
    },

    applyTheme: () => {
      const { theme, customTheme } = get();
      const root = document.documentElement;

      // Check for system preference if theme is set to 'system'
      let activeTheme = theme;
      if (theme === 'system') {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        activeTheme = prefersDark ? 'dark' : 'light';
        set({ systemPreference: prefersDark ? 'dark' : 'light' });
      }

      // Remove existing theme classes
      root.classList.remove('theme-light', 'theme-dark', 'theme-custom');
      
      let themeVars: Record<string, string>;
      
      switch (activeTheme) {
        case 'dark':
          themeVars = darkTheme;
          root.classList.add('theme-dark', 'dark');
          break;
        case 'custom':
          themeVars = {
            '--color-primary': customTheme.primary,
            '--color-accent': customTheme.accent,
            '--color-background': customTheme.background,
            '--color-surface': customTheme.surface,
            '--color-text': customTheme.text,
            '--color-text-secondary': customTheme.textSecondary,
            '--color-dark': customTheme.text,
            '--color-light': customTheme.surface,
            '--color-white': customTheme.background,
            '--color-border': adjustColorBrightness(customTheme.surface, -10),
            '--color-shadow': `${hexToRgba(customTheme.text, 0.1)}`,
            '--gradient-background': `linear-gradient(135deg, ${customTheme.surface} 0%, ${customTheme.background} 100%)`,
            '--gradient-primary': `linear-gradient(135deg, ${customTheme.primary} 0%, ${adjustColorBrightness(customTheme.primary, -10)} 100%)`,
            '--gradient-accent': `linear-gradient(135deg, ${customTheme.accent} 0%, ${adjustColorBrightness(customTheme.accent, -10)} 100%)`
          };
          root.classList.add('theme-custom');
          break;
        default:
          themeVars = lightTheme;
          root.classList.add('theme-light');
      }

      // Apply CSS custom properties
      Object.entries(themeVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      // Update meta theme-color for mobile browsers
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeVars['--color-primary']);
      }
    }
  }),
  {
    name: 'careconnect-theme'
  }
));

// Utility functions
function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Initialize theme on app load
export const initializeTheme = () => {
  const themeStore = useTheme.getState();
  themeStore.applyTheme();
  
  // Set up system preference listener
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Initial check
    const updateSystemPreference = () => {
      const prefersDark = mediaQuery.matches;
      themeStore.systemPreference = prefersDark ? 'dark' : 'light';
      
      // If theme is set to system, update the appearance
      if (themeStore.theme === 'system') {
        themeStore.applyTheme();
      }
    };
    
    // Listen for changes
    mediaQuery.addEventListener('change', updateSystemPreference);
  }
};

// Theme-aware component HOC
export function withTheme<T extends object>(Component: React.ComponentType<T>) {
  return function ThemedComponent(props: T) {
    const { theme, isTransitioning } = useTheme();
    
    return (
      <div 
        className={`theme-transition ${isTransitioning ? 'transitioning' : ''}`}
        data-theme={theme}
      >
        <Component {...props} />
      </div>
    );
  };
}