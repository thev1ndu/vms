'use client';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface StableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
}

export default function StableDialog({
  open,
  onOpenChange,
  trigger,
  title,
  children,
  contentClassName,
  headerClassName,
  titleClassName,
}: StableDialogProps) {
  useEffect(() => {
    if (open) {
      // Store original body styles
      const originalPaddingLeft = document.body.style.paddingLeft;
      const originalPaddingRight = document.body.style.paddingRight;
      const originalMarginLeft = document.body.style.marginLeft;
      const originalMarginRight = document.body.style.marginRight;
      const originalWidth = document.body.style.width;
      const originalMaxWidth = document.body.style.maxWidth;

      // Force our desired styles
      document.body.style.paddingLeft = '5vh';
      document.body.style.paddingRight = '5vh';
      document.body.style.marginLeft = '0px';
      document.body.style.marginRight = '0px';
      document.body.style.width = '100%';
      document.body.style.maxWidth = '100%';

      return () => {
        // Restore original styles when dialog closes
        document.body.style.paddingLeft = originalPaddingLeft;
        document.body.style.paddingRight = originalPaddingRight;
        document.body.style.marginLeft = originalMarginLeft;
        document.body.style.marginRight = originalMarginRight;
        document.body.style.width = originalWidth;
        document.body.style.maxWidth = originalMaxWidth;
      };
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={contentClassName}>
        <DialogHeader className={headerClassName}>
          <DialogTitle className={titleClassName}>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
