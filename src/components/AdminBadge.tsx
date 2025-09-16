import { Badge } from '@/components/ui/badge';

interface AdminBadgeProps {
  className?: string;
}

export default function AdminBadge({ className = '' }: AdminBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`text-yellow-400 border-yellow-400 ml-1 text-[10px] px-1 rounded-none py-0 ${className}`}
    >
      ADMIN
    </Badge>
  );
}
