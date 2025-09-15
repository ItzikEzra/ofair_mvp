import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Phone, Mail, DollarSign, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthToken } from "@/utils/storageUtils";

interface ClientTransaction {
  id: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  client_address?: string;
  amount: number;
  payment_method: string;
  date: string;
  type: 'lead' | 'quote' | 'referral';
  title: string;
  status: string;
}

interface Client {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  transactions: ClientTransaction[];
  totalAmount: number;
  transactionCount: number;
  lastTransaction: string;
}

const ClientCard = ({ client }: { client: Client }) => {
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
      case 'lead': return 'default';
      case 'quote': return 'secondary';
      case 'referral': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md mb-4" dir="rtl">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{client.name}</h3>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
              {client.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <span dir="ltr">{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span dir="ltr">{client.email}</span>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            ₪{client.totalAmount.toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {client.transactionCount} עסקאות
          </div>
        </div>
      </div>
      
      <div className="border-t pt-3">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-muted-foreground">עסקה אחרונה:</span>
          <span>{new Date(client.lastTransaction).toLocaleDateString('he-IL')}</span>
        </div>
        
        <h4 className="font-medium mb-3">עסקאות אחרונות:</h4>
        <div className="space-y-2">
          {client.transactions.slice(0, 3).map((transaction) => (
            <div
              key={transaction.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-gray-50 rounded-md gap-2"
            >
              <div className="flex items-center gap-2">
                <Badge variant={getTypeBadgeVariant(transaction.type)} className="text-xs">
                  {getTypeLabel(transaction.type)}
                </Badge>
                <span className="text-sm truncate">{transaction.title}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(transaction.date).toLocaleDateString('he-IL')}</span>
                </div>
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <DollarSign className="w-3 h-3" />
                  <span>₪{transaction.amount.toFixed(0)}</span>
                </div>
              </div>
            </div>
          ))}
          {client.transactions.length > 3 && (
            <div className="text-center text-sm text-muted-foreground mt-2">
              +{client.transactions.length - 3} עסקאות נוספות
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TransactionCard = ({ transaction }: { transaction: ClientTransaction }) => {
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
      case 'lead': return 'default';
      case 'quote': return 'secondary';
      case 'referral': return 'outline';
      default: return 'default';
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-md mb-4" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <Badge variant={getTypeBadgeVariant(transaction.type)}>
            {getTypeLabel(transaction.type)}
          </Badge>
          <span className="font-medium">{transaction.title}</span>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-lg font-bold text-green-600">
            ₪{transaction.amount.toFixed(0)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">לקוח: </span>
          <span>{transaction.client_name || 'לא צוין'}</span>
        </div>
        <div>
          <span className="text-muted-foreground">תאריך: </span>
          <span>{new Date(transaction.date).toLocaleDateString('he-IL')}</span>
        </div>
        {transaction.client_phone && (
          <div>
            <span className="text-muted-foreground">טלפון: </span>
            <span dir="ltr">{transaction.client_phone}</span>
          </div>
        )}
        {transaction.client_email && (
          <div>
            <span className="text-muted-foreground">אימייל: </span>
            <span dir="ltr">{transaction.client_email}</span>
          </div>
        )}
        {transaction.client_address && (
          <div>
            <span className="text-muted-foreground">כתובת: </span>
            <span>{transaction.client_address}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ClientsHistory = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<ClientTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { professionalId } = useProfessionalId();
  const { toast } = useToast();

  useEffect(() => {
    if (!professionalId) return;

    const fetchClientsData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching clients data for professionalId:', professionalId);

        // Get the OTP auth token
        const authToken = getAuthToken();
        console.log('Auth token available:', !!authToken);

        // Use the secure RPC function that handles authentication
        const { data: transactions, error } = await supabase.rpc('get_clients_history_secure', {
          token_param: authToken
        });

        if (error) {
          console.error('Error fetching clients history:', error);
          throw new Error(error.message || 'Failed to fetch clients history');
        }

        if (!transactions) {
          console.log('No transactions found');
          setClients([]);
          setTransactions([]);
          return;
        }

        console.log('Received transactions:', transactions.length);

        // Convert RPC result to ClientTransaction format
        const allTransactions: ClientTransaction[] = transactions.map((t: any) => ({
          id: t.transaction_id,
          client_name: t.client_name || 'לקוח ללא שם',
          client_phone: t.client_phone,
          client_email: t.client_email,
          client_address: t.client_address,
          amount: t.amount,
          payment_method: t.payment_method,
          date: t.transaction_date,
          type: t.transaction_type as 'lead' | 'quote' | 'referral',
          title: t.title || 'עסקה',
          status: t.status
        }));

        // Group transactions by client
        const clientsMap = new Map<string, Client>();

        allTransactions.forEach((transaction) => {
          const clientKey = transaction.client_name || 'לקוח ללא שם';
          
          if (!clientsMap.has(clientKey)) {
            clientsMap.set(clientKey, {
              name: clientKey,
              phone: transaction.client_phone,
              email: transaction.client_email,
              address: transaction.client_address,
              transactions: [],
              totalAmount: 0,
              transactionCount: 0,
              lastTransaction: transaction.date
            });
          }

          const client = clientsMap.get(clientKey)!;
          client.transactions.push(transaction);
          client.totalAmount += transaction.amount;
          client.transactionCount += 1;
          
          // Update last transaction date if this one is newer
          if (new Date(transaction.date) > new Date(client.lastTransaction)) {
            client.lastTransaction = transaction.date;
          }
        });

        const clientsList = Array.from(clientsMap.values()).sort(
          (a, b) => new Date(b.lastTransaction).getTime() - new Date(a.lastTransaction).getTime()
        );

        setClients(clientsList);
        setTransactions(allTransactions);

      } catch (error) {
        console.error('Error fetching clients data:', error);
        toast({
          title: "שגיאה בטעינת נתונים",
          description: "לא ניתן לטעון את נתוני הלקוחות",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientsData();
  }, [professionalId, toast]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <Tabs defaultValue="clients" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients">לקוחות</TabsTrigger>
          <TabsTrigger value="transactions">עסקאות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="clients" className="mt-6">
          {clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין לקוחות עדיין</p>
              <p className="text-sm">כשתדווח על עסקאות, הלקוחות יופיעו כאן</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client, index) => (
                <ClientCard key={`${client.name}-${index}`} client={client} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין עסקאות עדיין</p>
              <p className="text-sm">כשתדווח על תשלומים, העסקאות יופיעו כאן</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <TransactionCard key={transaction.id} transaction={transaction} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientsHistory;