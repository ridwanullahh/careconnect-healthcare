import React, { useState, useEffect } from 'react';
import { X, Settings, Check, Info, Shield, Cookie } from 'lucide-react';

interface CookieConsent {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const ConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    essential: true, // Always required
    functional: false,
    analytics: false,
    marketing: false,
    timestamp: ''
  });

  useEffect(() => {
    // Check if user has already given consent
    const existingConsent = localStorage.getItem('cookieConsent');
    if (!existingConsent) {
      setShowBanner(true);
    } else {
      const parsedConsent = JSON.parse(existingConsent);
      setConsent(parsedConsent);
      applyCookieSettings(parsedConsent);
    }
  }, []);

  const applyCookieSettings = (consentData: CookieConsent) => {
    // Apply cookie settings based on user consent
    if (consentData.analytics) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }

    if (consentData.marketing) {
      enableMarketing();
    } else {
      disableMarketing();
    }

    if (consentData.functional) {
      enableFunctional();
    } else {
      disableFunctional();
    }
  };

  const enableAnalytics = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
    }
  };

  const disableAnalytics = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied'
      });
    }
  };

  const enableMarketing = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
  };

  const disableMarketing = () => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  };

  const enableFunctional = () => {
    console.log('Functional cookies enabled');
  };

  const disableFunctional = () => {
    console.log('Functional cookies disabled');
  };

  const handleAcceptAll = () => {
    const newConsent: CookieConsent = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    };
    
    setConsent(newConsent);
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent));
    applyCookieSettings(newConsent);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptEssential = () => {
    const newConsent: CookieConsent = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    };
    
    setConsent(newConsent);
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent));
    applyCookieSettings(newConsent);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    const newConsent: CookieConsent = {
      ...consent,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent));
    applyCookieSettings(newConsent);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleConsentChange = (type: keyof Omit<CookieConsent, 'timestamp'>, value: boolean) => {
    if (type === 'essential') return;
    
    setConsent(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const cookieCategories = [
    {
      key: 'essential' as const,
      title: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function and cannot be switched off.',
      required: true,
      icon: Shield
    },
    {
      key: 'functional' as const,
      title: 'Functional Cookies',
      description: 'These cookies enable enhanced functionality and personalization.',
      required: false,
      icon: Settings
    },
    {
      key: 'analytics' as const,
      title: 'Analytics Cookies',
      description: 'These cookies help us measure and improve site performance.',
      required: false,
      icon: Info
    },
    {
      key: 'marketing' as const,
      title: 'Marketing Cookies',
      description: 'These cookies are used for advertising and marketing purposes.',
      required: false,
      icon: Cookie
    }
  ];

  if (!showBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Cookie className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Cookie Consent</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We use cookies to enhance your experience, analyze site traffic, and for marketing purposes. 
                You can customize your preferences or accept all cookies.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Customize
              </button>
              <button
                onClick={handleAcceptEssential}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cookie Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cookie Preferences</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {cookieCategories.map((category) => {
                  const IconComponent = category.icon;
                  return (
                    <div key={category.key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <IconComponent className="w-5 h-5 text-primary" />
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {category.title}
                            </h3>
                            {category.required && (
                              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {category.description}
                          </p>
                        </div>
                        
                        <div className="ml-4">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={consent[category.key]}
                              onChange={(e) => handleConsentChange(category.key, e.target.checked)}
                              disabled={category.required}
                              className="sr-only peer"
                            />
                            <div className={`relative w-11 h-6 rounded-full peer transition-colors ${
                              consent[category.key] 
                                ? 'bg-primary' 
                                : 'bg-gray-200 dark:bg-gray-700'
                            } ${category.required ? 'opacity-50 cursor-not-allowed' : ''}`}>
                              <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${
                                consent[category.key] ? 'translate-x-full' : ''
                              }`}>
                                {consent[category.key] && (
                                  <Check className="w-3 h-3 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                )}
                              </div>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <button
                  onClick={handleAcceptEssential}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save Preferences
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConsentBanner;