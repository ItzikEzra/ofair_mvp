
import React from "react";

interface FormFieldWrapperProps {
  children: React.ReactNode;
  hasError?: boolean;
  errorMessage?: string;
}

const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  children,
  hasError = false,
  errorMessage
}) => {
  return (
    <div className="mb-4">
      {children}
      {hasError && errorMessage && (
        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default FormFieldWrapper;
