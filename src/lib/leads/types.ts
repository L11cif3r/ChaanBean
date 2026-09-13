export interface AdSurveyResponse {
  hasGst: "Yes" | "No";
  organizationName: string;
  businessOnCredit: "Yes" | "No";
  paymentStatus: "Delayed" | "Defaulted" | "Both" | "Neither";
}

export interface AdminLeadItem {
  id: string;
  name: string;
  companyName: string;
  email: string;
  phone: string;
  source: "facebook" | "instagram" | "youtube" | "direct" | "word_of_mouth";
  status: "new" | "contacted" | "qualified" | "demo_scheduled" | "in_negotiation" | "converted" | "lost";
  assignedTo: string;
  assignedToId?: string;
  notes?: string;
  adSurvey: AdSurveyResponse;
  createdAt: string;
}

export interface AdvisorItem {
  id: string;
  name: string;
  email: string;
  role: string;
  specialization: string;
  phone: string;
}

export interface InternalNoteItem {
  id: string;
  leadId?: string;
  author: string;
  text: string;
  tag: string;
  timestamp: string;
}
