import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, UserX, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useIssueReports, IssueReport } from "@/hooks/useIssueReports";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

const getStatusIcon = (status: IssueReport['status']) => {
  switch (status) {
    case 'open':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-blue-500" />;
    case 'resolved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'closed_by_user':
      return <XCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusText = (status: IssueReport['status']) => {
  switch (status) {
    case 'open':
      return 'פתוח';
    case 'in_progress':
      return 'בטיפול';
    case 'resolved':
      return 'נפתר';
    case 'closed_by_user':
      return 'נסגר על ידי המשתמש';
    default:
      return 'לא ידוע';
  }
};

const getStatusVariant = (status: IssueReport['status']) => {
  switch (status) {
    case 'open':
      return 'destructive' as const;
    case 'in_progress':
      return 'default' as const;
    case 'resolved':
      return 'default' as const;
    case 'closed_by_user':
      return 'secondary' as const;
    default:
      return 'secondary' as const;
  }
};

const getIssueTypeIcon = (type: IssueReport['issue_type']) => {
  switch (type) {
    case 'app_bug':
      return <Bug className="h-4 w-4 text-orange-500" />;
    case 'user_behavior':
      return <UserX className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getIssueTypeText = (type: IssueReport['issue_type']) => {
  switch (type) {
    case 'app_bug':
      return 'תקלה באפליקציה';
    case 'user_behavior':
      return 'התנהגות לא נאותה';
    default:
      return 'לא ידוע';
  }
};

const IssueCard: React.FC<{ issue: IssueReport }> = ({ issue }) => {
  const createdAt = new Date(issue.created_at);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: he });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIssueTypeIcon(issue.issue_type)}
            <span className="text-sm font-medium text-muted-foreground">
              {getIssueTypeText(issue.issue_type)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(issue.status)}
            <Badge variant={getStatusVariant(issue.status)}>
              {getStatusText(issue.status)}
            </Badge>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          נשלח {timeAgo}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-right leading-relaxed">
              {issue.description}
            </p>
          </div>
          
          {issue.admin_response && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  תגובת הצוות
                </span>
              </div>
              <p className="text-sm text-blue-700 text-right">
                {issue.admin_response}
              </p>
              {issue.resolved_at && (
                <div className="text-xs text-blue-600 text-right mt-2">
                  נפתר ב{formatDistanceToNow(new Date(issue.resolved_at), { addSuffix: true, locale: he })}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const IssuesList: React.FC = () => {
  const { issues, isLoading, error } = useIssueReports();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-muted-foreground">
            שגיאה בטעינת הפניות. אנא נסה שוב מאוחר יותר.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Bug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            אין פניות
          </h3>
          <p className="text-muted-foreground">
            עדיין לא שלחת פניות. כשתדווח על בעיה, היא תופיע כאן.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  );
};

export default IssuesList;