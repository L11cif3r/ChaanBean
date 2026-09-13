import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { AdSurveyResponse, AdminLeadItem, AdvisorItem, InternalNoteItem } from "@/lib/leads/types";

export const dynamic = "force-dynamic";

// Built-in seed advisors if none exist in AdminUser
const INITIAL_ADVISORS: AdvisorItem[] = [
  { id: "adv-1", name: "Siddharth Verma", email: "siddharth@chaanbean.in", role: "owner", specialization: "Executive Owner & Legal Counsel", phone: "+91 98112 34567" },
  { id: "adv-2", name: "Rajesh Nair", email: "rajesh.nair@chaanbean.in", role: "advisor", specialization: "Senior Collections & MSME Recovery", phone: "+91 98450 12345" },
  { id: "adv-3", name: "Pooja Deshmukh", email: "pooja.d@chaanbean.in", role: "advisor", specialization: "Enterprise Underwriting & Due Diligence", phone: "+91 97123 45678" },
  { id: "adv-4", name: "Sneha Kulkarni", email: "sneha.k@chaanbean.in", role: "advisor", specialization: "Statutory Disputes & Samadhaan Liaison", phone: "+91 99201 98765" },
];

// Persistent file path or in-memory store for advisors and survey data
import fs from "fs";
import path from "path";

const LEADS_DATA_PATH = path.join(process.cwd(), "leads-config.json");

interface LeadsDataStore {
  advisors: Array<{ id: string; name: string; email: string; role: string; specialization: string; phone: string }>;
  leads: AdminLeadItem[];
  internalNotes: Array<{ id: string; leadId?: string; author: string; text: string; tag: string; timestamp: string }>;
}

const DEFAULT_LEADS: AdminLeadItem[] = [
  {
    id: "lead-101",
    name: "Vikram Malhotra",
    companyName: "Malhotra Metal & Alloys Pvt Ltd",
    email: "vikram@malhotrametals.in",
    phone: "+91 98201 44521",
    source: "facebook",
    status: "new",
    assignedTo: "Rajesh Nair",
    assignedToId: "adv-2",
    adSurvey: {
      hasGst: "Yes",
      organizationName: "Malhotra Metal & Alloys Pvt Ltd",
      businessOnCredit: "Yes",
      paymentStatus: "Delayed",
    },
    notes: "Overdue trade receivables of ₹42L from buyers in Gujarat industrial cluster.",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "lead-102",
    name: "Ananya Sharma",
    companyName: "Nexus Bio-Pharma Distributorship",
    email: "ananya.s@nexusbiopharma.com",
    phone: "+91 98119 87654",
    source: "instagram",
    status: "contacted",
    assignedTo: "Pooja Deshmukh",
    assignedToId: "adv-3",
    adSurvey: {
      hasGst: "Yes",
      organizationName: "Nexus Bio-Pharma Distributorship",
      businessOnCredit: "Yes",
      paymentStatus: "Defaulted",
    },
    notes: "3 hospital networks defaulted beyond 90 days. Looking for fast-track dispute decree.",
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "lead-103",
    name: "Sunil K. Agarwal",
    companyName: "Agarwal Timber & Plywood Mart",
    email: "sunil@agarwaltimbers.in",
    phone: "+91 94331 22890",
    source: "youtube",
    status: "demo_scheduled",
    assignedTo: "Siddharth Verma",
    assignedToId: "adv-1",
    adSurvey: {
      hasGst: "Yes",
      organizationName: "Agarwal Timber & Plywood Mart",
      businessOnCredit: "Yes",
      paymentStatus: "Both",
    },
    notes: "Requested Asterisk voice recovery dialer demo for Bengaluru construction contractor debts.",
    createdAt: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: "lead-104",
    name: "Ramesh Patel",
    companyName: "Patel Agro Foods Processing",
    email: "ramesh@patelagro.co.in",
    phone: "+91 98790 65432",
    source: "direct",
    status: "qualified",
    assignedTo: "Sneha Kulkarni",
    assignedToId: "adv-4",
    adSurvey: {
      hasGst: "Yes",
      organizationName: "Patel Agro Foods Processing",
      businessOnCredit: "Yes",
      paymentStatus: "Delayed",
    },
    notes: "Direct website inquiry regarding Section 43B(h) Income Tax disallowance filing.",
    createdAt: new Date(Date.now() - 22 * 3600000).toISOString(),
  },
  {
    id: "lead-105",
    name: "Karan Johar Enterprises",
    companyName: "Zenith Textile Weaving Mills",
    email: "contact@zenithtextiles.com",
    phone: "+91 98300 11223",
    source: "word_of_mouth",
    status: "in_negotiation",
    assignedTo: "Rajesh Nair",
    assignedToId: "adv-2",
    adSurvey: {
      hasGst: "Yes",
      organizationName: "Zenith Textile Weaving Mills",
      businessOnCredit: "Yes",
      paymentStatus: "Defaulted",
    },
    notes: "Referred by Acme Polymers. Seeking 5-seat Growth plan + additional company name.",
    createdAt: new Date(Date.now() - 36 * 3600000).toISOString(),
  },
  {
    id: "lead-106",
    name: "Meera Krishnan",
    companyName: "Southern Electronic Components",
    email: "meera@southernelectronics.in",
    phone: "+91 94440 98124",
    source: "facebook",
    status: "new",
    assignedTo: "Pooja Deshmukh",
    assignedToId: "adv-3",
    adSurvey: {
      hasGst: "No",
      organizationName: "Southern Electronic Components",
      businessOnCredit: "No",
      paymentStatus: "Neither",
    },
    notes: "Looking to set up GSTIN and evaluate trade credit scoring before opening credit accounts.",
    createdAt: new Date(Date.now() - 44 * 3600000).toISOString(),
  },
];

