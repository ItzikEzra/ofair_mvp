
import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LoginFormValues } from '@/utils/loginSchema';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, LogIn } from "lucide-react";

interface LoginFormFieldsProps {
  form: UseFormReturn<LoginFormValues>;
  onForgotPassword: () => void;
}

const LoginFormFields = ({ form, onForgotPassword }: LoginFormFieldsProps) => {
  return (
    <>
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
      
      <FormField control={form.control} name="password" render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>סיסמה</FormLabel>
            <Button 
              variant="link" 
              className="h-auto p-0 text-xs text-gray-500 hover:text-ofair-blue" 
              onClick={(e) => {
                e.preventDefault();
                onForgotPassword();
              }}
            >
              שכחת סיסמה?
            </Button>
          </div>
          <FormControl>
            <div className="relative">
              <LogIn className="absolute right-3 top-3 h-4 w-4 text-gray-500" />
              <Input type="password" placeholder="******" className="pr-10" {...field} />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      
      <FormField control={form.control} name="rememberMe" render={({ field }) => (
        <FormItem className="flex flex-row items-center space-x-2 space-x-reverse">
          <FormControl>
            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <FormLabel className="mr-2">זכור אותי</FormLabel>
        </FormItem>
      )} />
    </>
  );
};

export default LoginFormFields;
