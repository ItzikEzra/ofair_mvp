import React from "react";
interface AuthHeaderProps {
  title: string;
  subtitle: string;
}
const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle
}) => {
  return <div className="text-center mb-6">
      
      <p className="text-gray-500">{subtitle}</p>
    </div>;
};
export default AuthHeader;