// Toast Service - Centralized notification system to replace alert() calls
import { useToast } from '../components/ui/Toast';

// Global toast service for use outside React components
class ToastService {
  private static toastContext: any = null;

  static setToastContext(context: any) {
    this.toastContext = context;
  }

  static success(title: string, message?: string) {
    if (this.toastContext) {
      this.toastContext.success(title, message);
    } else {
      console.log(`SUCCESS: ${title}${message ? ` - ${message}` : ''}`);
    }
  }

  static error(title: string, message?: string) {
    if (this.toastContext) {
      this.toastContext.error(title, message);
    } else {
      console.error(`ERROR: ${title}${message ? ` - ${message}` : ''}`);
    }
  }

  static warning(title: string, message?: string) {
    if (this.toastContext) {
      this.toastContext.warning(title, message);
    } else {
      console.warn(`WARNING: ${title}${message ? ` - ${message}` : ''}`);
    }
  }

  static info(title: string, message?: string) {
    if (this.toastContext) {
      this.toastContext.info(title, message);
    } else {
      console.info(`INFO: ${title}${message ? ` - ${message}` : ''}`);
    }
  }
}

// Hook for React components
export const useToastService = () => {
  const toast = useToast();
  
  // Set the global context when hook is used
  ToastService.setToastContext(toast);
  
  return {
    success: toast.success,
    error: toast.error,
    warning: toast.warning,
    info: toast.info,
    showSuccess: (message: string) => toast.success('Success', message),
    showError: (message: string) => toast.error('Error', message),
    showWarning: (message: string) => toast.warning('Warning', message),
    showInfo: (message: string) => toast.info('Info', message),
  };
};

export default ToastService;