
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Phone, Calendar, User, MapPin, FileText, Clock, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

interface ClientDetails {
  name?: string;
  phone?: string;
  address?: string;
  date?: string;
  time?: string;
  workDate?: string;
  workTime?: string;
  notes?: string;
}

interface ClientDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientDetails: ClientDetails | null;
  proposalTitle?: string;
  notificationType?: string;
}

// Format date properly
const formatDate = (dateString: string) => {
  try {
    // Handle different date formats
    if (dateString.includes('T')) {
      // ISO format
      const date = parseISO(dateString);
      return format(date, 'dd/MM/yyyy', { locale: he });
    } else if (dateString.includes('-')) {
      // YYYY-MM-DD format
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    return dateString;
  } catch (error) {
    return dateString;
  }
};

// Format time properly
const formatTime = (timeString: string) => {
  try {
    if (timeString.includes('T')) {
      // ISO format with timezone
      const date = parseISO(timeString);
      return format(date, 'HH:mm', { locale: he });
    } else if (timeString.includes(':')) {
      // Already in HH:MM format
      return timeString.slice(0, 5); // Remove seconds if present
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
};

const ClientDetailsDialog: React.FC<ClientDetailsDialogProps> = ({
  open,
  onOpenChange,
  clientDetails,
  proposalTitle,
  notificationType
}) => {
  if (!clientDetails) {
    return null;
  }

  const isDirectInquiry = notificationType === "new_direct_inquiry";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[calc(100vw-24px)] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-1">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            🎉 ההצעה שלך התקבלה
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-1 text-sm">
            {proposalTitle && (
              <span className="font-medium text-ofair-blue">"{proposalTitle}"</span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 mt-3">
          {/* Contact Information Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 mr-2 text-sm">פרטי התקשרות</h3>
            </div>
            <div className="space-y-2">
              {clientDetails.name && (
                <div className="flex items-center bg-white/60 rounded-md p-2">
                  <User className="h-3 w-3 ml-2 text-blue-600" />
                  <div>
                    <span className="text-xs text-gray-500 block">שם הלקוח</span>
                    <span className="font-semibold text-gray-900 text-sm">{clientDetails.name}</span>
                  </div>
                </div>
              )}
              {clientDetails.phone && (
                <div className="flex items-center bg-white/60 rounded-md p-2">
                  <Phone className="h-3 w-3 ml-2 text-blue-600" />
                  <div>
                    <span className="text-xs text-gray-500 block">טלפון</span>
                    <a 
                      href={`tel:${clientDetails.phone}`} 
                      className="font-semibold text-blue-700 hover:text-blue-800 transition-colors text-sm"
                      dir="ltr"
                    >
                      {clientDetails.phone}
                    </a>
                  </div>
                </div>
              )}
              {clientDetails.address && !isDirectInquiry && (
                <div className="flex items-center bg-white/60 rounded-md p-2">
                  <MapPin className="h-3 w-3 ml-2 text-blue-600" />
                  <div>
                    <span className="text-xs text-gray-500 block">כתובת</span>
                    <span className="font-semibold text-gray-900 text-sm">{clientDetails.address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Work Schedule Card */}
          {(clientDetails.date || clientDetails.workDate || clientDetails.workTime) && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mr-2 text-sm">מועד העבודה</h3>
              </div>
              <div className="space-y-2">
                {(clientDetails.date || clientDetails.workDate) && (
                  <div className="flex items-center bg-white/60 rounded-md p-2">
                    <Calendar className="h-3 w-3 ml-2 text-purple-600" />
                    <div>
                      <span className="text-xs text-gray-500 block">תאריך</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {formatDate(clientDetails.date || clientDetails.workDate || '')}
                      </span>
                    </div>
                  </div>
                )}
                {/* Show time only for leads (workTime) */}
                {clientDetails.workTime && (
                  <div className="flex items-center bg-white/60 rounded-md p-2">
                    <Clock className="h-3 w-3 ml-2 text-purple-600" />
                    <div>
                      <span className="text-xs text-gray-500 block">שעה</span>
                      <span className="font-semibold text-gray-900 text-sm">
                        {clientDetails.workTime}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Notes Card */}
          {clientDetails.notes && (
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3 shadow-sm">
              <div className="flex items-center mb-2">
                <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
                  <FileText className="h-3 w-3 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mr-2 text-sm">הערות</h3>
              </div>
              <div className="bg-white/60 rounded-md p-2">
                <p className="text-gray-800 leading-relaxed text-sm">{clientDetails.notes}</p>
              </div>
            </div>
          )}
          
          {/* Call to Action */}
          {clientDetails.phone && (
            <a 
              href={`tel:${clientDetails.phone}`}
              className="block bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-3 text-center text-white shadow-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 active:scale-95"
            >
              <div className="flex items-center justify-center mb-1">
                <Phone className="h-4 w-4 ml-1" />
                <span className="font-bold text-sm">צור קשר עכשיו!</span>
              </div>
              <p className="text-xs text-green-50">
                צור קשר עם הלקוח בהקדם האפשרי לתיאום העבודה
              </p>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailsDialog;
