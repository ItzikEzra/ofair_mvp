
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    console.log("Index: Auth state", { isLoggedIn, isLoading });
    
    if (!isLoading) {
      if (isLoggedIn) {
        console.log("Index: User is logged in, redirecting to dashboard");
        navigate("/dashboard", { replace: true });
      } else {
        console.log("Index: User not logged in, redirecting to auth");
        navigate("/auth", { replace: true });
      }
    }
  }, [isLoggedIn, isLoading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <img 
          src="/lovable-uploads/49a7d57c-2059-4554-b034-1596cca4f124.png" 
          alt="Ofair Logo" 
          className="h-20 mb-6 mx-auto"
        />
        <div className="inline-block animate-spin h-8 w-8 border-4 border-t-[#003399] border-r-transparent border-b-transparent border-l-transparent rounded-full mb-4"></div>
        <p className="text-gray-500">טוען...</p>
      </div>
    </div>
  );
};

export default Index;
