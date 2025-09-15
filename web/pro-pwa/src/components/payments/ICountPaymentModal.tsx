import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatCurrency";
import { ICountBillingForm } from "./ICountBillingForm";

const paymentSchema = z.object({
  cc_number: z.string().min(13, "מספר כרטיס אשראי לא תקין").max(19, "מספר כרטיס אשראי לא תקין"),
  cc_validity: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "תוקף לא תקין (MM/YY)"),
  cc_cvv: z.string().min(3, "CVV לא תקין").max(4, "CVV לא תקין"),
  cc_holder_name: z.string().min(2, "שם בעל הכרטיס נדרש"),
  cc_holder_id: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface ICountPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  professionalId: string;
  onSuccess: () => void;
}

export const ICountPaymentModal: React.FC<ICountPaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  professionalId,
  onSuccess
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'billing' | 'payment'>('billing');
  const [sessionData, setSessionData] = useState<any>(null);
  const [billingDetails, setBillingDetails] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      cc_number: "",
      cc_validity: "",
      cc_cvv: "",
      cc_holder_name: "",
      cc_holder_id: "",
    }
  });

  React.useEffect(() => {
    if (isOpen && !sessionData) {
      initializePayment();
    }
  }, [isOpen]);

  const initializePayment = async () => {
    try {
      const { data: result, error } = await supabase.functions.invoke('create-icount-session', {
        body: {
          amount,
          professional_id: professionalId
        }
      });

      if (error) {
        throw error;
      }

      setSessionData(result);
      setBillingDetails(result.billing_details);
      
      // If billing details exist, go straight to payment
      if (result.billing_details) {
        setStep('payment');
      }
    } catch (error) {
      console.error("Error initializing payment:", error);
      toast({
        title: "שגיאה ביצירת סשן תשלום",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive"
      });
      onClose();
    }
  };

  const handleBillingSuccess = (details: any) => {
    setBillingDetails(details);
    setStep('payment');
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (!sessionData) return;

    setIsProcessing(true);
    try {
      // Format validity to MMYY
      const [month, year] = data.cc_validity.split('/');
      const formattedValidity = month + year;

      const { data: result, error } = await supabase.functions.invoke('process-icount-payment', {
        body: {
          transaction_id: sessionData.transaction_id,
          cc_number: data.cc_number.replace(/\s+/g, ''),
          cc_validity: formattedValidity,
          cc_cvv: data.cc_cvv,
          cc_holder_name: data.cc_holder_name,
          cc_holder_id: data.cc_holder_id,
          amount,
          professional_id: professionalId,
          client_name: billingDetails?.business_name || data.cc_holder_name,
          email: billingDetails?.email || ""
        }
      });

      if (error) {
        throw error;
      }

      if (result.success) {
        toast({
          title: "התשלום בוצע בהצלחה!",
          description: `עמלה בסך ${formatCurrency(amount)} שולמה בהצלחה`,
        });
        onSuccess();
        onClose();
      } else {
        toast({
          title: "התשלום נכשל",
          description: result.message || "אנא נסה שוב או צור קשר עם הלקוח",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "שגיאה בביצוע התשלום",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCreditCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>תשלום עמלה - {formatCurrency(amount)}</DialogTitle>
        </DialogHeader>

        {step === 'billing' && (
          <ICountBillingForm
            professionalId={professionalId}
            onSuccess={handleBillingSuccess}
            onCancel={onClose}
            initialData={billingDetails}
          />
        )}

        {step === 'payment' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg border border-emerald-200">
              <h4 className="font-medium text-emerald-800 mb-2">פרטי התשלום</h4>
              <p className="text-emerald-700">סכום לתשלום: <span className="font-bold">{formatCurrency(amount)}</span></p>
              {billingDetails && (
                <p className="text-emerald-700 text-sm mt-1">
                  עסק: {billingDetails.business_name}
                </p>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cc_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>מספר כרטיס אשראי</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234 5678 9012 3456"
                          {...field}
                          onChange={(e) => {
                            const formatted = formatCreditCardNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                          maxLength={19}
                          dir="ltr"
                          style={{ textAlign: 'left' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cc_validity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>תוקף</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="MM/YY"
                            {...field}
                            onChange={(e) => {
                              const formatted = formatExpiry(e.target.value);
                              field.onChange(formatted);
                            }}
                            maxLength={5}
                            dir="ltr"
                            style={{ textAlign: 'left' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cc_cvv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CVV</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="123"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                            maxLength={4}
                            dir="ltr"
                            style={{ textAlign: 'left' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cc_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>שם בעל הכרטיס</FormLabel>
                      <FormControl>
                        <Input placeholder="שם מלא כפי שמופיע על הכרטיס" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cc_holder_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>תעודת זהות (אופציונלי)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123456789"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            field.onChange(value);
                          }}
                          maxLength={9}
                          dir="ltr"
                          style={{ textAlign: 'left' }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? "מעבד תשלום..." : `שלם ${formatCurrency(amount)}`}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    ביטול
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};