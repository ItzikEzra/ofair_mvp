
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, MapPin, CheckCircle } from "lucide-react";

interface ClientDetails {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

interface ClientDetailsDialogProps {
  clientDetails: ClientDetails;
  triggerButton: React.ReactNode;
}

const ClientDetailsDialog: React.FC<ClientDetailsDialogProps> = ({ clientDetails, triggerButton }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-sm w-[calc(100vw-24px)] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-center pb-1">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            פרטי הלקוח
          </DialogTitle>
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
              <div className="flex items-center bg-white/60 rounded-md p-2">
                <User className="h-3 w-3 ml-2 text-blue-600" />
                <div>
                  <span className="text-xs text-gray-500 block">שם הלקוח</span>
                  <span className="font-semibold text-gray-900 text-sm">{clientDetails.name}</span>
                </div>
              </div>
              
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
              
              {clientDetails.email && (
                <div className="flex items-center bg-white/60 rounded-md p-2">
                  <Mail className="h-3 w-3 ml-2 text-blue-600" />
                  <div>
                    <span className="text-xs text-gray-500 block">אימייל</span>
                    <a 
                      href={`mailto:${clientDetails.email}`} 
                      className="font-semibold text-blue-700 hover:text-blue-800 transition-colors text-sm"
                    >
                      {clientDetails.email}
                    </a>
                  </div>
                </div>
              )}
              
              {clientDetails.address && (
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

          {/* Call to Action */}
          <a 
            href={`tel:${clientDetails.phone}`}
            className="block bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-3 text-center text-white shadow-lg hover:from-green-600 hover:to-blue-600 transition-all duration-200 active:scale-95"
          >
            <div className="flex items-center justify-center mb-1">
              <Phone className="h-4 w-4 ml-1" />
              <span className="font-bold text-sm">צור קשר עכשיו!</span>
            </div>
            <p className="text-xs text-green-50">
              צור קשר עם הלקוח בהקדם האפשרי
            </p>
          </a>
        </div>
        
        <div className="flex justify-center pt-2">
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 px-8"
            >
              סגור
            </Button>
          </DialogTrigger>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientDetailsDialog;
