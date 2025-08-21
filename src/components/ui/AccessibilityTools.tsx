// Accessibility Tools - Floating Widget with Theme Integration
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../lib/theme';
import {
  Settings,
  Eye,
  Ear,
  MousePointer,
  Type,
  Contrast,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  Volume2,
  Play,
  Pause,
  Square,
  X,
  Accessibility
} from 'lucide-react';

interface AccessibilityState {
  fontSize: number;
  contrast: boolean;
  highContrast: boolean;
  grayscale: boolean;
  invertColors: boolean;
  underlineLinks: boolean;
  bigCursor: boolean;
  readingGuide: boolean;
  textToSpeech: boolean;
  reducedMotion: boolean;
  focusVisible: boolean;
}

const AccessibilityTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'vision' | 'motor' | 'cognitive'>('vision');
  const [isReading, setIsReading] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const [state, setState] = useState<AccessibilityState>({
    fontSize: 100,
    contrast: false,
    highContrast: false,
    grayscale: false,
    invertColors: false,
    underlineLinks: false,
    bigCursor: false,
    readingGuide: false,
    textToSpeech: false,
    reducedMotion: false,
    focusVisible: false
  });

  useEffect(() => {
    // Load saved settings from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      setState(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('accessibility-settings', JSON.stringify(state));
    applySettings();
  }, [state]);

  const applySettings = () => {
    const root = document.documentElement;
    const body = document.body;

    // Font size
    root.style.fontSize = `${state.fontSize}%`;

    // High contrast
    if (state.highContrast) {
      body.classList.add('accessibility-high-contrast');
    } else {
      body.classList.remove('accessibility-high-contrast');
    }

    // Grayscale
    if (state.grayscale) {
      body.classList.add('accessibility-grayscale');
    } else {
      body.classList.remove('accessibility-grayscale');
    }

    // Invert colors
    if (state.invertColors) {
      body.classList.add('accessibility-invert');
    } else {
      body.classList.remove('accessibility-invert');
    }

    // Underline links
    if (state.underlineLinks) {
      body.classList.add('accessibility-underline-links');
    } else {
      body.classList.remove('accessibility-underline-links');
    }

    // Big cursor
    if (state.bigCursor) {
      body.classList.add('accessibility-big-cursor');
    } else {
      body.classList.remove('accessibility-big-cursor');
    }

    // Reading guide
    if (state.readingGuide) {
      body.classList.add('accessibility-reading-guide');
    } else {
      body.classList.remove('accessibility-reading-guide');
    }

    // Reduced motion
    if (state.reducedMotion) {
      body.classList.add('accessibility-reduced-motion');
    } else {
      body.classList.remove('accessibility-reduced-motion');
    }

    // Focus visible
    if (state.focusVisible) {
      body.classList.add('accessibility-focus-visible');
    } else {
      body.classList.remove('accessibility-focus-visible');
    }
  };

  const resetSettings = () => {
    setState({
      fontSize: 100,
      contrast: false,
      highContrast: false,
      grayscale: false,
      invertColors: false,
      underlineLinks: false,
      bigCursor: false,
      readingGuide: false,
      textToSpeech: false,
      reducedMotion: false,
      focusVisible: false
    });
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const startReading = () => {
    const textContent = document.body.innerText;
    speakText(textContent);
    setIsReading(true);
  };

  const stopReading = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setIsReading(false);
  };

  const pauseReading = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.pause();
      setIsReading(false);
    }
  };

  const resumeReading = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.resume();
      setIsReading(true);
    }
  };

  const tabs = [
    { id: 'vision' as const, label: 'Vision', icon: Eye },
    { id: 'motor' as const, label: 'Motor', icon: MousePointer },
    { id: 'cognitive' as const, label: 'Cognitive', icon: Ear }
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 bg-primary hover:bg-primary/90 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
        title="Accessibility Tools"
        aria-label="Open accessibility tools"
      >
        <Accessibility className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-80 bg-surface border border-border rounded-lg shadow-2xl theme-transition">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-primary text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <Accessibility className="w-5 h-5" />
          <h3 className="font-semibold text-sm">Accessibility Tools</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'vision' && (
          <div className="space-y-4">
            {/* Theme Integration */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Theme Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-md text-xs transition-colors ${
                    theme === 'light' 
                      ? 'bg-primary text-white' 
                      : 'bg-background border border-border text-text hover:bg-surface'
                  }`}
                >
                  Light Mode
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-md text-xs transition-colors ${
                    theme === 'dark' 
                      ? 'bg-primary text-white' 
                      : 'bg-background border border-border text-text hover:bg-surface'
                  }`}
                >
                  Dark Mode
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Text Size: {state.fontSize}%
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setState(prev => ({ ...prev, fontSize: Math.max(50, prev.fontSize - 10) }))}
                  className="p-2 bg-surface hover:bg-background rounded transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={state.fontSize}
                  onChange={(e) => setState(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <button
                  onClick={() => setState(prev => ({ ...prev, fontSize: Math.min(200, prev.fontSize + 10) }))}
                  className="p-2 bg-surface hover:bg-background rounded transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Options */}
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={state.highContrast}
                  onChange={(e) => setState(prev => ({ ...prev, highContrast: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex items-center space-x-2">
                  <Contrast className="w-4 h-4" />
                  <span className="text-sm">High Contrast</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={state.grayscale}
                  onChange={(e) => setState(prev => ({ ...prev, grayscale: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex items-center space-x-2">
                  <Palette className="w-4 h-4" />
                  <span className="text-sm">Grayscale</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={state.invertColors}
                  onChange={(e) => setState(prev => ({ ...prev, invertColors: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Invert Colors</span>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={state.underlineLinks}
                  onChange={(e) => setState(prev => ({ ...prev, underlineLinks: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <div className="flex items-center space-x-2">
                  <Type className="w-4 h-4" />
                  <span className="text-sm">Underline Links</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'motor' && (
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={state.bigCursor}
                onChange={(e) => setState(prev => ({ ...prev, bigCursor: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center space-x-2">
                <MousePointer className="w-4 h-4" />
                <span className="text-sm">Large Cursor</span>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={state.focusVisible}
                onChange={(e) => setState(prev => ({ ...prev, focusVisible: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span className="text-sm">Enhanced Focus</span>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={state.reducedMotion}
                onChange={(e) => setState(prev => ({ ...prev, reducedMotion: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Reduce Motion</span>
              </div>
            </label>
          </div>
        )}

        {activeTab === 'cognitive' && (
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={state.readingGuide}
                onChange={(e) => setState(prev => ({ ...prev, readingGuide: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <div className="flex items-center space-x-2">
                <Type className="w-4 h-4" />
                <span className="text-sm">Reading Guide</span>
              </div>
            </label>

            {/* Text to Speech Controls */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Text to Speech
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={isReading ? pauseReading : startReading}
                  className="flex items-center space-x-1 px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                >
                  {isReading ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span className="text-sm">{isReading ? 'Pause' : 'Read Page'}</span>
                </button>
                <button
                  onClick={stopReading}
                  className="flex items-center space-x-1 px-3 py-2 bg-text-secondary text-white rounded hover:bg-text-secondary/90 transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span className="text-sm">Stop</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <button
          onClick={resetSettings}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-text-secondary hover:text-text transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All</span>
        </button>
        <div className="text-xs text-text-secondary">
          Settings saved automatically
        </div>
      </div>
    </div>
  );
};

export default AccessibilityTools;