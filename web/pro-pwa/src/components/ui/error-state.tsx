import React from "react";

interface ErrorStateProps {
  message: string;
  retry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ message, retry }) => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center bg-red-50/90 backdrop-blur-sm rounded-2xl p-8 shadow-soft-md border border-red-200/70 max-w-md">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-500 text-white text-2xl">⚠</div>
        <p className="text-red-700 text-base font-medium mb-4">{message}</p>
        {retry && (
          <button onClick={retry} className="px-4 py-2 rounded-xl border bg-white hover:bg-red-50 text-red-700">
            נסה שנית
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;



