
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Receipt } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  textColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  bgColor,
  textColor = "text-gray-700"
}) => {
  const isPaymentsCard = title === "רווח נטו חודשי";
  // Format large numbers to be more readable
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return (val / 1000000).toFixed(1) + 'M';
      } else if (val >= 1000) {
        return (val / 1000).toFixed(1) + 'K';
      }
      return val.toString();
    }
    return val;
  };
  
  const formattedValue = formatValue(value);

  // Map solid colors to modern pastel gradients with glass effect
  const getModernGradientClass = (bgColor: string) => {
    switch (bgColor) {
      case "bg-blue-500":
        return "bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 backdrop-blur-md border border-blue-200/30";
      case "bg-ofair-turquoise":
        return "bg-gradient-to-br from-teal-100 via-cyan-50 to-emerald-100 backdrop-blur-md border border-teal-200/30";
      case "bg-amber-400":
        return "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 backdrop-blur-md border border-amber-200/30";
      case "bg-green-500":
        return "bg-gradient-to-br from-emerald-100 via-green-50 to-lime-100 backdrop-blur-md border border-emerald-200/30";
      default:
        return "bg-gradient-to-br from-gray-100 via-slate-50 to-gray-100 backdrop-blur-md border border-gray-200/30";
    }
  };

  // Get icon color based on the theme
  const getIconColor = (bgColor: string) => {
    switch (bgColor) {
      case "bg-blue-500":
        return "text-blue-600";
      case "bg-ofair-turquoise":
        return "text-teal-600";
      case "bg-amber-400":
        return "text-amber-600";
      case "bg-green-500":
        return "text-emerald-600";
      default:
        return "text-gray-600";
    }
  };

  // Get title color based on the theme
  const getTitleColor = (bgColor: string) => {
    switch (bgColor) {
      case "bg-blue-500":
        return "text-blue-700";
      case "bg-ofair-turquoise":
        return "text-teal-700";
      case "bg-amber-400":
        return "text-amber-700";
      case "bg-green-500":
        return "text-emerald-700";
      default:
        return "text-gray-700";
    }
  };

  // Get value color based on the theme
  const getValueColor = (bgColor: string) => {
    switch (bgColor) {
      case "bg-blue-500":
        return "text-blue-800";
      case "bg-ofair-turquoise":
        return "text-teal-800";
      case "bg-amber-400":
        return "text-amber-800";
      case "bg-green-500":
        return "text-emerald-800";
      default:
        return "text-gray-800";
    }
  };

  return (
    <div 
      className={cn(
        "stat-card relative p-4 rounded-2xl shadow-lg shadow-black/5 min-h-[120px] transition-all duration-300 hover:shadow-xl hover:shadow-black/10 hover:scale-[1.02] hover:-translate-y-1",
        getModernGradientClass(bgColor)
      )}
    >
      <div className="flex justify-between items-start h-full">
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <span className={cn("text-xs sm:text-sm font-medium leading-tight mb-1", getTitleColor(bgColor))}>
            {title}
          </span>
          <div 
            className={cn("font-bold leading-tight text-lg sm:text-xl", getValueColor(bgColor))}
          >
            {formattedValue}
          </div>
          {isPaymentsCard && (
            <div className="mt-3">
              <Link to="/payments">
                <Button variant="outline" size="sm" className="text-xs h-7 px-3 bg-white/60 backdrop-blur-sm border-white/30">
                  <Receipt className="h-3 w-3 ml-1" />
                  פרטים
                </Button>
              </Link>
            </div>
          )}
        </div>
        <div className={cn("text-2xl sm:text-3xl flex-shrink-0 p-2 rounded-xl bg-white/40 backdrop-blur-sm shadow-sm", getIconColor(bgColor))}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
