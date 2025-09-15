import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import AuthHeader from "@/components/auth/AuthHeader";
import OTPLoginForm from "@/components/auth/OTPLoginForm";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
const Auth = () => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get("reset") === "true";
  const [activeTab, setActiveTab] = useState("login");
  const {
    isLoggedIn,
    isLoading
  } = useAuth();
  const redirectAttemptedRef = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRedirectAttemptsRef = useRef(3);
  const redirectAttemptsRef = useRef(0);
  const [testPhone, setTestPhone] = useState("0545308505");

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
    }
  }, [isReset]);
  const testEnvs = async () => {
    console.log('Testing environment variables...');
    const {
      data,
      error
    } = await supabase.functions.invoke('test-envs');
    if (error) {
      console.error('Error testing envs:', error);
      toast({
        title: "שגיאה בבדיקת משתני סביבה",
        description: `אירעה שגיאה: ${error.message}`,
        variant: "destructive"
      });
    } else {
      console.log('Env test results:', data);
      const allSet = data.SUPABASE_URL && data.SUPABASE_SERVICE_ROLE_KEY && data.SMS_019_API_TOKEN && data.SMS_019_APP_ID && data.SMS_019_SENDER_NUMBER;
      toast({
        title: allSet ? "בדיקת סביבה עברה בהצלחה" : "בעיה במשתני סביבה",
        description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(data, null, 2)}</code></pre>,
        variant: allSet ? "default" : "destructive",
        duration: 9000
      });
    }
  };
  const test019API = async () => {
    if (!testPhone) {
      toast({
        title: "נא להזין מספר טלפון לבדיקה",
        variant: "destructive"
      });
      return;
    }
    console.log(`Testing 019 API with phone: ${testPhone}`);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('test-019-api', {
        body: {
          phone: testPhone
        }
      });
      if (error) {
        throw error;
      }
      console.log('019 API test results:', data);
      toast({
        title: "תוצאות בדיקת 019 API",
        description: <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4"><code className="text-white">{JSON.stringify(data, null, 2)}</code></pre>,
        variant: data.status === 200 && data.body?.includes('<status>0</status>') ? "default" : "destructive",
        duration: 15000
      });
    } catch (error: any) {
      console.error('Error testing 019 API:', error);
      toast({
        title: "שגיאה בבדיקת 019 API",
        description: `אירעה שגיאה: ${error.message}`,
        variant: "destructive"
      });
    }
  };
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
              <div className="text-center mb-6 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
                <p className="text-gray-600 mb-4 leading-relaxed">
                  מעוניינים להירשם לשירות?
                </p>
                <a href="https://biz.ofair.co.il" className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-medium" target="_blank" rel="noopener noreferrer">
                  לחצו כאן וגלו איך עופר עוזרת לכם להרוויח
                </a>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>;
};
export default Auth;