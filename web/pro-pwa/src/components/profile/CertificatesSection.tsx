
import React from "react";
import { Button } from "@/components/ui/button";
import { useCertificates } from "@/hooks/useCertificates";
import CertificateUploadDialog from "./CertificateUploadDialog";
import CertificatesList from "./CertificatesList";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

const CertificatesSection: React.FC = () => {
  const { certificates, isLoading, isUploading, uploadCertificate, deleteCertificate } = useCertificates(null);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 rounded-3xl p-6 shadow-lg border border-slate-100 mt-6">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-200/40 to-gray-200/40 rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-400 to-gray-500 rounded-2xl shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">תעודות והסמכות</h2>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/60 rounded-2xl p-4 border border-slate-200/50">
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-3xl p-6 shadow-lg border border-emerald-100 mt-6" dir="rtl">
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-xl"></div>
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-cyan-200/40 to-blue-200/40 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900">תעודות והסמכות</h2>
          </div>
          <CertificateUploadDialog onUpload={uploadCertificate} isUploading={isUploading}>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md">
              העלאת תעודה
            </Button>
          </CertificateUploadDialog>
        </div>
        
        <CertificatesList certificates={certificates} onDelete={deleteCertificate} />
      </div>
    </div>
  );
};

export default CertificatesSection;
