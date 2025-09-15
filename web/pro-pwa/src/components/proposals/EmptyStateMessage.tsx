
import React from "react";
import { Button } from "@/components/ui/button";
import { Box } from "lucide-react";
import { Link } from "react-router-dom";

interface EmptyStateMessageProps {
  title: string;
  description: string;
  actionText?: string;
  actionPath?: string;
}

const EmptyStateMessage: React.FC<EmptyStateMessageProps> = ({
  title,
  description,
  actionText,
  actionPath
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-lg p-3">
      <Box className="h-7 w-7 text-gray-400 mb-2" />
      <h3 className="font-bold text-sm md:text-base mb-1 text-center">{title}</h3>
      <p className="text-gray-600 text-center text-xs md:text-sm mb-3">{description}</p>
      {actionText && actionPath && (
        <Link to={actionPath}>
          <Button variant="outline" size="sm" className="text-xs md:text-sm">{actionText}</Button>
        </Link>
      )}
    </div>
  );
};

export default EmptyStateMessage;
