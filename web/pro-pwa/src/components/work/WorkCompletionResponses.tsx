
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessionalId } from '@/hooks/useProfessionalId';
import { useToast } from '@/hooks/use-toast';

interface WorkCompletion {
  id: string;
  work_title: string;
  status: string; // Changed from strict union to string
  notes: string | null;
  created_at: string;
  proposal_type: string; // Changed from strict union to string
}

const WorkCompletionResponses = () => {
  const [completions, setCompletions] = useState<WorkCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { professionalId } = useProfessionalId();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCompletions = async () => {
      if (!professionalId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('work_completions')
          .select('*')
          .eq('professional_id', professionalId as any)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching work completions:', error);
          toast({
            title: "שגיאה בטעינת נתונים",
            description: "לא ניתן לטעון את תשובות טופס סיום העבודה",
            variant: "destructive"
          });
          return;
        }

        // Type assertion to ensure compatibility
        setCompletions((data || []) as unknown as WorkCompletion[]);
      } catch (error) {
        console.error('Unexpected error:', error);
        toast({
          title: "שגיאה",
          description: "אירעה שגיאה בלתי צפויה",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompletions();
  }, [professionalId, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'delayed':
        return <Clock className="text-yellow-500" size={16} />;
      case 'issues':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'הושלמה';
      case 'delayed':
        return 'מתעכבת';
      case 'issues':
        return 'בעיות';
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'delayed':
        return 'secondary';
      case 'issues':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getProposalTypeLabel = (type: string) => {
    switch (type) {
      case 'referral':
        return 'פנייה ישירה';
      case 'proposal':
        return 'הצעת מחיר לליד';
      case 'quote':
        return 'הצעת מחיר לבקשה';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">טוען...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={20} />
          תשובות טופס סיום עבודה
          <Badge variant="secondary">{completions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {completions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p>אין תשובות טופס סיום עבודה עדיין</p>
          </div>
        ) : (
          completions.map((completion) => (
            <div key={completion.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-right">{completion.work_title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getProposalTypeLabel(completion.proposal_type)}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(completion.status)} className="text-xs">
                      <span className="flex items-center gap-1">
                        {getStatusIcon(completion.status)}
                        {getStatusLabel(completion.status)}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>
              
              {completion.notes && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-700 text-right">{completion.notes}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar size={12} />
                <span>
                  {new Date(completion.created_at).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default WorkCompletionResponses;
