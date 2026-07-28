import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Checkbox component built on a styled button with a Check icon (visible when
 * checked). The actual <input type="checkbox"> is hidden but kept in the DOM
 * for accessibility and form integration.
 */
const Checkbox = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'value'> & {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    name?: string;
    value?: string;
  }
>(({ className, checked, defaultChecked, onCheckedChange, name, value, disabled, ...props }, ref) => {
  const [internalChecked, setInternalChecked] = React.useState<boolean>(!!defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? (checked as boolean) : internalChecked;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  };

  return (
    <>
      {name && (
        <input
          type="checkbox"
          name={name}
          value={value}
          checked={isChecked}
          readOnly
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          toggle();
        }}
        className={cn(
          'peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          isChecked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-white hover:border-green-500',
          'bg-green-600 hover:bg-green-700',
          className
        )}
        {...props}
      >
        {isChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
      </button>
    </>
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
export default Checkbox;
