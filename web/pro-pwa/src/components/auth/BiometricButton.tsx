
import React from 'react';
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";

interface BiometricButtonProps {
  isLoading: boolean;
  onClick: () => void;
}

const BiometricButton = ({ isLoading, onClick }: BiometricButtonProps) => {
  return (
    <div className="mt-6">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">או התחבר באמצעות</span>
        </div>
      </div>
      
      <div className="mt-4">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onClick}
          disabled={isLoading}
        >
          <Fingerprint className="h-5 w-5 ml-2" />
          התחברות עם טביעת אצבע
        </Button>
      </div>
    </div>
  );
};

export default BiometricButton;
