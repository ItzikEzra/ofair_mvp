
import React from "react";
import { Badge } from "@/components/ui/badge";

interface LeadStatusBadgeProps {
  status: string;
}

const LeadStatusBadge = ({ status }: LeadStatusBadgeProps) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500">פעיל</Badge>;
    case "approved":
      return <Badge className="bg-blue-500">אושר</Badge>;
    case "completed":
      return <Badge className="bg-purple-500">הושלם</Badge>;
    case "cancelled":
      return <Badge className="bg-red-500">בוטל</Badge>;
    default:
      return <Badge className="bg-gray-500">לא ידוע</Badge>;
  }
};

export default LeadStatusBadge;
