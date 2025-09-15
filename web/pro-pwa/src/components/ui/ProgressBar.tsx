
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  showValue?: boolean;
}

const ProgressBar = ({
  value,
  max,
  label,
  color = "bg-ofair-turquoise",
  showValue = true,
}: ProgressBarProps) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">{label}</span>
          {showValue && (
            <span className="text-sm font-medium">{percentage}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={cn("h-2.5 rounded-full", color)}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
