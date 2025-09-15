
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const resetPasswordSchema = z.object({
  password: z.string().min(6, {
    message: "סיסמה חייבת להכיל לפחות 6 תווים"
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "הסיסמאות אינן תואמות",
  path: ["confirmPassword"]
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordForm: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "סיסמה עודכנה בהצלחה",
        description: "הסיסמה שלך עודכנה בהצלחה, כעת תוכל להתחבר עם הסיסמה החדשה"
      });
      
      // Redirect to login tab
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "שגיאת עדכון סיסמה",
        description: error.message || "אירעה שגיאה בעת עדכון הסיסמה"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">איפוס סיסמה</h2>
        <p className="text-gray-500 text-sm mt-2">
          צור סיסמה חדשה לחשבון שלך
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>סיסמה חדשה</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
                  <Input type="password" placeholder="******" className="pr-10" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          
          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>אימות סיסמה חדשה</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
                  <Input type="password" placeholder="******" className="pr-10" {...field} />
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
                מעדכן...
              </span>
            ) : (
              "עדכן סיסמה"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ResetPasswordForm;
