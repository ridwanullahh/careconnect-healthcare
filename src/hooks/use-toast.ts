// useToast hook — compatible wrapper around the ToastProvider context.
//
// The existing Toast.tsx exports a `useToast` that returns the raw context
// (success, error, info, warning, addToast, removeToast, toasts). Some legacy
// admin components (DataExportDialog, KeyManagementModule) use a different API:
// they destructure `{ toast }` and then call `toast({ title, description, variant })`.
//
// This wrapper exposes BOTH shapes so callers can use either style:
//   const { toast } = useToast();
//   toast({ title: 'Saved', variant: 'success' });
//
//   const toast = useToast();
//   toast.success('Saved', 'Your changes were stored.');
import {
  useToast as useToastContext,
  type ToastType,
} from '../components/ui/Toast';

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

interface ToastCallOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

const variantToType: Record<ToastVariant, ToastType> = {
  default: 'info',
  destructive: 'error',
  success: 'success',
  warning: 'warning',
  info: 'info',
};

export const useToast = () => {
  const context = useToastContext();

  const toast = (options: ToastCallOptions) => {
    const title = options.title ?? '';
    const description = options.description;
    const variant: ToastVariant = options.variant ?? 'default';
    const type: ToastType = variantToType[variant] ?? 'info';

    // Respect a custom duration when provided (matches the underlying
    // ToastContext.addToast API).
    if (options.duration !== undefined) {
      context.addToast({
        type,
        title,
        message: description,
        duration: options.duration,
      });
      return;
    }

    switch (type) {
      case 'success':
        context.success(title, description);
        break;
      case 'error':
        context.error(title, description);
        break;
      case 'warning':
        context.warning(title, description);
        break;
      case 'info':
      default:
        context.info(title, description);
        break;
    }
  };

  return {
    toast,
    success: context.success,
    error: context.error,
    warning: context.warning,
    info: context.info,
    addToast: context.addToast,
    removeToast: context.removeToast,
    toasts: context.toasts,
  };
};

export default useToast;
