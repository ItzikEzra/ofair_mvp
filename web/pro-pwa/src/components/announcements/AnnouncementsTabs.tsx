
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnnouncementsTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

const AnnouncementsTabs = ({ activeTab, onTabChange }: AnnouncementsTabsProps) => {
  return (
    <Tabs
      defaultValue={activeTab}
      value={activeTab}
      onValueChange={onTabChange}
      className="mb-6"
    >
      <TabsList className="w-full grid grid-cols-3 mb-4">
        <TabsTrigger value="all">הכל</TabsTrigger>
        <TabsTrigger value="lead">לידים</TabsTrigger>
        <TabsTrigger value="request">בקשות</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default AnnouncementsTabs;
