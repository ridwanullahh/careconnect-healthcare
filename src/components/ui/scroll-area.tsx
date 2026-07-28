import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Lightweight ScrollArea component. Wraps children in a div with overflow-auto
 * and custom scrollbar styling (Tailwind + inline webkit/firefox scrollbar CSS).
 */
const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'vertical' | 'horizontal' | 'both';
  }
>(({ className, children, orientation = 'vertical', ...props }, ref) => {
  const overflowClass =
    orientation === 'vertical'
      ? 'overflow-y-auto overflow-x-hidden'
      : orientation === 'horizontal'
        ? 'overflow-x-auto overflow-y-hidden'
        : 'overflow-auto';

  return (
    <div
      ref={ref}
      className={cn(
        'relative',
        overflowClass,
        // Custom scrollbar (webkit)
        '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2',
        '[&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-track]:rounded',
        '[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded',
        '[&::-webkit-scrollbar-thumb:hover]:bg-gray-400',
        // Firefox
        '[scrollbar-width:thin] [scrollbar-color:theme(colors.gray.300)_transparent]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
export default ScrollArea;
