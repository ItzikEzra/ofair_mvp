
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/AuthContext';
import { useAuthRefresh } from '@/hooks/useAuthRefresh';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isLoggedIn, isLoading } = useAuth();
  const location = useLocation();
  
  // Auto-refresh token functionality
  useAuthRefresh();
  
  console.log("ProtectedRoute: Auth state", { isLoggedIn, isLoading, path: location.pathname });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <img 
            src="/lovable-uploads/49a7d57c-2059-4554-b034-1596cca4f124.png" 
            alt="Ofair Logo" 
            className="h-20 mb-6 mx-auto"
          />
          <div className="inline-block animate-spin h-8 w-8 border-4 border-t-[#003399] border-r-transparent border-b-transparent border-l-transparent rounded-full mb-4"></div>
          <p className="text-gray-500">מאמת פרטי התחברות...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    console.log("ProtectedRoute: User not logged in, redirecting to auth");
    return <Navigate to="/auth" replace />;
  }

  console.log("ProtectedRoute: User is logged in, rendering children");
  return <>{children}</>;
};

export default ProtectedRoute;
