import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const billingSchema = z.object({
  business_name: z.string().min(1, "שם עסק נדרש"),
  vat_id: z.string().regex(/^\d{9}$/, "מספר עוסק מורשה חייב להיות 9 ספרות"),
  contact_name: z.string().min(1, "שם איש קשר נדרש"),
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z.string().min(10, "מספר טלפון לא תקין"),
  address: z.string().min(1, "כתובת נדרשת"),
  city: z.string().min(1, "עיר נדרשת"),
  postal_code: z.string().optional(),
});

type BillingFormData = z.infer<typeof billingSchema>;

interface ICountBillingFormProps {
  professionalId: string;
  onSuccess: (billingDetails: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export const ICountBillingForm: React.FC<ICountBillingFormProps> = ({
  professionalId,
  onSuccess,
  onCancel,
  initialData
}) => {
  const { toast } = useToast();
  const form = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      business_name: initialData?.business_name || "",
      vat_id: initialData?.vat_id || "",
      contact_name: initialData?.contact_name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      postal_code: initialData?.postal_code || "",
    }
  });

  const onSubmit = async (data: BillingFormData) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('save-billing-details', {
        body: {
          professional_id: professionalId,
          ...data
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "פרטי חיוב נשמרו בהצלחה",
        description: "ניתן כעת לבצע תשלום עמלה",
      });

      onSuccess(result.billing_details);
    } catch (error) {
      console.error("Error saving billing details:", error);
      toast({
        title: "שגיאה בשמירת פרטי החיוב",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">פרטי חיוב</h3>
        <p className="text-sm text-gray-600">
          אנא מלא את פרטי החיוב שלך לביצוע תשלום העמלה
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם העסק</FormLabel>
                  <FormControl>
                    <Input placeholder="שם העסק" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vat_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מספר עוסק מורשה</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="123456789" 
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                      maxLength={9}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם איש קשר</FormLabel>
                  <FormControl>
                    <Input placeholder="שם מלא" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אימייל</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>טלפון</FormLabel>
                  <FormControl>
                    <Input placeholder="050-1234567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>עיר</FormLabel>
                  <FormControl>
                    <Input placeholder="תל אביב" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>כתובת מלאה</FormLabel>
                <FormControl>
                  <Input placeholder="רחוב הרצל 1, תל אביב" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מיקוד (אופציונלי)</FormLabel>
                <FormControl>
                  <Input placeholder="12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "שומר..." : "שמור פרטים"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};