const DEFAULT_INTERNAL_NOTES = [
  {
    id: "note-1",
    leadId: "lead-101",
    author: "Rajesh Nair",
    text: "Debtor has active GST filings in Rajkot. Initiated initial L1 WhatsApp statement.",
    tag: "Recovery Strategy",
    timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
  },
  {
    id: "note-2",
    leadId: "lead-102",
    author: "Siddharth Verma (Owner)",
    text: "Authorized priority onboarding with direct fast-track arbitration clause review.",
    tag: "Owner Directive",
    timestamp: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
];

function loadStore(): LeadsDataStore {
  try {
    if (fs.existsSync(LEADS_DATA_PATH)) {
      const raw = fs.readFileSync(LEADS_DATA_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading leads-config.json:", err);
  }

  const initialStore: LeadsDataStore = {
    advisors: INITIAL_ADVISORS,
    leads: DEFAULT_LEADS,
    internalNotes: DEFAULT_INTERNAL_NOTES,
  };
  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: LeadsDataStore) {
  try {
    fs.writeFileSync(LEADS_DATA_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving leads-config.json:", err);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source");
  const advisor = searchParams.get("advisor");

  const store = loadStore();

  let filteredLeads = store.leads;
  if (source && source !== "all") {
    filteredLeads = filteredLeads.filter((l) => l.source === source);
  }
  if (advisor && advisor !== "all") {
    filteredLeads = filteredLeads.filter((l) => l.assignedTo === advisor || l.assignedToId === advisor);
  }

  // Calculate 4-Question Ad Survey Distribution Aggregates for visual charts
  const totalSurveyed = store.leads.length;
  const gstCounts = { yes: 0, no: 0 };
  const creditCounts = { yes: 0, no: 0 };
  const paymentCounts = { delayed: 0, defaulted: 0, both: 0, neither: 0 };
  const orgIndustries: Record<string, number> = {
    "Metals & Heavy Manufacturing": 0,
    "Pharmaceuticals & Healthcare": 0,
    "Timber, Building & Construction": 0,
    "Agriculture & Food Processing": 0,
    "Textiles & Apparel": 0,
    "Electronics & Engineering": 0,
  };

  store.leads.forEach((l) => {
    if (l.adSurvey.hasGst === "Yes") gstCounts.yes++;
    else gstCounts.no++;

    if (l.adSurvey.businessOnCredit === "Yes") creditCounts.yes++;
    else creditCounts.no++;

    if (l.adSurvey.paymentStatus === "Delayed") paymentCounts.delayed++;
    else if (l.adSurvey.paymentStatus === "Defaulted") paymentCounts.defaulted++;
    else if (l.adSurvey.paymentStatus === "Both") paymentCounts.both++;
    else paymentCounts.neither++;

    // Map industry rough
    const cName = l.companyName.toLowerCase();
    if (cName.includes("metal") || cName.includes("alloy")) orgIndustries["Metals & Heavy Manufacturing"]++;
    else if (cName.includes("pharma") || cName.includes("bio")) orgIndustries["Pharmaceuticals & Healthcare"]++;
    else if (cName.includes("timber") || cName.includes("plywood")) orgIndustries["Timber, Building & Construction"]++;
    else if (cName.includes("agro") || cName.includes("food")) orgIndustries["Agriculture & Food Processing"]++;
    else if (cName.includes("textile") || cName.includes("weaving")) orgIndustries["Textiles & Apparel"]++;
    else orgIndustries["Electronics & Engineering"]++;
  });

  return NextResponse.json({
    leads: filteredLeads,
    totalLeads: store.leads.length,
    advisors: store.advisors,
    internalNotes: store.internalNotes,
    surveyAnalytics: {
      totalSurveyed,
      q1Gst: {
        question: "Do you have a GST number?",
        yesCount: gstCounts.yes,
        noCount: gstCounts.no,
        yesPct: Math.round((gstCounts.yes / totalSurveyed) * 100),
        noPct: Math.round((gstCounts.no / totalSurveyed) * 100),
      },
      q2Org: {
        question: "Name of the organization & industry category",
        industries: orgIndustries,
      },
      q3Credit: {
        question: "Is your business on credit?",
        yesCount: creditCounts.yes,
        noCount: creditCounts.no,
        yesPct: Math.round((creditCounts.yes / totalSurveyed) * 100),
        noPct: Math.round((creditCounts.no / totalSurveyed) * 100),
      },
      q4Payment: {
        question: "Is your payment delayed or defaulted?",
        delayedCount: paymentCounts.delayed,
        defaultedCount: paymentCounts.defaulted,
        bothCount: paymentCounts.both,
        neitherCount: paymentCounts.neither,
        delayedPct: Math.round((paymentCounts.delayed / totalSurveyed) * 100),
        defaultedPct: Math.round((paymentCounts.defaulted / totalSurveyed) * 100),
        bothPct: Math.round((paymentCounts.both / totalSurveyed) * 100),
        neitherPct: Math.round((paymentCounts.neither / totalSurveyed) * 100),
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };
    const store = loadStore();

    // 1. Owner transfers/reassigns lead to another advisor
    if (action === "reassign_lead") {
      const { leadId, targetAdvisorName, targetAdvisorId } = body;
      const lead = store.leads.find((l) => l.id === leadId);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      const previousAdvisor = lead.assignedTo;
      lead.assignedTo = targetAdvisorName;
      lead.assignedToId = targetAdvisorId;

      // Log internal audit note
      store.internalNotes.unshift({
        id: `note-${Date.now()}`,
        leadId,
        author: "Owner (Siddharth Verma)",
        text: `Transferred lead from ${previousAdvisor} to ${targetAdvisorName}. Reason: Workload rebalancing and specialized jurisdiction handle.`,
        tag: "Owner Reassignment",
        timestamp: new Date().toISOString(),
      });

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Lead successfully reassigned to ${targetAdvisorName}`,
        lead,
      });
    }

    // 2. CRM Disposition Update
    if (action === "update_disposition") {
      const { leadId, newStatus, reason } = body;
      const lead = store.leads.find((l) => l.id === leadId);
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      const oldStatus = lead.status;
      lead.status = newStatus;

      store.internalNotes.unshift({
        id: `note-${Date.now()}`,
        leadId,
        author: lead.assignedTo || "Advisor",
        text: `Updated CRM disposition from ${oldStatus.toUpperCase()} to ${newStatus.toUpperCase()}.${reason ? ` Details: ${reason}` : ""}`,
        tag: "CRM Disposition",
        timestamp: new Date().toISOString(),
      });

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Disposition updated to ${newStatus}`,
        lead,
      });
    }

    // 3. Add New Advisor
    if (action === "add_advisor") {
      const { name, email, phone, specialization, role = "advisor" } = body;
      if (!name || !email) {
        return NextResponse.json({ error: "Name and email required" }, { status: 400 });
      }

      const newAdv = {
        id: `adv-${Date.now()}`,
        name,
        email,
        phone: phone || "+91 98000 00000",
        specialization: specialization || "B2B Credit Advisor",
        role,
      };

      store.advisors.push(newAdv);
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Advisor ${name} added successfully`,
        advisor: newAdv,
      });
    }

    // 4. Add Internal Note
    if (action === "add_note") {
      const { leadId, author, text, tag } = body;
      if (!text) {
        return NextResponse.json({ error: "Note text required" }, { status: 400 });
      }

      const note = {
        id: `note-${Date.now()}`,
        leadId: leadId || undefined,
        author: author || "Owner / Advisor",
        text,
        tag: tag || "General Note",
        timestamp: new Date().toISOString(),
      };

      store.internalNotes.unshift(note);
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: "Internal note recorded",
        note,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Leads API error" },
      { status: 500 }
    );
  }
}
