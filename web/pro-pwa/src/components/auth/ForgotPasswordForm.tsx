
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "יש להזין כתובת אימייל תקינה"
  })
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBackToLogin }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });

      if (error) {
        throw error;
      }

      toast({
        title: "הוראות לאיפוס סיסמה נשלחו",
        description: "אנא בדוק את תיבת הדואר שלך לקבלת הוראות לאיפוס הסיסמה"
      });
      
      onBackToLogin();
    } catch (error: any) {
      toast({
        title: "שגיאת איפוס סיסמה",
        description: error.message || "אירעה שגיאה בעת שליחת הוראות לאיפוס הסיסמה"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">שכחת את הסיסמה?</h2>
        <p className="text-gray-500 text-sm mt-2">
          הזן את כתובת האימייל שלך ואנו נשלח לך הוראות לאיפוס הסיסמה
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>אימייל</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
                  <Input placeholder="you@example.com" className="pr-10" {...field} dir="ltr" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                שולח...
              </span>
            ) : (
              "שלח הוראות איפוס סיסמה"
            )}
          </Button>
          
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full mt-4"
            onClick={onBackToLogin}
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            חזרה להתחברות
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ForgotPasswordForm;
