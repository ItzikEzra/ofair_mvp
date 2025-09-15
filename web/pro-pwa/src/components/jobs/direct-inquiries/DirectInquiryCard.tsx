
import React from "react";
import { User, Phone, Calendar, Wrench, Check, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DirectInquiryType } from "@/types/jobs";
import ClientDetailsDialog from "@/components/dialogs/ClientDetailsDialog";

interface DirectInquiryCardProps {
  inquiry: DirectInquiryType;
  onCall: (phoneNumber: string) => void;
  onTalkedToClient: (id: string | number, clientName: string) => void;
}

const DirectInquiryCard: React.FC<DirectInquiryCardProps> = ({ 
  inquiry, 
  onCall,
  onTalkedToClient
}) => {
  const clientDetails = {
    name: inquiry.client,
    phone: inquiry.phoneNumber,
    email: undefined,
    address: undefined
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <User size={18} className="text-gray-500" />
          <h3 className="font-bold text-lg">{inquiry.client}</h3>
        </div>
        {inquiry.isClosed ? (
          <div className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full flex items-center">
            <Check size={14} className="mr-1" />
            נסגר
          </div>
        ) : inquiry.isContacted ? (
          <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full flex items-center">
            <Phone size={14} className="mr-1" />
            יצרתי קשר
          </div>
        ) : (
          <div className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
            חדש
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-gray-500" />
          <a 
            href={`tel:${inquiry.phoneNumber}`} 
            className="text-ofair-blue font-medium hover:underline"
          >
            {inquiry.phoneNumber}
          </a>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <span className="text-sm">{inquiry.date}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Wrench size={16} className="text-gray-500" />
        <span className="text-sm font-medium">שירות: {inquiry.service}</span>
      </div>
      
      {!inquiry.isClosed && (
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <ClientDetailsDialog
            clientDetails={clientDetails}
            triggerButton={<Button variant="outline" size="sm">הצג פרטי לקוח</Button>}
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onTalkedToClient(inquiry.id, inquiry.client)}
            className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          >
            <MessageCircle size={16} className="mr-1" />
            דיברתי איתו
          </Button>
        </div>
      )}
    </div>
  );
};

export default DirectInquiryCard;
