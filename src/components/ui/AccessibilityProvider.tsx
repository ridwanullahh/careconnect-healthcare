// Accessibility Provider Component
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilitySettings {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  focusVisible: boolean;
  screenReaderOptimized: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void;
  announceToScreenReader: (message: string) => void;
  keyboardNavigation: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    focusVisible: true,
    screenReaderOptimized: false
  });
  
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);

  useEffect(() => {
    // Load saved accessibility preferences
    const savedSettings = localStorage.getItem('careconnect_accessibility');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse accessibility settings:', error);
      }
    }

    // Detect system preferences
    const mediaQueries = {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      largeText: window.matchMedia('(prefers-reduced-data: reduce)') // Proxy for accessibility needs
    };

    const updateFromSystem = () => {
      setSettings(prev => ({
        ...prev,
        reduceMotion: prev.reduceMotion || mediaQueries.reduceMotion.matches,
        highContrast: prev.highContrast || mediaQueries.highContrast.matches
      }));
    };

    updateFromSystem();

    // Listen for system preference changes
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updateFromSystem);
    });

    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true);
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigation(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updateFromSystem);
      });
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  useEffect(() => {
    // Apply accessibility settings to DOM
    const root = document.documentElement;
    
    // Reduced motion
    if (settings.reduceMotion) {
      root.style.setProperty('--brand-transition-fast', '0.01ms');
      root.style.setProperty('--brand-transition-base', '0.01ms');
      root.style.setProperty('--brand-transition-slow', '0.01ms');
    } else {
      root.style.removeProperty('--brand-transition-fast');
      root.style.removeProperty('--brand-transition-base');
      root.style.removeProperty('--brand-transition-slow');
    }

    // High contrast
    if (settings.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    // Large text
    if (settings.largeText) {
      root.style.fontSize = '1.125rem'; // 18px base instead of 16px
    } else {
      root.style.fontSize = '';
    }

    // Focus visible
    if (settings.focusVisible || keyboardNavigation) {
      root.setAttribute('data-focus-visible', 'true');
    } else {
      root.removeAttribute('data-focus-visible');
    }

    // Screen reader optimization
    if (settings.screenReaderOptimized) {
      root.setAttribute('data-screen-reader', 'true');
    } else {
      root.removeAttribute('data-screen-reader');
    }

    // Save settings
    localStorage.setItem('careconnect_accessibility', JSON.stringify(settings));
  }, [settings, keyboardNavigation]);

  const updateSetting = (key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return (
    <AccessibilityContext.Provider value={{
      settings,
      updateSetting,
      announceToScreenReader,
      keyboardNavigation
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Accessibility Settings Panel Component
export const AccessibilitySettings: React.FC = () => {
  const { settings, updateSetting } = useAccessibility();

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold text-lg">Accessibility Settings</h3>
      
      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <div>
            <span className="font-medium">Reduce Motion</span>
            <p className="text-sm text-gray-600">Minimize animations and transitions</p>
          </div>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => updateSetting('highContrast', e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <div>
            <span className="font-medium">High Contrast</span>
            <p className="text-sm text-gray-600">Increase contrast for better visibility</p>
          </div>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.largeText}
            onChange={(e) => updateSetting('largeText', e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <div>
            <span className="font-medium">Large Text</span>
            <p className="text-sm text-gray-600">Increase base font size</p>
          </div>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.focusVisible}
            onChange={(e) => updateSetting('focusVisible', e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <div>
            <span className="font-medium">Enhanced Focus</span>
            <p className="text-sm text-gray-600">Make keyboard focus more visible</p>
          </div>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.screenReaderOptimized}
            onChange={(e) => updateSetting('screenReaderOptimized', e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <div>
            <span className="font-medium">Screen Reader Optimized</span>
            <p className="text-sm text-gray-600">Enhanced support for assistive technologies</p>
          </div>
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Keyboard Navigation:</strong> Use Tab to navigate, Enter/Space to activate, 
          and Escape to close dialogs. Arrow keys work in menus and lists.
        </p>
      </div>
    </div>
  );
};