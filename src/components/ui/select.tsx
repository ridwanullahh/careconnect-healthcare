import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Lightweight shadcn-style Select compound component built on a native <select>.
 * Mirrors the shadcn API (Select, SelectTrigger, SelectValue, SelectContent,
 * SelectItem, SelectGroup, SelectLabel) but without a Radix dependency.
 *
 * SelectContent/SelectItem are renderless: SelectItem registers itself with the
 * Select context, and SelectTrigger renders the actual <select> element with the
 * collected options. SelectValue registers the placeholder.
 */

interface SelectItemDef {
  value: string;
  label: string;
}

interface SelectContextValue {
  value: string | undefined;
  onValueChange: ((value: string) => void) | undefined;
  items: SelectItemDef[];
  registerItem: (value: string, label: string) => () => void;
  placeholder: React.ReactNode;
  setPlaceholder: (p: React.ReactNode) => void;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

const useSelectContext = () => {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error('Select sub-components must be rendered inside <Select>');
  }
  return ctx;
};

const Select = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  }
>(({ value, defaultValue, onValueChange, disabled, children, ...props }, ref) => {
  const [items, setItems] = React.useState<SelectItemDef[]>([]);
  const [placeholder, setPlaceholder] = React.useState<React.ReactNode>(undefined);

  // Uncontrolled fallback when no `value` prop is supplied.
  const [internalValue, setInternalValue] = React.useState<string | undefined>(defaultValue);
  const currentValue = value !== undefined ? value : internalValue;

  const registerItem = React.useCallback((itemValue: string, label: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.value === itemValue);
      if (existing) {
        if (existing.label === label) return prev; // No change, avoid re-render
        // Update label in place rather than remove + re-add (avoids flicker).
        return prev.map((i) => (i.value === itemValue ? { ...i, label } : i));
      }
      return [...prev, { value: itemValue, label }];
    });
    return () => {
      setItems((prev) => prev.filter((i) => i.value !== itemValue));
    };
  }, []);

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    },
    [value, onValueChange]
  );

  const contextValue = React.useMemo<SelectContextValue>(
    () => ({
      value: currentValue,
      onValueChange: handleValueChange,
      items,
      registerItem,
      placeholder,
      setPlaceholder,
      disabled,
    }),
    [currentValue, handleValueChange, items, registerItem, placeholder, disabled]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <div ref={ref} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
});
Select.displayName = 'Select';

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }
>(({ className, children, disabled, ...props }, ref) => {
  const ctx = useSelectContext();
  const isDisabled = disabled || ctx.disabled;
  const hasValue = ctx.value !== undefined && ctx.value !== '';

  return (
    <div className="relative">
      <select
        ref={ref as unknown as React.Ref<HTMLSelectElement>}
        value={ctx.value ?? ''}
        onChange={(e) => ctx.onValueChange?.(e.target.value)}
        disabled={isDisabled}
        className={cn(
          'flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'border-gray-300 bg-white text-gray-900 focus:border-green-500 focus:ring-green-500',
          !hasValue && 'text-gray-400',
          className
        )}
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
      >
        {!hasValue && ctx.placeholder && (
          <option value="" disabled>
            {typeof ctx.placeholder === 'string' ? ctx.placeholder : 'Select...'}
          </option>
        )}
        {ctx.items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      {/* children (SelectValue) are not rendered visually; native select handles display */}
      <span className="sr-only">{children}</span>
    </div>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    placeholder?: React.ReactNode;
  }
>(({ placeholder }, ref) => {
  const { setPlaceholder } = useSelectContext();
  React.useEffect(() => {
    if (placeholder !== undefined) {
      setPlaceholder(placeholder);
    }
  }, [placeholder, setPlaceholder]);
  return <span ref={ref} className="sr-only" />;
});
SelectValue.displayName = 'SelectValue';

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children }, ref) => {
  // Renderless: SelectItem children register themselves via context.
  return (
    <div ref={ref} className="hidden">
      {children}
    </div>
  );
});
SelectContent.displayName = 'SelectContent';

const SelectGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, ...props }, ref) => (
  <div ref={ref} {...props}>
    {children}
  </div>
));
SelectGroup.displayName = 'SelectGroup';

const SelectLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-xs font-semibold text-gray-500', className)}
    {...props}
  />
));
SelectLabel.displayName = 'SelectLabel';

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement> & {
    value: string;
    children: React.ReactNode;
  }
>(({ value, children, disabled }, _ref) => {
  const { registerItem } = useSelectContext();
  const label = typeof children === 'string' ? children : String(children ?? '');

  // Register the item with the Select context. registerItem is stable
  // (wrapped in useCallback with []), so this only re-runs when value/label
  // change — NOT on every ctx change (which would cause an infinite loop
  // because registerItem itself updates the items state inside ctx).
  React.useEffect(() => {
    if (value === undefined) return;
    return registerItem(value, label);
  }, [value, label, registerItem]);

  // Render nothing — the <option> is rendered by SelectTrigger from context state.
  return disabled ? null : null;
});
SelectItem.displayName = 'SelectItem';

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
};

export default Select;
