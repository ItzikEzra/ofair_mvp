import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface ExpandableTextProps {
  text: string;
  wordLimit?: number;
  className?: string;
  buttonClassName?: string;
  showButtonInline?: boolean;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  wordLimit = 12,
  className = "",
  buttonClassName = "",
  showButtonInline = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text) return null;
  
  const words = text.split(' ');
  const shouldTruncate = words.length > wordLimit;
  const displayText = isExpanded ? text : words.slice(0, wordLimit).join(' ');
  
  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }
  
  return (
    <div className={cn("transition-all duration-300", className)}>
      <span>
        {displayText}
        {!isExpanded && shouldTruncate && "..."}
      </span>
      
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "text-ofair-blue text-xs font-medium hover:text-ofair-blue/80 transition-colors",
            showButtonInline ? "mr-1" : "block mt-1",
            buttonClassName
          )}
        >
          {isExpanded ? "פחות" : "המשך"}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;