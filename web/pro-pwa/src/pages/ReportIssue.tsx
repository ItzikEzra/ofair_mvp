import React, { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, List } from "lucide-react";
import IssueReportForm from "@/components/issues/IssueReportForm";
import IssuesList from "@/components/issues/IssuesList";

const ReportIssue: React.FC = () => {
  const [activeTab, setActiveTab] = useState("report");

  const handleFormSuccess = () => {
    // Switch to the "my-issues" tab after successful submission
    setActiveTab("my-issues");
  };

  return (
    <MainLayout title="דווח על בעיה">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
          <h1 className="text-2xl font-bold text-primary text-right mb-2">
            דווח על בעיה
          </h1>
          <p className="text-muted-foreground text-right">
            נשמח לעזור! דווח על תקלות באפליקציה או התנהגות לא נאותה של משתמשים
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="report" className="flex items-center gap-2 text-base">
              <Bug className="h-4 w-4" />
              דווח על בעיה חדשה
            </TabsTrigger>
            <TabsTrigger value="my-issues" className="flex items-center gap-2 text-base">
              <List className="h-4 w-4" />
              הפניות שלי
            </TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="mt-6">
            <IssueReportForm onSuccess={handleFormSuccess} />
          </TabsContent>

          <TabsContent value="my-issues" className="mt-6">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-primary mb-2">
                  הפניות שלי
                </h2>
                <p className="text-muted-foreground">
                  כאן תוכל לראות את כל הפניות ששלחת ואת הסטטוס שלהן
                </p>
              </div>
              <IssuesList />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default ReportIssue;