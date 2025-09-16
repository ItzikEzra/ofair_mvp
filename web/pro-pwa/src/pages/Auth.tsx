import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AuthHeader from "@/components/auth/AuthHeader";
import OTPLoginForm from "@/components/auth/OTPLoginForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ProfessionalRegistrationForm from "@/components/auth/ProfessionalRegistrationForm";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useRegistration } from "@/hooks/useRegistration";

const Auth = () => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get("reset") === "true";
  const isRegistered = searchParams.get("registered") === "true";
  const [activeTab, setActiveTab] = useState(isRegistered ? "login" : "login");
  const {
    isLoggedIn,
    isLoading
  } = useAuth();
  const { registerProfessional, isLoading: isRegistering } = useRegistration();
  const redirectAttemptedRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRedirectAttemptsRef = useRef(3);
  const redirectAttemptsRef = useRef(0);

  // פירוק התלות במידע מאוחסן כדי למנוע לולאות אינסופיות
  useEffect(() => {
    // נקה מהזיכרון המקומי כל מידע בעייתי שעלול לגרום ללולאות הפניה
    if (window.location.pathname === '/auth') {
      try {
        // בדיקה אם יש דגלים לניווט אוטומטי שלא נוקו כראוי
        if (localStorage.getItem("redirectAttempted") === "true") {
          localStorage.removeItem("redirectAttempted");
        }

        // אם במסך ההתחברות ויש דגל התחברות, יתכן שמשהו לא נוקה כראוי
        if (localStorage.getItem("isInitializing") === "true") {
          localStorage.removeItem("isInitializing");
        }
      } catch (e) {
        console.error("Error cleaning up localStorage:", e);
      }
    }
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    // Use a ref to track if we've already attempted a redirect to prevent loops
    if (redirectAttemptedRef.current) return;

    // Circuit breaker to prevent infinite loops
    if (redirectAttemptsRef.current >= maxRedirectAttemptsRef.current) {
      console.error("Auth: Too many redirect attempts, stopping redirect attempts");
      return;
    }
    const checkAuthState = async () => {
      try {
        // Only redirect if we're definitely logged in
        if (isLoggedIn === true) {
          // Explicitly check for true
          console.log("Found existing session, redirecting to dashboard");
          redirectAttemptedRef.current = true;
          redirectAttemptsRef.current += 1;

          // Use timeout for more reliable redirect
          redirectTimeoutRef.current = setTimeout(() => {
            navigate('/dashboard', {
              replace: true
            });
          }, 800);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };
    if (!isLoading && isLoggedIn !== null) {
      // Add a slight delay to prevent immediate rechecks
      const timer = setTimeout(() => {
        checkAuthState();
      }, 800);
      redirectTimeoutRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [navigate, isLoggedIn, isLoading]);
  useEffect(() => {
    if (isReset || window.location.hash.includes('type=recovery')) {
      setActiveTab("reset");
    } else if (isRegistered) {
      setActiveTab("login");
      toast({
        title: "הרשמה הושלמה בהצלחה!",
        description: "כעת ניתן להתחבר עם מספר הטלפון שלך",
      });
    }
  }, [isReset, isRegistered, toast]);
  if (isLoading) {
    return <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 text-foreground p-4 rtl">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 left-1/4 w-72 h-72 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-1/3 w-56 h-56 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
        </div>
        
        <ThemeToggle />
        <div className="text-center">
          <img src="/lovable-uploads/49a7d57c-2059-4554-b034-1596cca4f124.png" alt="Ofair Logo" className="h-20 mb-6 mx-auto" />
          <div className="inline-block animate-spin h-8 w-8 border-4 border-t-[#003399] border-r-transparent border-b-transparent border-l-transparent rounded-full mb-4"></div>
          <p className="text-muted-foreground">טוען...</p>
        </div>
      </div>;
  }
  if (activeTab === "reset") {
    return <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 text-foreground p-4 rtl">
        {/* Floating background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-32 right-1/4 w-72 h-72 bg-gradient-to-br from-red-400/15 to-orange-400/15 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl"></div>
        </div>
        
        <ThemeToggle />
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-blue-500/10 p-8 border-0">
          <div className="flex justify-center mb-6">
            <img src="/lovable-uploads/49a7d57c-2059-4554-b034-1596cca4f124.png" alt="Ofair Logo" className="h-16 mb-2" />
          </div>
          <AuthHeader title="Pro Work Hub" subtitle="איפוס סיסמה" />
          <ResetPasswordForm />
        </div>
      </div>;
  }
  return <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 text-foreground p-4 rtl">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-32 left-1/4 w-72 h-72 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-1/3 w-56 h-56 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 left-16 w-40 h-40 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-blue-500/10 p-8 px-0 border-0">
        <div className="flex justify-center mb-6 py-0">
          <img src="/lovable-uploads/49a7d57c-2059-4554-b034-1596cca4f124.png" alt="Ofair Logo" className="h-40 mb-2 object-contain" />
        </div>
        <div className="px-8">
          <AuthHeader title="Pro Work Hub" subtitle="מערכת לניהול עסק מקצועי" />
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-gray-100/50 backdrop-blur-sm rounded-2xl p-1">
              <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">התחברות</TabsTrigger>
              <TabsTrigger value="register" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md">הרשמה</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="text-center mb-6 text-gray-600 leading-relaxed bg-blue-50/50 backdrop-blur-sm p-4 rounded-2xl border border-blue-100">
                אם נרשמתם בדף הנחיתה ועברתם אימות, הכניסו את הטלפון שלכם לקבלת קוד חד פעמי
              </div>
              <OTPLoginForm />
            </TabsContent>
            
            <TabsContent value="register">
              <div className="text-center mb-6 text-gray-600 leading-relaxed bg-green-50/50 backdrop-blur-sm p-4 rounded-2xl border border-green-100">
                הירשמו כמקצוענים במערכת עופר ותתחילו לקבל הזדמנויות עבודה
              </div>
              <ProfessionalRegistrationForm
                onSuccess={registerProfessional}
                isLoading={isRegistering}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>;
};
export default Auth;