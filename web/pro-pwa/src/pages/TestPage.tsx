
import MainLayout from "@/components/layout/MainLayout";
import TestLocationFilter from "@/components/announcements/TestLocationFilter";

const TestPage = () => {
  return (
    <MainLayout title="בדיקת פילטר מיקום">
      <div className="p-4">
        <TestLocationFilter />
      </div>
    </MainLayout>
  );
};

export default TestPage;
