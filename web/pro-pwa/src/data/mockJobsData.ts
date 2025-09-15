import { ProposalType, ProjectType, DirectInquiryType } from "@/types/jobs";

export const mockProposals: ProposalType[] = [
  {
    id: "1",
    title: "התקנת מזגן",
    client: "יוסי כהן",
    price: 2500,
    date: "2024-03-15",
    status: "pending",
    type: "lead"
  },
  {
    id: "2", 
    title: "תיקון צנרת",
    client: "רחל לוי",
    price: 800,
    date: "2024-03-10",
    status: "accepted",
    type: "request"
  },
  {
    id: "3",
    title: "צביעת דירה",
    client: "דני אברמוביץ'",
    price: 3200,
    date: "2024-03-08", 
    status: "rejected",
    type: "lead"
  }
];

export const mockProjects: ProjectType[] = [
  {
    id: "101",
    title: "שיפוץ חדר אמבטיה",
    client: "אבי לוי",
    price: 7500,
    startDate: "2024-02-20",
    endDate: "2024-03-10",
    status: "completed",
    progress: 100
  },
  {
    id: "102",
    title: "התקנת מטבח חדש",
    client: "שרה כהן",
    price: 12000,
    startDate: "2024-03-01",
    endDate: "2024-04-15",
    status: "in_progress",
    progress: 60
  },
  {
    id: "103",
    title: "בניית פרגולה",
    client: "משה יוסף",
    price: 5000,
    startDate: "2024-03-15",
    endDate: "2024-04-01",
    status: "active",
    progress: 30
  }
];

export const mockDirectInquiries: DirectInquiryType[] = [
  {
    id: 201,
    client: "יעל שרון",
    phoneNumber: "050-1234567",
    date: "2024-03-22",
    service: "תיקון דוד שמש",
    isContacted: true,
    isClosed: false
  },
  {
    id: 202,
    client: "איתן גל",
    phoneNumber: "052-9876543",
    date: "2024-03-20",
    service: "החלפת ברז",
    isContacted: false,
    isClosed: false
  },
  {
    id: 203,
    client: "רבקה מזרחי",
    phoneNumber: "054-3332222",
    date: "2024-03-18",
    service: "התקנת נקודת חשמל",
    isContacted: true,
    isClosed: true
  }
];
