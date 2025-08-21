// Enhanced Theme Toggle Component with System Theme and Presets
import React, { useState, useEffect } from 'react';
import { useTheme, Theme, ThemePreset } from '../../lib/theme';
import { 
  Sun, 
  Moon, 
  Palette, 
  Check,
  Settings,
  X,
  Monitor,
  Menu
} from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  showTitle?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = false,
  showTitle = false
 }) => {
  const { theme, setTheme, customTheme, updateCustomTheme, applyThemePreset, systemPreference } = useTheme();
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [tempCustomTheme, setTempCustomTheme] = useState(customTheme);
  const [showPresets, setShowPresets] = useState(false);
  
  // Update temp theme when the actual theme changes
  useEffect(() => {
    setTempCustomTheme(customTheme);
  }, [customTheme]);

  const themeOptions = [
    {
      value: 'light' as Theme,
      label: 'Light',
      icon: Sun,
      description: 'Clean and bright interface'
    },
    {
      value: 'dark' as Theme,
      label: 'Dark', 
      icon: Moon,
      description: 'Easy on the eyes in low light'
    },
    {
      value: 'system' as Theme,
      label: 'System',
      icon: Monitor,
      description: 'Follow your device settings'
    },
    {
      value: 'custom' as Theme,
      label: 'Custom',
      icon: Palette,
      description: 'Personalize your experience'
    }
  ];

  const presetOptions: Array<{value: ThemePreset, label: string, description: string}> = [
    { value: 'default', label: 'Default', description: 'CareConnect standard green' },
    { value: 'ocean', label: 'Ocean', description: 'Calming blue tones' },
    { value: 'sunset', label: 'Sunset', description: 'Warm red and orange palette' },
    { value: 'forest', label: 'Forest', description: 'Natural green hues' },
    { value: 'royal', label: 'Royal', description: 'Bold purple and pink' }
  ];
  
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    if (newTheme === 'custom') {
      setShowCustomizer(true);
    } else {
      setShowCustomizer(false);
    }
  };

  const handleCustomThemeUpdate = (key: keyof typeof customTheme, value: string) => {
    setTempCustomTheme(prev => ({ ...prev, [key]: value }));
  };

  const applyCustomTheme = () => {
    updateCustomTheme(tempCustomTheme);
    setShowCustomizer(false);
  };

  const resetCustomTheme = () => {
    const defaultTheme = {
      primary: '#05B34D',
      accent: '#F2B91C',
      background: '#FFFFFF',
      surface: '#F8F9FA',
      text: '#181F25',
      textSecondary: '#6B7280'
    };
    setTempCustomTheme(defaultTheme);
    updateCustomTheme(defaultTheme);
  };

  return (
    <div className={`relative ${className}`}>
      {showTitle && (
        <h3 className="text-sm font-medium text-text mb-2">Theme</h3>
      )}
      
      {/* Theme Selection */}
      <div className="flex items-center space-x-2 p-2 bg-surface border border-border rounded-lg">
        {themeOptions.map(option => {
          const Icon = option.icon;
          const isSelected = theme === option.value;
          
          // For system theme, show indicator of the current system preference
          const isSystemWithPreference = option.value === 'system' && theme === 'system';
          
          return (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={`relative flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                isSelected 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-text-secondary hover:bg-surface'
              }`}
              title={option.description}
            >
              <Icon className="w-4 h-4" />
              {showLabel && <span className="text-sm">{option.label}</span>}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full flex items-center justify-center">
                  <Check className="w-2 h-2 text-white" />
                </div>
              )}
              
              {/* System theme indicator */}
              {isSystemWithPreference && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white dark:border-gray-800 flex items-center justify-center">
                  {systemPreference === 'dark' ? (
                    <div className="w-2 h-2 bg-gray-800 rounded-full" />
                  ) : (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  )}
                </div>
              )}
            </button>
          );
        })}
        
        {theme === 'custom' && (
          <div className="flex space-x-1">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="p-2 text-text-secondary hover:bg-surface rounded-md transition-colors"
              title="Theme presets"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="p-2 text-text-secondary hover:bg-surface rounded-md transition-colors"
              title="Customize theme"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Theme Presets */}
      {showPresets && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-surface border border-border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">
              Theme Presets
            </h3>
            <button
              onClick={() => setShowPresets(false)}
              className="p-1 text-text-secondary hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {presetOptions.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  applyThemePreset(preset.value);
                  setShowPresets(false);
                }}
                className="w-full flex items-center text-left p-2 rounded-md hover:bg-background transition-colors"
              >
                <div 
                  className="w-8 h-8 rounded-full mr-3 border border-border flex-shrink-0"
                  style={{ 
                    backgroundImage: preset.value === 'default' 
                      ? 'linear-gradient(135deg, #05B34D 0%, #F2B91C 100%)'
                      : preset.value === 'ocean'
                      ? 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)'
                      : preset.value === 'sunset'
                      ? 'linear-gradient(135deg, #E63946 0%, #F9A826 100%)'
                      : preset.value === 'forest'
                      ? 'linear-gradient(135deg, #2D6A4F 0%, #95D5B2 100%)'
                      : 'linear-gradient(135deg, #7209B7 0%, #F72585 100%)'
                  }}
                />
                <div>
                  <div className="font-medium text-text">{preset.label}</div>
                  <div className="text-xs text-text-secondary">{preset.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Theme Customizer */}
      {showCustomizer && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text">
              Custom Theme
            </h3>
            <button
              onClick={() => setShowCustomizer(false)}
              className="p-1 text-text-secondary hover:text-text"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(tempCustomTheme).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm font-medium text-text capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => handleCustomThemeUpdate(key as keyof typeof customTheme, e.target.value)}
                    className="w-10 h-8 rounded border border-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleCustomThemeUpdate(key as keyof typeof customTheme, e.target.value)}
                    className="w-16 px-2 py-1 text-xs border border-border rounded bg-background text-text"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
            ))}
            
            <div className="flex space-x-2 pt-4 border-t border-border">
              <button
                onClick={applyCustomTheme}
                className="flex-1 bg-primary text-white px-3 py-2 rounded-md hover:bg-primary/90 transition-colors text-sm"
              >
                Apply Theme
              </button>
              <button
                onClick={resetCustomTheme}
                className="px-3 py-2 border border-border text-text rounded-md hover:bg-surface transition-colors text-sm"
              >
                Reset
              </button>
            </div>
            
            {/* Preview */}
            <div className="mt-4 p-3 rounded-md border border-border">
              <div className="text-sm text-text-secondary mb-2">Preview</div>
              <div 
                className="space-y-2 p-3 rounded" 
                style={{
                  backgroundColor: tempCustomTheme.background,
                  color: tempCustomTheme.text
                }}
              >
                <div 
                  className="w-full h-8 rounded flex items-center justify-center text-sm font-medium"
                  style={{ backgroundColor: tempCustomTheme.primary, color: 'white' }}
                >
                  Primary Button
                </div>
                <div 
                  className="w-full h-6 rounded flex items-center justify-center text-xs"
                  style={{ backgroundColor: tempCustomTheme.accent, color: 'white' }}
                >
                  Accent Element
                </div>
                <div 
                  className="w-full h-6 rounded px-2 flex items-center text-xs"
                  style={{ backgroundColor: tempCustomTheme.surface, color: tempCustomTheme.textSecondary }}
                >
                  Surface with secondary text
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;