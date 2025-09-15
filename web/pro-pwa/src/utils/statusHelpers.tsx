
import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Calendar } from "lucide-react";

export const getStatusBadge = (status: string) => {
  const baseClasses = "text-xs px-3 py-1.5 whitespace-nowrap flex items-center gap-1.5 min-w-fit backdrop-blur-sm";
  
  switch (status) {
    case 'pending':
    case 'new':
    case 'חדש':
      return (
        <Badge variant="outline" className={`bg-amber-500/10 text-amber-600 border-amber-500/20 ${baseClasses}`}>
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">{status === 'new' || status === 'חדש' ? 'חדש' : 'ממתין'}</span>
        </Badge>
      );
    case 'accepted':
    case 'approved':
      return (
        <Badge variant="outline" className={`bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ${baseClasses}`}>
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">{status === 'accepted' ? 'התקבל' : 'אושר'}</span>
        </Badge>
      );
    case 'contacted':
    case 'יצרתי קשר':
      return (
        <Badge variant="outline" className={`bg-blue-500/10 text-blue-600 border-blue-500/20 ${baseClasses}`}>
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">יצרתי קשר</span>
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className={`bg-red-500/10 text-red-600 border-red-500/20 ${baseClasses}`}>
          <XCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">נדחה</span>
        </Badge>
      );
    case 'scheduled':
      return (
        <Badge variant="outline" className={`bg-blue-500/10 text-blue-600 border-blue-500/20 ${baseClasses}`}>
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">מתוזמן</span>
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className={`bg-purple-500/10 text-purple-600 border-purple-500/20 ${baseClasses}`}>
          <CheckCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">הושלם</span>
        </Badge>
      );
    case 'active':
    case 'in_progress':
      return (
        <Badge variant="outline" className={`bg-green-500/10 text-green-600 border-green-500/20 ${baseClasses}`}>
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">{status === 'active' ? 'פעיל' : 'בביצוע'}</span>
        </Badge>
      );
    case 'on_hold':
    case 'on-hold':
      return (
        <Badge variant="outline" className={`bg-orange-500/10 text-orange-600 border-orange-500/20 ${baseClasses}`}>
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">מושהה</span>
        </Badge>
      );
    case 'not_started':
      return (
        <Badge variant="outline" className={`bg-gray-500/10 text-gray-600 border-gray-500/20 ${baseClasses}`}>
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">טרם התחיל</span>
        </Badge>
      );
    case 'cancelled':
    case 'closed':
    case 'נסגר':
      return (
        <Badge variant="outline" className={`bg-gray-500/10 text-gray-600 border-gray-500/20 ${baseClasses}`}>
          <XCircle className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0">{status === 'closed' || status === 'נסגר' ? 'נסגר' : 'בוטל'}</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`bg-gray-500/10 text-gray-600 border-gray-500/20 ${baseClasses}`}>
          <span className="flex-shrink-0">{status}</span>
        </Badge>
      );
  }
};
