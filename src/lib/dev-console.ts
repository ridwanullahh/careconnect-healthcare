/**
 * Development Console Utilities
 * 
 * This file provides utilities for developers to easily manage console output
 * during development and debugging.
 */

import { consoleManager } from './console-manager';

/**
 * Development utilities available in browser console
 * Access these via window.__devConsole in browser dev tools
 */
export const devConsole = {
  /**
   * Enable console output (useful for debugging in production)
   */
  enable: () => {
    consoleManager.restoreConsole();
    console.log('✅ Console output enabled');
  },

  /**
   * Get current console status
   */
  status: () => {
    const status = consoleManager.getStatus();
    console.log('Console Status:', status);
    return status;
  },

  /**
   * Safe logging that respects console settings
   */
  log: (...args: any[]) => {
    consoleManager.safeLog(...args);
  },

  /**
   * Safe error logging that respects console settings
   */
  error: (...args: any[]) => {
    consoleManager.safeError(...args);
  },

  /**
   * Help information
   */
  help: () => {
    const helpText = `
🔧 Development Console Utilities

Available commands:
• __devConsole.enable()  - Enable console output
• __devConsole.status()  - Check console status
• __devConsole.log()     - Safe logging
• __devConsole.error()   - Safe error logging
• __devConsole.help()    - Show this help

Environment Variables:
• VITE_ENABLE_CONSOLE=true   - Force enable in production
• VITE_DISABLE_CONSOLE=true  - Force disable in development

Current Status: ${JSON.stringify(consoleManager.getStatus(), null, 2)}
    `;
    console.log(helpText);
  }
};

// Make available globally for development
if (typeof window !== 'undefined') {
  (window as any).__devConsole = devConsole;
}

export default devConsole;