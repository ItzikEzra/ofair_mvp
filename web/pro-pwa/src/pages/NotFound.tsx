
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4" dir="rtl">
      <div className="text-center max-w-md w-full">
        <div className="mb-8">
          <img 
            src="/lovable-uploads/49a7d57c-2059-4554-b034-1596cca4f124.png" 
            alt="Ofair Logo" 
            className="h-20 mx-auto mb-6"
          />
        </div>
        
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h1 className="text-6xl font-bold text-ofair-blue mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            עמוד לא נמצא
          </h2>
          <p className="text-gray-600 mb-8">
            מצטערים, הדף שחיפשת לא נמצא או שהוסר מהמערכת
          </p>
          
          <div className="space-y-4">
            <Link to="/dashboard">
              <Button className="w-full bg-ofair-blue hover:bg-blue-700 text-white">
                <Home className="ml-2" size={20} />
                חזור לאזור האישי
              </Button>
            </Link>
            
            <Link to="/">
              <Button variant="outline" className="w-full">
                <ArrowRight className="ml-2" size={20} />
                חזור לדף הבית
              </Button>
            </Link>
          </div>
        </div>
        
        <p className="text-sm text-gray-500 mt-6">
          אם הבעיה נמשכת, אנא צור קשר עם התמיכה
        </p>
      </div>
    </div>
  );
};

export default NotFound;
