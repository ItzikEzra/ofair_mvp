
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, User, LogIn, Briefcase, Phone } from "lucide-react";
import { registerSchema, type RegisterFormValues } from "@/utils/validationSchemas";
import RegisterFormInput from "./RegisterFormInput";
import RegisterSubmitButton from "./RegisterSubmitButton";

interface RegisterFormProps {
  onSuccess: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      profession: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const { error: professionalError } = await supabase
          .from('professionals')
          .insert({
            user_id: data.user.id,
            name: values.name,
            profession: values.profession,
            email: values.email,
            phone_number: values.phone,
            location: 'לא צוין'
          } as any);

        if (professionalError) {
          await supabase.auth.admin.deleteUser(data.user.id);
          throw professionalError;
        }
      }

      toast({
        title: "הרשמה בוצעה בהצלחה",
        description: "נא לאמת את כתובת האימייל שלך ולהתחבר"
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "שגיאת הרשמה",
        description: error.message || "אירעה שגיאה בעת ההרשמה"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <RegisterFormInput
          form={form}
          name="name"
          label="שם מלא"
          placeholder="ישראל ישראלי"
          Icon={User}
        />
        
        <RegisterFormInput
          form={form}
          name="profession"
          label="מקצוע"
          placeholder="חשמלאי, שרברב, וכו'"
          Icon={Briefcase}
        />
        
        <RegisterFormInput
          form={form}
          name="phone"
          label="מספר טלפון"
          placeholder="050-1234567"
          Icon={Phone}
          dir="ltr"
        />
        
        <RegisterFormInput
          form={form}
          name="email"
          label="אימייל"
          placeholder="you@example.com"
          type="email"
          Icon={Mail}
          dir="ltr"
        />
        
        <RegisterFormInput
          form={form}
          name="password"
          label="סיסמה"
          placeholder="******"
          type="password"
          Icon={LogIn}
        />
        
        <RegisterFormInput
          form={form}
          name="confirmPassword"
          label="אימות סיסמה"
          placeholder="******"
          type="password"
          Icon={LogIn}
        />
        
        <RegisterSubmitButton isLoading={isLoading} />
      </form>
    </Form>
  );
};

export default RegisterForm;
