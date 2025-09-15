
import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Announcements from "@/pages/Announcements";
import Leads from "@/pages/Leads";
import MyLeads from "@/pages/MyLeads";
import MyJobs from "@/pages/MyJobs";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Payments from "@/pages/Payments";
import ProposalForm from "@/pages/ProposalForm";
import ProposalsViewer from "@/pages/ProposalsViewer";
import SubmitLead from "@/pages/SubmitLead";
import SubmitRequest from "@/pages/SubmitRequest";
import History from "@/pages/History";
import Ratings from "@/pages/Ratings";
import ReportIssue from "@/pages/ReportIssue";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <Leads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-leads"
        element={
          <ProtectedRoute>
            <MyLeads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-jobs"
        element={
          <ProtectedRoute>
            <MyJobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Payments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proposal/:leadId"
        element={
          <ProtectedRoute>
            <ProposalForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proposals-viewer/:leadId"
        element={
          <ProtectedRoute>
            <ProposalsViewer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/submit-lead"
        element={
          <ProtectedRoute>
            <SubmitLead />
          </ProtectedRoute>
        }
      />
      <Route
        path="/submit-request"
        element={
          <ProtectedRoute>
            <SubmitRequest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ratings"
        element={
          <ProtectedRoute>
            <Ratings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report-issue"
        element={
          <ProtectedRoute>
            <ReportIssue />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
