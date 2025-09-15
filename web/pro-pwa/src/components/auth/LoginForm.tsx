
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBiometric } from "@/hooks/use-biometric";
import { loginSchema, type LoginFormValues } from "@/utils/loginSchema";
import LoginFormFields from "./LoginFormFields";
import BiometricButton from "./BiometricButton";

interface LoginFormProps {
  onBiometricLogin: () => void;
  isBiometricAvailable: boolean;
  onForgotPassword: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onBiometricLogin,
  isBiometricAvailable,
  onForgotPassword
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { authenticateWithBiometric } = useBiometric();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      // Get professional data for the authenticated user
      const { data: professionalData, error: professionalError } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', data.user.id as any)
        .maybeSingle();

      if (professionalError || !professionalData || !('id' in professionalData)) {
        await supabase.auth.signOut();
        toast({
          title: "שגיאת התחברות",
          description: "משתמש זה אינו רשום כבעל מקצוע"
        });
        return;
      }

      // Save professional data to localStorage
      if (values.rememberMe) {
        localStorage.setItem("rememberAuth", "true");
        localStorage.setItem("professionalData", JSON.stringify(professionalData));
        localStorage.setItem("professionalId", String(professionalData.id));
      }

      toast({
        title: "התחברות בוצעה בהצלחה",
        description: "ברוכים הבאים בחזרה"
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "שגיאת התחברות",
        description: error.message || "אירעה שגיאה בעת ההתחברות"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsLoading(true);
    const success = await authenticateWithBiometric();
    if (success) {
      navigate("/dashboard");
    }
    setIsLoading(false);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <LoginFormFields form={form} onForgotPassword={onForgotPassword} />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                מתחבר...
              </span>
            ) : (
              <>
                <LogIn className="ml-2" size={18} />
                התחברות
              </>
            )}
          </Button>
        </form>
      </Form>
      
      {isBiometricAvailable && (
        <BiometricButton
          isLoading={isLoading}
          onClick={handleBiometricLogin}
        />
      )}
    </>
  );
};

export default LoginForm;
