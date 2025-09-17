import React from 'react';
import { cn } from '@/lib/utils';

interface ProfileBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'admin';
}

const ProfileBadge = React.forwardRef<HTMLSpanElement, ProfileBadgeProps>(
  ({ children, className, variant = 'default', ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors';

    const variantClasses = {
      default: 'bg-transparent border-2 border-[#A5D8FF] text-white',
      outline: 'bg-transparent border-2 border-[#A5D8FF] text-white',
      admin: 'bg-transparent border-2 border-[#A5D8FF] text-white font-bold',
    };

    return (
      <span
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

ProfileBadge.displayName = 'ProfileBadge';

export { ProfileBadge };
export type { ProfileBadgeProps };
