
import React from "react";

const ProjectsLoadingState: React.FC = () => {
  return (
    <div className="space-y-4" dir="rtl">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gradient-to-br from-white via-gray-50 to-white backdrop-blur-sm rounded-2xl p-5 shadow-lg shadow-black/5 border border-gray-200/60 animate-pulse">
          <div className="flex justify-between items-start mb-3">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded w-20"></div>
          </div>
          
          <div className="mb-4 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsLoadingState;
