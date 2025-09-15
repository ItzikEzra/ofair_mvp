import React from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, ExternalLink, Trash2, Download } from "lucide-react";
import { Certificate } from "@/types/certificates";

interface CertificatesListProps {
  certificates: Certificate[];
  onDelete: (certificateId: string) => Promise<boolean>;
}

const CertificatesList: React.FC<CertificatesListProps> = ({
  certificates,
  onDelete
}) => {
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    const mb = bytes / 1024 / 1024;
    return `(${mb.toFixed(2)} MB)`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center">
          <FileText size={24} className="text-teal-600" />
        </div>
        <p className="text-emerald-700 font-medium">אין עדיין תעודות מועלות</p>
        <p className="text-emerald-600 text-sm mt-1">העלה תעודות כדי להציג את הכישורים המקצועיים שלך</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-1">
      {certificates.map((certificate, index) => {
        const colors = [
          {
            bg: "from-amber-50 via-orange-50 to-red-50",
            border: "border-amber-200",
            iconBg: "from-amber-400 to-orange-500",
            text: "text-amber-900",
            accent: "from-amber-200/40 to-orange-200/40"
          },
          {
            bg: "from-purple-50 via-pink-50 to-rose-50",
            border: "border-purple-200",
            iconBg: "from-purple-400 to-pink-500",
            text: "text-purple-900",
            accent: "from-purple-200/40 to-pink-200/40"
          },
          {
            bg: "from-blue-50 via-indigo-50 to-violet-50",
            border: "border-blue-200",
            iconBg: "from-blue-400 to-indigo-500",
            text: "text-blue-900",
            accent: "from-blue-200/40 to-indigo-200/40"
          }
        ];
        
        const color = colors[index % colors.length];
        
        return (
          <div 
            key={certificate.id} 
            className={`relative overflow-hidden bg-gradient-to-br ${color.bg} rounded-xl p-3 shadow-sm border ${color.border} hover:shadow-md transition-all duration-300`}
          >
            <div className={`absolute -top-1 -right-1 w-12 h-12 bg-gradient-to-br ${color.accent} rounded-full blur-lg`}></div>
            
            <div className="relative z-10 flex items-start gap-3">
              <div className={`flex items-center justify-center w-9 h-9 bg-gradient-to-br ${color.iconBg} rounded-lg shadow-sm flex-shrink-0 mt-0.5`}>
                <FileText className="w-4 h-4 text-white" />
              </div>
              
              <div className="flex-1 min-w-0 pr-2">
                <h4 className={`font-semibold ${color.text} text-base truncate leading-tight`}>
                  {certificate.certificate_name}
                </h4>
                <p className={`text-xs ${color.text} opacity-80 truncate mt-0.5`}>
                  {certificate.file_name} {formatFileSize(certificate.file_size)}
                </p>
                <p className={`text-xs ${color.text} opacity-60 mt-0.5`}>
                  הועלה ב-{formatDate(certificate.upload_date)}
                </p>
              </div>
              
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(certificate.certificate_url, '_blank')}
                  className="bg-white/80 border-white/50 hover:bg-white/90 text-gray-700 shadow-sm h-7 px-2 text-xs"
                >
                  <ExternalLink size={12} />
                  <span className="hidden xs:inline ml-1">צפייה</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = certificate.certificate_url;
                    link.download = certificate.file_name;
                    link.click();
                  }}
                  className="bg-white/80 border-white/50 hover:bg-white/90 text-gray-700 shadow-sm h-7 px-2 text-xs"
                >
                  <Download size={12} />
                  <span className="hidden xs:inline ml-1">הורדה</span>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="bg-red-50/80 border-red-200/50 hover:bg-red-100/80 text-red-600 shadow-sm h-7 px-2"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl" className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-lg">מחיקת תעודה</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm">
                        האם אתה בטוח שברצונך למחוק את התעודה "{certificate.certificate_name}"?
                        פעולה זו אינה ניתנת לביטול.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="text-sm">ביטול</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(certificate.id)}
                        className="bg-red-600 hover:bg-red-700 text-sm"
                      >
                        מחק
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CertificatesList;