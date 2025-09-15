import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CreditCard, Receipt, DollarSign, Filter, Check, AlertTriangle, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/utils/formatCurrency";
import { ICountPaymentModal } from "./ICountPaymentModal";
import { getAuthToken } from "@/utils/storageUtils";
interface PaymentRecord {
  id: string;
  created_at: string;
  final_amount: number;
  payment_method: string;
  commission_amount?: number;
  share_percentage?: number;
  invoice_url?: string;
  lead_title?: string;
  request_title?: string;
  type: 'lead' | 'quote' | 'referral';
}

interface CommissionPayment {
  id: string;
  amount: number;
  created_at: string;
  status: string;
  confirmation_code?: string;
}
const PaymentsContent = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [leadOwnerEarnings, setLeadOwnerEarnings] = useState(0);
  const [icountTransactions, setIcountTransactions] = useState<CommissionPayment[]>([]);
  const [outstandingCommission, setOutstandingCommission] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeTab, setActiveTab] = useState("earnings");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const {
    professionalId
  } = useProfessionalId();
  const {
    toast
  } = useToast();

  // Get date range for selected month
  const getMonthDateRange = (monthString: string) => {
    if (monthString === "all") {
      return null; // No date filter for all time
    }
    const [year, month] = monthString.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
    return {
      start: firstDay.toISOString(),
      end: lastDay.toISOString()
    };
  };

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const options = [{
      value: "all",
      label: "כל הזמנים"
    }];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long'
      });
      options.push({
        value: monthString,
        label: monthName
      });
    }
    return options;
  };

  // Calculate outstanding commission for ALL TIME (not affected by month filter)
  const calculateOutstandingCommission = async () => {
    try {
      const authToken = getAuthToken();
      
      // Get ALL lead payments using secure RPC (no date filter)
      const { data: allLeadPayments } = await supabase.rpc('get_my_payments_secure', {
        token_param: authToken
      });

      // Get ALL iCount transactions using secure RPC (no date filter)
      const { data: allIcountTransactions } = await supabase.rpc('get_icount_transactions_secure', {
        token_param: authToken
      });

      // Calculate total commissions owed (only from lead payments for now)
      const leadCommissions = (allLeadPayments || []).reduce((sum, p) => sum + (p.final_amount * 0.05), 0);
      const totalOwed = leadCommissions;

      // Calculate total paid
      const totalPaid = (allIcountTransactions || [])
        .filter((t: any) => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);

      // Set outstanding commission
      const remaining = Math.max(0, totalOwed - totalPaid);
      setOutstandingCommission(remaining);
      
      console.log('Outstanding commission calculation:', {
        totalOwed,
        totalPaid,
        remaining
      });
    } catch (error) {
      console.error('Error calculating outstanding commission:', error);
    }
  };
  useEffect(() => {
    if (!professionalId) return;
    
    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching payments for professionalId:', professionalId, 'month:', selectedMonth);
        
        // First, calculate outstanding commission for ALL TIME (not filtered by month)
        await calculateOutstandingCommission();
        
        const authToken = getAuthToken();
        
        // Check authentication
        if (!authToken && !professionalId) {
          toast({
            title: "נדרשת אימות",
            description: "אנא התחבר מחדש כדי לצפות בנתוני התשלומים",
            variant: "destructive"
          });
          window.location.href = '/auth';
          return;
        }
        const dateRange = getMonthDateRange(selectedMonth);

        // Use secure RPC function for lead payments
        const { data: leadPayments, error: leadError } = await supabase.rpc('get_my_payments_secure', {
          token_param: authToken
        });
        console.log('Lead payments query result:', { leadPayments, leadError });

        // Use secure RPC function for icount transactions
        const { data: icountData, error: icountError } = await supabase.rpc('get_icount_transactions_secure', {
          token_param: authToken
        });
        
        // For now, we only have lead payments - quote payments and work completions will be empty
        const quotePayments = [];
        const workCompletions = [];
        const quoteError = null;
        const workError = null;
        console.log('ICOUNT transactions query result:', {
          icountData,
          icountError
        });
        if (leadError || quoteError || workError || icountError) {
          console.error('Error fetching payments:', {
            leadError,
            quoteError,
            workError,
            icountError
          });
          toast({
            title: "שגיאה בטעינת נתונים",
            description: "לא ניתן לטעון את נתוני התשלומים",
            variant: "destructive"
          });
          return;
        }
        
        // Filter payments by date range if specified
        const filterByDate = (item: any) => {
          if (!dateRange) return true;
          const itemDate = new Date(item.created_at);
          return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
        };
        
        // Process iCount transactions for the selected month only
        const processedIcountTransactions = (icountData || []).filter(filterByDate).map((transaction: any) => ({
          id: transaction.id,
          amount: transaction.amount,
          created_at: transaction.created_at,
          status: transaction.status,
          confirmation_code: transaction.confirmation_code
        }));
        setIcountTransactions(processedIcountTransactions);

        // Process and combine all payments
        const allPayments: PaymentRecord[] = [];
        let commissionTotal = 0;
        let earningsTotal = 0;
        let leadOwnerTotal = 0;

        // Process lead payments
        if (leadPayments) {
          leadPayments.filter(filterByDate).forEach((payment: any) => {
            const ofairCommission = payment.final_amount * 0.05; // 5% OFAIR commission
            const netEarning = payment.commission_amount || 0; // What professional actually gets
            const leadOwnerCommission = payment.final_amount * (payment.share_percentage || 0) / 100; // What lead owner gets

            commissionTotal += ofairCommission;
            earningsTotal += netEarning;
            leadOwnerTotal += leadOwnerCommission;
            allPayments.push({
              id: payment.id,
              created_at: payment.created_at,
              final_amount: payment.final_amount,
              payment_method: payment.payment_method,
              commission_amount: payment.commission_amount,
              share_percentage: payment.share_percentage,
              invoice_url: payment.invoice_url,
              lead_title: payment.lead_title,
              type: 'lead'
            });
          });
        }

        // Process quote payments
        if (quotePayments) {
          quotePayments.forEach((payment: any) => {
            const ofairCommission = payment.final_amount * 0.10; // 10% OFAIR commission for quotes
            const netEarning = payment.final_amount - ofairCommission;
            commissionTotal += ofairCommission;
            earningsTotal += netEarning;
            allPayments.push({
              id: payment.id,
              created_at: payment.created_at,
              final_amount: payment.final_amount,
              payment_method: payment.payment_method,
              commission_amount: payment.commission_amount || 0,
              request_title: payment.requests?.title,
              type: 'quote'
            });
          });
        }

        // Process work completions (referrals)
        if (workCompletions) {
          workCompletions.forEach((completion: any) => {
            const ofairCommission = completion.final_amount * 0.10; // 10% OFAIR commission for referrals
            const netEarning = completion.final_amount - ofairCommission;
            commissionTotal += ofairCommission;
            earningsTotal += netEarning;
            allPayments.push({
              id: completion.id,
              created_at: completion.created_at,
              final_amount: completion.final_amount,
              payment_method: completion.payment_method,
              lead_title: completion.work_title,
              type: 'referral'
            });
          });
        }

        // Sort by date (newest first)
        allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPayments(allPayments);
        setTotalCommissions(commissionTotal);
        setTotalEarnings(earningsTotal);
        setLeadOwnerEarnings(leadOwnerTotal);
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בטעינת נתוני התשלומים",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPayments();

    // Listen for work completion events for immediate refresh
    const handleWorkCompleted = () => {
      console.log('[PaymentsContent] Work completed event received, refreshing...');
      fetchPayments();
    };

    window.addEventListener('workCompleted', handleWorkCompleted);

    // Set up real-time subscriptions for automatic updates
    const leadPaymentsChannel = supabase.channel('lead_payments_updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'lead_payments'
    }, () => fetchPayments()).subscribe();
    const quotePaymentsChannel = supabase.channel('quote_payments_updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'quote_payments'
    }, () => fetchPayments()).subscribe();
    const workCompletionsChannel = supabase.channel('work_completions_updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'work_completions'
    }, () => fetchPayments()).subscribe();

    // Cleanup subscriptions and event listeners
    return () => {
      window.removeEventListener('workCompleted', handleWorkCompleted);
      supabase.removeChannel(leadPaymentsChannel);
      supabase.removeChannel(quotePaymentsChannel);
      supabase.removeChannel(workCompletionsChannel);
    };
  }, [professionalId, selectedMonth, toast]);
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'מזומן',
      'ofair_credit': 'אשראי דרך OFAIR',
      'bank_transfer': 'העברה בנקאית',
      'check': 'המחאה',
      'credit_card': 'כרטיס אשראי',
      'other': 'אחר'
    };
    return methods[method] || method;
  };
  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'lead': 'ליד',
      'quote': 'בקשה',
      'referral': 'פנייה ישירה'
    };
    return types[type] || type;
  };
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'lead':
        return 'default';
      case 'quote':
        return 'secondary';
      case 'referral':
        return 'outline';
      default:
        return 'default';
    }
  };
  if (isLoading) {
    return <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>;
  }
  return <div dir="rtl" className="p-4 space-y-6 mx-0 px-[27px]">
      {/* Month Filter */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium">סינון לפי חודש:</span>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48" dir="rtl">
            <SelectValue placeholder="בחר חודש" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {getMonthOptions().map(option => <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Outstanding Commission Alert */}
      {outstandingCommission > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span>יש לך חוב עמלה של {formatCurrency(outstandingCommission)} שטרם שולם</span>
            <Button 
              size="sm" 
              onClick={() => setShowPaymentModal(true)} 
              className="bg-orange-600 hover:bg-orange-700"
            >
              שלם עכשיו
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">רווחים נטו{selectedMonth !== "all" ? " - חודשי" : ""}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₪{totalEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              הרווח שלך לאחר ניכוי עמלות {selectedMonth !== "all" ? "(בחודש הנבחר)" : "(כל הזמנים)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">רווחי נותני לידים{selectedMonth !== "all" ? " - חודשי" : ""}</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ₪{leadOwnerEarnings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              עמלות לנותני הלידים {selectedMonth !== "all" ? "(בחודש הנבחר)" : "(כל הזמנים)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">חוב עמלות OFAIR</CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(outstandingCommission)}
                </div>
                <p className="text-xs text-muted-foreground">
                  סכום לתשלום
                </p>
              </div>
              {outstandingCommission > 0 && <Button size="sm" onClick={() => setShowPaymentModal(true)} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                  שלם {formatCurrency(outstandingCommission)}
                </Button>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earnings">הכנסות</TabsTrigger>
          <TabsTrigger value="commission_payments">תשלומי עמלות</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית הכנסות - {getMonthOptions().find(o => o.value === selectedMonth)?.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין תשלומים עדיין</p>
                </div> : <div className="space-y-4">
                  {payments.map(payment => <div key={payment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(payment.type)}>
                            {getTypeLabel(payment.type)}
                          </Badge>
                          <span className="font-medium text-xs">
                            {payment.lead_title || payment.request_title || 'ללא כותרת'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            ₪{payment.final_amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            סכום מלא
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>{getPaymentMethodLabel(payment.payment_method)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(payment.created_at).toLocaleDateString('he-IL')}</span>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>סכום מלא:</span>
                          <span>₪{payment.final_amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>עמלת OFAIR ({payment.type === 'lead' ? '5%' : '10%'}):</span>
                          <span>-₪{(payment.final_amount * (payment.type === 'lead' ? 0.05 : 0.10)).toFixed(2)}</span>
                        </div>
                        {payment.commission_amount && payment.type === 'lead' && <div className="flex justify-between text-orange-600">
                            <span>עמלת בעל ליד ({payment.share_percentage}%):</span>
                            <span>-₪{(payment.final_amount * (payment.share_percentage || 0) / 100).toFixed(2)}</span>
                          </div>}
                        <div className="flex justify-between font-bold text-green-600 border-t pt-1">
                          <span>הרווח שלך:</span>
                          <span>
                            ₪{payment.type === 'lead' ? (payment.commission_amount || 0).toFixed(2) : (payment.final_amount * 0.90).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commission_payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>תשלומי עמלות שבוצעו</CardTitle>
            </CardHeader>
            <CardContent>
              {icountTransactions.length === 0 ? <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>עדיין לא בוצעו תשלומי עמלות</p>
                </div> : <div className="space-y-4">
                  {icountTransactions.map(transaction => <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'failed' ? 'destructive' : 'secondary'}>
                            {transaction.status === 'completed' ? 'הושלם' : transaction.status === 'failed' ? 'נכשל' : 'ממתין'}
                          </Badge>
                          <span className="font-medium text-xs">תשלום עמלה</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">
                            ₪{transaction.amount.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            אשראי OFAIR
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          <span>כרטיס אשראי</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(transaction.created_at).toLocaleDateString('he-IL')}</span>
                        </div>
                      </div>

                      {transaction.confirmation_code && (
                        <div className="mt-2 text-sm text-gray-600">
                          קוד אישור: {transaction.confirmation_code}
                        </div>
                      )}
                    </div>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="text-center" dir="rtl">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-green-600">
              התשלום בוצע בהצלחה!
            </DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <div>תשלום העמלה בוצע בהצלחה.</div>
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Mail className="w-4 h-4" />
                <span>חשבונית תישלח בדוא"ל</span>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* ICOUNT Payment Modal */}
      <ICountPaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
        amount={outstandingCommission} 
        professionalId={professionalId || ''} 
        onSuccess={() => {
          setShowPaymentModal(false);
          setShowSuccessModal(true);
          // Refresh data after successful payment
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }} 
      />
    </div>;
};
export default PaymentsContent;