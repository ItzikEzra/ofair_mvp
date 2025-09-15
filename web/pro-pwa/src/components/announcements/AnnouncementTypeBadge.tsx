
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AnnouncementTypeBadgeProps {
  type: 'lead' | 'request';
  size?: 'default' | 'sm' | 'lg';
}

const AnnouncementTypeBadge: React.FC<AnnouncementTypeBadgeProps> = ({ type, size = 'default' }) => {
  // Determine size class based on size prop
  const sizeClass = size === 'sm' 
    ? 'text-xs px-1.5 py-0.5' 
    : size === 'lg' 
      ? 'text-sm px-3 py-1' 
      : 'text-xs px-2.5 py-0.5';

  if (type === 'lead') {
    return (
      <Badge className={cn("bg-ofair-blue text-white", sizeClass)}>ליד</Badge>
    );
  }
  
  return (
    <Badge className={cn("bg-teal-600 text-white", sizeClass)}>בקשת לקוח</Badge>
  );
};

export default AnnouncementTypeBadge;
