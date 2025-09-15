import React from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <div className="mb-6">
      <div className="bg-white/85 backdrop-blur-sm rounded-2xl p-4 shadow-soft-md border border-brand-neutral200/50">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-primary/10 text-brand-primary">
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;



