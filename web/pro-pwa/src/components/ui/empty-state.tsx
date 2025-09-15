import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center bg-white/85 backdrop-blur-sm rounded-2xl p-8 shadow-soft-md border border-brand-neutral200/50 max-w-md">
        {icon && (
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-slate-600 text-white">
            {icon}
          </div>
        )}
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        {description && <p className="text-slate-600 mb-4 text-sm">{description}</p>}
        {action}
      </div>
    </div>
  );
};

export default EmptyState;



