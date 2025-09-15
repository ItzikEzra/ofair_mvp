/**
 * Debug logging utilities with conditional enabling
 */

const isDevelopment = import.meta.env.DEV;
const isDebugEnabled = isDevelopment || localStorage.getItem('debugLogs') === 'true';

export const debugLog = {
  info: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  },
  
  error: (message: string, error?: any) => {
    if (isDebugEnabled) {
      console.error(`❌ ${message}`, error || '');
    }
    // Always track errors in production for monitoring
    if (!isDevelopment && error) {
      // Here you could send to error tracking service
      // trackError(message, error);
    }
  },
  
  warn: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.warn(`⚠️ ${message}`, data || '');
    }
  },
  
  success: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`✅ ${message}`, data || '');
    }
  },
  
  distance: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`📏 ${message}`, data || '');
    }
  },
  
  filter: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`🔍 ${message}`, data || '');
    }
  },
  
  location: (message: string, data?: any) => {
    if (isDebugEnabled) {
      console.log(`📍 ${message}`, data || '');
    }
  }
};

// Enable debug logs in development console
if (isDevelopment) {
  (window as any).enableDebugLogs = () => {
    localStorage.setItem('debugLogs', 'true');
    debugLog.info('Debug logs enabled');
  };
  
  (window as any).disableDebugLogs = () => {
    localStorage.removeItem('debugLogs');
    debugLog.info('Debug logs disabled');
  };
}