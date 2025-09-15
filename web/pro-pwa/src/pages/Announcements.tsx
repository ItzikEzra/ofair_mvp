import React from "react";
import MainLayout from "@/components/layout/MainLayout";
import SectionHeader from "@/components/ui/section-header";
import { Megaphone } from "lucide-react";
import AnnouncementsContentWithDistance from "@/components/announcements/AnnouncementsContentWithDistance";
const Announcements = () => {
  return (
    <MainLayout title="מודעות זמינות">
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-6">
          <SectionHeader
            title="מודעות זמינות"
            subtitle="מצא עבודות מתאימות ושלח הצעות מחיר"
            icon={<Megaphone size={18} />}
          />
          <AnnouncementsContentWithDistance />
        </div>
      </div>
    </MainLayout>
  );
};
export default Announcements;