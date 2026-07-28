/**
 * Console Manager - Production Console Suppression
 * 
 * This utility manages console output based on environment variables.
 * In production, all console methods are suppressed for security.
 * In development, console output is preserved unless explicitly disabled.
 */

interface ConsoleMethod {
  log: typeof console.log;
  error: typeof console.error;
  warn: typeof console.warn;
  info: typeof console.info;
  debug: typeof console.debug;
  trace: typeof console.trace;
  table: typeof console.table;
  group: typeof console.group;
  groupCollapsed: typeof console.groupCollapsed;
  groupEnd: typeof console.groupEnd;
  time: typeof console.time;
  timeEnd: typeof console.timeEnd;
  count: typeof console.count;
  clear: typeof console.clear;
}

class ConsoleManager {
  private originalConsole: ConsoleMethod;
  private isProduction: boolean;
  private isConsoleEnabled: boolean;

  constructor() {
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
      trace: console.trace.bind(console),
      table: console.table.bind(console),
      group: console.group.bind(console),
      groupCollapsed: console.groupCollapsed.bind(console),
      groupEnd: console.groupEnd.bind(console),
      time: console.time.bind(console),
      timeEnd: console.timeEnd.bind(console),
      count: console.count.bind(console),
      clear: console.clear.bind(console),
    };

    // Determine environment
    this.isProduction = import.meta.env.PROD;
    
    // Check for explicit console control
    // VITE_ENABLE_CONSOLE can override production behavior
    // VITE_DISABLE_CONSOLE can disable console in development
    const enableConsole = import.meta.env.VITE_ENABLE_CONSOLE;
    const disableConsole = import.meta.env.VITE_DISABLE_CONSOLE;
    
    if (enableConsole === 'true') {
      this.isConsoleEnabled = true;
    } else if (disableConsole === 'true') {
      this.isConsoleEnabled = false;
    } else {
      // Default behavior: enabled in development, disabled in production
      this.isConsoleEnabled = !this.isProduction;
    }

    this.initializeConsole();
  }

  private initializeConsole(): void {
    if (!this.isConsoleEnabled) {
      this.suppressConsole();
    }
  }

  private suppressConsole(): void {
    // Create no-op functions for all console methods
    const noop = () => {};
    
    console.log = noop;
    console.error = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    console.table = noop;
    console.group = noop;
    console.groupCollapsed = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeEnd = noop;
    console.count = noop;
    console.clear = noop;
  }

  /**
   * Restore original console methods
   * Useful for debugging or emergency situations
   */
  public restoreConsole(): void {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
    console.trace = this.originalConsole.trace;
    console.table = this.originalConsole.table;
    console.group = this.originalConsole.group;
    console.groupCollapsed = this.originalConsole.groupCollapsed;
    console.groupEnd = this.originalConsole.groupEnd;
    console.time = this.originalConsole.time;
    console.timeEnd = this.originalConsole.timeEnd;
    console.count = this.originalConsole.count;
    console.clear = this.originalConsole.clear;
    
    this.isConsoleEnabled = true;
  }

  /**
   * Get current console status
   */
  public getStatus(): { isProduction: boolean; isConsoleEnabled: boolean } {
    return {
      isProduction: this.isProduction,
      isConsoleEnabled: this.isConsoleEnabled,
    };
  }

  /**
   * Safe logging method that respects console settings
   * Use this for critical logs that should always be visible in development
   */
  public safeLog(...args: any[]): void {
    if (this.isConsoleEnabled) {
      this.originalConsole.log(...args);
    }
  }

  /**
   * Safe error logging that respects console settings
   * Use this for critical errors that should always be visible in development
   */
  public safeError(...args: any[]): void {
    if (this.isConsoleEnabled) {
      this.originalConsole.error(...args);
    }
  }
}

// Create singleton instance
const consoleManager = new ConsoleManager();

// Export for use in other modules
export { consoleManager };

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).__consoleManager = consoleManager;
}