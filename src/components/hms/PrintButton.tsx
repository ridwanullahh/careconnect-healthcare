// Print Button - Reusable button that opens a new window with the provided
// HTML document and triggers the browser's print dialog.
// Props: { html: string; filename: string; label?: string }
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';

export interface PrintButtonProps {
  /** Pre-generated HTML document string (a full <!DOCTYPE html> document is expected). */
  html: string;
  /** Suggested filename used as the new window's title (also helps the browser default the print job name). */
  filename: string;
  /** Optional button label; defaults to "Print". */
  label?: string;
  /** Optional button variant; defaults to "outline". */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Optional button size; defaults to "sm". */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Optional extra className for the underlying Button. */
  className?: string;
  /** Optional callback fired after the print window is opened. */
  onPrinted?: () => void;
  /** Optional callback fired if opening the print window fails (e.g. popup blocked). */
  onError?: (message: string) => void;
  /** Optional disabled flag. */
  disabled?: boolean;
  /** When true, automatically triggers the print flow as soon as `html` becomes non-empty. Useful for lazy-load wrappers that fetch the document on first click. */
  autoPrint?: boolean;
}

const PrintButton: React.FC<PrintButtonProps> = ({
  html,
  filename,
  label = 'Print',
  variant = 'outline',
  size = 'sm',
  className,
  onPrinted,
  onError,
  disabled,
  autoPrint = false
}) => {
  const [busy, setBusy] = useState(false);
  const autoPrintedRef = React.useRef(false);

  const handlePrint = useCallback(() => {
    if (disabled || busy) return;
    if (!html || html.trim().length === 0) {
      onError?.('No document content to print.');
      return;
    }
    setBusy(true);

    // Open a new window/tab. Some browsers (especially with strict popup blockers)
    // may return null; we fall back to writing into a hidden iframe in the current document.
    let printWindow: Window | null = null;
    try {
      printWindow = window.open('', '_blank', 'width=900,height=1200,noopener,noreferrer');
    } catch (err) {
      printWindow = null;
    }

    if (!printWindow) {
      // Fallback: hidden iframe approach
      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.title = filename;
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (!doc) {
          throw new Error('Unable to access iframe document.');
        }
        doc.open();
        doc.write(html);
        doc.close();

        // Give the browser a tick to render before printing.
        const win = iframe.contentWindow;
        const afterPrint = () => {
          try {
            document.body.removeChild(iframe);
          } catch (_) {
            // ignore
          }
          setBusy(false);
          onPrinted?.();
        };
        if (win) {
          win.onafterprint = afterPrint;
          setTimeout(() => {
            try {
              win.focus();
              win.print();
              // Some browsers don't fire onafterprint reliably; clean up after a delay.
              setTimeout(afterPrint, 1500);
            } catch (printErr) {
              afterPrint();
              onError?.('Print failed in fallback iframe.');
            }
          }, 350);
        } else {
          afterPrint();
          onError?.('Print failed in fallback iframe.');
        }
        return;
      } catch (fallbackErr) {
        setBusy(false);
        onError?.(
          'Pop-up blocked. Please allow pop-ups for this site to print documents.'
        );
        return;
      }
    }

    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      // Set the document title so the print job uses a meaningful name.
      try {
        printWindow.document.title = filename;
      } catch (_) {
        // ignore
      }

      const afterPrint = () => {
        setBusy(false);
        onPrinted?.();
        // Close the print window after printing (some browsers do this automatically).
        try {
          printWindow?.close();
        } catch (_) {
          // ignore
        }
      };

      // Most browsers fire onafterprint when the print dialog closes.
      printWindow.onafterprint = afterPrint;

      // Wait for layout before triggering print.
      setTimeout(() => {
        try {
          printWindow?.focus();
          printWindow?.print();
          // Fallback timeout in case onafterprint doesn't fire.
          setTimeout(afterPrint, 2000);
        } catch (printErr) {
          afterPrint();
          onError?.('Print failed in popup window.');
        }
      }, 400);
    } catch (writeErr) {
      setBusy(false);
      try {
        printWindow.close();
      } catch (_) {
        // ignore
      }
      onError?.('Failed to open print document.');
    }
  }, [html, filename, disabled, busy, onPrinted, onError]);

  // Auto-trigger print when html is set and autoPrint is enabled (one-shot per html string).
  React.useEffect(() => {
    if (!autoPrint) return;
    if (!html || html.trim().length === 0) return;
    if (autoPrintedRef.current) return;
    autoPrintedRef.current = true;
    // Defer to next tick so the component is fully laid out.
    const t = setTimeout(() => {
      handlePrint();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, html, handlePrint]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handlePrint}
      disabled={disabled || busy}
      aria-label={`Print ${filename}`}
      title={`Print ${filename}`}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Printer className="h-3 w-3 mr-1" />
      )}
      {label}
    </Button>
  );
};

export default PrintButton;
