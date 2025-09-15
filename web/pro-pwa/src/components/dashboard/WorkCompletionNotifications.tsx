
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, FileCheck } from 'lucide-react';
import { useWorkCompletionNotifications } from '@/hooks/useWorkCompletionNotifications';
import WorkCompletionDialog from '../dialogs/WorkCompletionDialog';
import UnifiedWorkCompletionForm from '../work/UnifiedWorkCompletionForm';

const WorkCompletionNotifications = () => {
  const { notifications, isLoading, markAsCompleted } = useWorkCompletionNotifications();
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleFillForm = (notification: any) => {
    setSelectedNotification(notification);
    setIsDialogOpen(true);
  };

  const handleFormComplete = async () => {
    if (selectedNotification) {
      await markAsCompleted(selectedNotification.id);
      setSelectedNotification(null);
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

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck size={20} />
            טפסי השלמת עבודה
            <Badge variant="secondary">{notifications.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications.map((notification) => (
            <div key={notification.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-right">
                    {notification.proposal_details?.lead_title || 
                     notification.proposal_details?.request_title || 
                     'עבודה'}
                  </h4>
                  <p className="text-sm text-gray-600 text-right mt-1">
                    {notification.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock size={14} className="text-orange-500" />
                    <span className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleFillForm(notification)}
                  className="mr-3"
                >
                  <CheckCircle size={16} className="ml-1" />
                  מלא טופס
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-10000 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <UnifiedWorkCompletionForm
              workTitle={
                selectedNotification.proposal_details?.lead_title || 
                selectedNotification.proposal_details?.request_title || 
                'עבודה'
              }
              proposalId={selectedNotification.related_id}
              proposalType={selectedNotification.related_type as 'proposal' | 'quote' | 'referral'}
              onComplete={handleFormComplete}
              onClose={() => {
                setIsDialogOpen(false);
                setSelectedNotification(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default WorkCompletionNotifications;
