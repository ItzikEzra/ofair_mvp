
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LucideIcon } from 'lucide-react';

interface RegisterFormInputProps {
  form: any;
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  Icon: LucideIcon;
  dir?: string;
}

const RegisterFormInput = ({ form, name, label, placeholder, type = "text", Icon, dir }: RegisterFormInputProps) => {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Icon className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
              <Input 
                type={type} 
                placeholder={placeholder} 
                className="pr-10" 
                {...field} 
                dir={dir} 
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default RegisterFormInput;
