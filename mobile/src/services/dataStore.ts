export interface BuyerDebtor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  pan: string;
  gstin: string;
  address: string;
  flag: "green" | "amber" | "red";
  compositeScore: number;
  outstandingAmount: number;
  creditLimit: number;
  tenorDays: number;
  dueDate: string;
  daysOverdue: number;
  status: "current" | "due" | "overdue" | "defaulted";
  currentLevel: "L1" | "L2" | "L3";
  signals: {
    turnoverConsistency: number; // 0-100
    debtToEquity: number;
    litigationCount: number;
    complianceScore: number; // 0-100
    recommendation: string;
  };
}

export interface BusinessProfile {
  id: string;
  companyName: string;
  gstin: string;
  cin: string;
  pan: string;
  udyamNo: string;
  phone: string;
  registeredAddr: string;
  incorporatedOn: string;
  enterpriseType: string;
  industryCode: string;
  primaryActivity: string;
  overallStatus: "ACTIVE" | "VERIFIED" | "SUSPENDED";
  riskFlag: {
    flag: "GREEN" | "AMBER" | "RED";
    compositeScore: number;
    recommendedLimit: number;
    recommendedTenor: number;
    rationale: string;
  };
  yearSummaries: Array<{
    fiscalYear: string;
    revenue: number;
    ebitda: number;
    netProfit: number;
    ebitdaMarginPct: number;
    netMarginPct: number;
    currentRatio: number;
    debtToEquity: number;
  }>;
  courtCasesCount: number;
  documentsCount: number;
}

export interface OmniTraceReport {
  subjectName: string;
  query: string;
  searchedAt: string;
  // Vector 1: Alternate Mobiles
  alternateMobiles: Array<{
    number: string;
    source: string;
    confidence: "High" | "Medium";
    lastActive: string;
    carrier: string;
    circle: string;
  }>;
  // Vector 2: Alternate Emails
  alternateEmails: Array<{
    email: string;
    source: string;
    verified: boolean;
  }>;
  // Vector 3: Alternate Addresses
  alternateAddresses: Array<{
    address: string;
    type: string;
    source: string;
    city: string;
    state: string;
    pincode: string;
  }>;
  // Vector 4: Digital Age & Footprint
  digitalFootprint: {
    tenureYears: number;
    tenureMonths: number;
    earliestStatutoryFiling: string;
    domainAgeYears: number;
    fintechAdoptionIndex: string;
    totalOnlineActivityScore: number;
  };
  // Vector 5: Bank & Branch
  bankDetails: {
    bankName: string;
    branchName: string;
    physicalAddress: string;
    ifsc: string;
    micr: string;
    accountMasked: string;
    lastPaymentMode: string;
    lastVerifiedUtr: string;
  };
  // Vector 6: CIBIL Commercial
  cibilReport: {
    commercialRank: number; // 1-10
    score: number; // 300-900
    activeLines: number;
    creditUtilizationPct: number;
    dpd30Plus: number;
    dpd60Plus: number;
    dpd90Plus: number;
    riskBand: string;
  };
  // Vector 7: Experian
  experianReport: {
    score: number;
    riskCategory: string;
    defaultProbabilityPct: number;
    activeBankingLines: number;
  };
  // Vector 8: CRIF High Mark
  crifReport: {
    score: number;
    scoreBand: string;
    reliabilityIndex: number;
    recentInquiriesCount: number;
  };
  // Vector 9: PAN & Legal Entity
  panVerification: {
    pan: string;
    legalName: string;
    aadhaarLinked: boolean;
    multiStateGstinCount: number;
    status: string;
  };
}

export interface ArbitrationCaseItem {
  id: string;
  caseNumber: string;
  claimantName: string;
  respondentName: string;
  principalAmount: number;
  penalInterestRate: number; // 20.25% under MSMED Act §16
  overdueDays: number;
  accruedInterest: number;
  totalClaimAmount: number;
  status: "open" | "hearing_scheduled" | "settlement_pending" | "award_passed";
  statutoryBasis: string;
  eSignStatus: "pending" | "initiator_signed" | "fully_signed";
  filingDate: string;
}

export const INITIAL_BUYERS: BuyerDebtor[] = [
  {
    id: "buyer-1",
    name: "Metro Supplies Co",
    contactPerson: "Rajesh Sharma",
    phone: "+91 98765 43210",
    email: "rajesh@metrosupplies.in",
    pan: "AAECM4920K",
    gstin: "27AAECM4920K1ZG",
    address: "Plot 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093",
    flag: "red",
    compositeScore: 32,
    outstandingAmount: 2850000,
    creditLimit: 1500000,
    tenorDays: 30,
    dueDate: "2026-06-15",
    daysOverdue: 89,
    status: "defaulted",
    currentLevel: "L3",
    signals: {
      turnoverConsistency: 28,
      debtToEquity: 3.8,
      litigationCount: 4,
      complianceScore: 41,
      recommendation: "Immediate credit freeze. Escalate statutory legal demand under MSMED Act §16 & Section 138 NI Act.",
    },
  },
  {
    id: "buyer-2",
    name: "Nexus Polymers Ltd",
    contactPerson: "Vikram Malhotra",
    phone: "+91 98201 44102",
    email: "finance@nexuspolymers.com",
    pan: "AABCN9102L",
    gstin: "24AABCN9102L1ZQ",
    address: "GIDC Estate, Phase II, Vatva, Ahmedabad, Gujarat 382445",
    flag: "amber",
    compositeScore: 68,
    outstandingAmount: 1420000,
    creditLimit: 2000000,
    tenorDays: 45,
    dueDate: "2026-08-10",
    daysOverdue: 33,
    status: "overdue",
    currentLevel: "L2",
    signals: {
      turnoverConsistency: 74,
      debtToEquity: 1.6,
      litigationCount: 1,
      complianceScore: 82,
      recommendation: "Moderate risk. Require upfront 25% rolling deposit and cap credit exposure to ₹12 Lakhs.",
    },
  },
  {
    id: "buyer-3",
    name: "Apex Global Logistics",
    contactPerson: "Anita Deshmukh",
    phone: "+91 98672 55104",
    email: "anita@apexgl.com",
    pan: "AAACA5510M",
    gstin: "29AAACA5510M1ZR",
    address: "Peenya Industrial Area, 3rd Phase, Bengaluru, Karnataka 560058",
    flag: "green",
    compositeScore: 92,
    outstandingAmount: 380000,
    creditLimit: 4500000,
    tenorDays: 60,
    dueDate: "2026-09-25",
    daysOverdue: 0,
    status: "current",
    currentLevel: "L1",
    signals: {
      turnoverConsistency: 96,
      debtToEquity: 0.4,
      litigationCount: 0,
      complianceScore: 98,
      recommendation: "Prime tier counterparty. Approved for up to ₹45 Lakhs credit tenor across 60 days.",
    },
  },
  {
    id: "buyer-4",
    name: "Shreeji Auto Components",
    contactPerson: "Bhavesh Patel",
    phone: "+91 97110 88219",
    email: "accounts@shreejiauto.in",
    pan: "AACCS8821R",
    gstin: "27AACCS8821R1ZK",
    address: "Bhosari MIDC, Pune, Maharashtra 411026",
    flag: "amber",
    compositeScore: 61,
    outstandingAmount: 960000,
    creditLimit: 1200000,
    tenorDays: 30,
    dueDate: "2026-08-28",
    daysOverdue: 15,
    status: "overdue",
    currentLevel: "L1",
    signals: {
      turnoverConsistency: 69,
      debtToEquity: 2.1,
      litigationCount: 1,
      complianceScore: 75,
      recommendation: "Temporary liquidity tightness. Automated SMS and WhatsApp payment reminder active.",
    },
  },
];

export const OMNITRACE_DATA: Record<string, OmniTraceReport> = {
  "Metro Supplies Co": {
    subjectName: "Metro Supplies Co",
    query: "Metro Supplies Co",
    searchedAt: "2026-09-12T18:45:00Z",
    alternateMobiles: [
      { number: "+91 98765 43210", source: "MCA21 & GSTN Primary", confidence: "High", lastActive: "Yesterday", carrier: "Jio Infocomm", circle: "Mumbai" },
      { number: "+91 98205 11984", source: "Swiggy Delivery (Cluster Residence)", confidence: "High", lastActive: "3 hrs ago", carrier: "Airtel", circle: "Maharashtra" },
      { number: "+91 97690 44211", source: "Amazon Delivery Address Book", confidence: "High", lastActive: "2 days ago", carrier: "Vodafone Idea", circle: "Mumbai" },
      { number: "+91 98198 77650", source: "Zomato Verified Phone (Director Late Night)", confidence: "Medium", lastActive: "5 days ago", carrier: "Jio Infocomm", circle: "Mumbai" },
      { number: "+91 99201 88344", source: "Blinkit Fast Delivery (Warehouse)", confidence: "High", lastActive: "Today 14:30", carrier: "Airtel", circle: "Mumbai" },
      { number: "+91 98210 66522", source: "WhatsApp Business API Linkage", confidence: "High", lastActive: "Online Now", carrier: "Airtel", circle: "Mumbai" },
    ],
    alternateEmails: [
      { email: "rajesh@metrosupplies.in", source: "MCA21 Official Filing", verified: true },
      { email: "rajesh.sharma78@gmail.com", source: "Swiggy & Amazon Cluster", verified: true },
      { email: "billing@metrosupplies.in", source: "GSTN Return Filing Contact", verified: true },
      { email: "director.rajesh@outlook.com", source: "Domain WHOIS Registrant", verified: false },
    ],
    alternateAddresses: [
      { address: "Plot 42, MIDC Industrial Area, Andheri East", type: "Registered Office", source: "MCA21 / GSTN", city: "Mumbai", state: "Maharashtra", pincode: "400093" },
      { address: "Flat 1402, Sea Pearl Towers, JVPD Scheme, Juhu", type: "Director Residence", source: "Swiggy / Amazon Clusters", city: "Mumbai", state: "Maharashtra", pincode: "400049" },
      { address: "Gala No 6, Shreeji Warehouse Complex, Bhiwandi", type: "Factory / Warehouse", source: "GSTN Additional Place of Business", city: "Thane", state: "Maharashtra", pincode: "421302" },
    ],
    digitalFootprint: {
      tenureYears: 8,
      tenureMonths: 4,
      earliestStatutoryFiling: "2018-04-12 (GSTN Registration)",
      domainAgeYears: 7,
      fintechAdoptionIndex: "High (Razorpay, Paytm, Tally)",
      totalOnlineActivityScore: 84,
    },
    bankDetails: {
      bankName: "HDFC Bank Ltd",
      branchName: "Andheri East MIDC Commercial Branch",
      physicalAddress: "Ground Floor, Times Square Building, Andheri-Kurla Road, Mumbai 400059",
      ifsc: "HDFC0000421",
      micr: "400240032",
      accountMasked: "502000XXXX4912",
      lastPaymentMode: "RTGS Commercial Remittance",
      lastVerifiedUtr: "HDFCR520260415000982",
    },
    cibilReport: {
      commercialRank: 7,
      score: 540,
      activeLines: 6,
      creditUtilizationPct: 88.5,
      dpd30Plus: 4,
      dpd60Plus: 2,
      dpd90Plus: 1,
      riskBand: "Subprime / Watchlist",
    },
    experianReport: {
      score: 565,
      riskCategory: "High Risk",
      defaultProbabilityPct: 24.8,
      activeBankingLines: 5,
    },
    crifReport: {
      score: 550,
      scoreBand: "Poor Repayment Cadence",
      reliabilityIndex: 38,
      recentInquiriesCount: 9,
    },
    panVerification: {
      pan: "AAECM4920K",
      legalName: "METRO SUPPLIES COMPANY PVT LTD",
      aadhaarLinked: true,
      multiStateGstinCount: 3,
      status: "OPERATIVE (Regular Taxpayer)",
    },
  },
};

export const INITIAL_BUSINESSES: BusinessProfile[] = [
  {
    id: "biz-1",
    companyName: "Acme Traders Pvt Ltd",
    gstin: "27AABCA1234F1Z5",
    cin: "U51909MH2016PTC284910",
    pan: "AABCA1234F",
    udyamNo: "UDYAM-MH-03-0019283",
    phone: "+91 22 2847 1100",
    registeredAddr: "Unit 301, Solitaire Corporate Park, Chakala, Andheri East, Mumbai 400093",
    incorporatedOn: "2016-08-14",
    enterpriseType: "Small Enterprise",
    industryCode: "4669",
    primaryActivity: "Wholesale trade of industrial machinery & electrical goods",
    overallStatus: "VERIFIED",
    riskFlag: {
      flag: "GREEN",
      compositeScore: 88,
      recommendedLimit: 3000000,
      recommendedTenor: 45,
      rationale: "4-year revenue CAGR of 21.4%, healthy current ratio (1.82), zero Section 138 NI Act litigation, and verified GSTR-3B filing cadence.",
    },
    yearSummaries: [
      { fiscalYear: "FY2025-26", revenue: 42000000, ebitda: 5880000, netProfit: 3780000, ebitdaMarginPct: 14.0, netMarginPct: 9.0, currentRatio: 1.82, debtToEquity: 0.65 },
      { fiscalYear: "FY2024-25", revenue: 34500000, ebitda: 4485000, netProfit: 2760000, ebitdaMarginPct: 13.0, netMarginPct: 8.0, currentRatio: 1.75, debtToEquity: 0.72 },
      { fiscalYear: "FY2023-24", revenue: 28000000, ebitda: 3360000, netProfit: 1960000, ebitdaMarginPct: 12.0, netMarginPct: 7.0, currentRatio: 1.68, debtToEquity: 0.81 },
      { fiscalYear: "FY2022-23", revenue: 23100000, ebitda: 2541000, netProfit: 1386000, ebitdaMarginPct: 11.0, netMarginPct: 6.0, currentRatio: 1.55, debtToEquity: 0.95 },
    ],
    courtCasesCount: 0,
    documentsCount: 6,
  },
  {
    id: "biz-2",
    companyName: "Metro Supplies Co",
    gstin: "27AAECM4920K1ZG",
    cin: "U51100MH2019PTC320119",
    pan: "AAECM4920K",
    udyamNo: "UDYAM-MH-03-0044812",
    phone: "+91 98765 43210",
    registeredAddr: "Plot 42, MIDC Industrial Area, Andheri East, Mumbai 400093",
    incorporatedOn: "2019-02-18",
    enterpriseType: "Micro Enterprise",
    industryCode: "4651",
    primaryActivity: "Trading in office automation equipment & electronic spare parts",
    overallStatus: "ACTIVE",
    riskFlag: {
      flag: "RED",
      compositeScore: 32,
      recommendedLimit: 0,
      recommendedTenor: 0,
      rationale: "Hard red flag: 4 active Section 138 NI Act cheque dishonor cases, revenue contraction of 32% in FY25, and debt-to-equity ratio of 3.8x.",
    },
    yearSummaries: [
      { fiscalYear: "FY2025-26", revenue: 16500000, ebitda: -495000, netProfit: -1320000, ebitdaMarginPct: -3.0, netMarginPct: -8.0, currentRatio: 0.84, debtToEquity: 3.80 },
      { fiscalYear: "FY2024-25", revenue: 24200000, ebitda: 726000, netProfit: 242000, ebitdaMarginPct: 3.0, netMarginPct: 1.0, currentRatio: 0.98, debtToEquity: 2.95 },
      { fiscalYear: "FY2023-24", revenue: 28500000, ebitda: 1995000, netProfit: 1140000, ebitdaMarginPct: 7.0, netMarginPct: 4.0, currentRatio: 1.15, debtToEquity: 2.10 },
      { fiscalYear: "FY2022-23", revenue: 25000000, ebitda: 2000000, netProfit: 1250000, ebitdaMarginPct: 8.0, netMarginPct: 5.0, currentRatio: 1.20, debtToEquity: 1.85 },
    ],
    courtCasesCount: 4,
    documentsCount: 4,
  },
];

export const INITIAL_ARBITRATION_CASES: ArbitrationCaseItem[] = [
  {
    id: "arb-1",
    caseNumber: "ARB-MSME-2026-0042",
    claimantName: "Acme Traders Pvt Ltd",
    respondentName: "Metro Supplies Co",
    principalAmount: 2850000,
    penalInterestRate: 20.25,
    overdueDays: 89,
    accruedInterest: 141973,
    totalClaimAmount: 2991973,
    status: "hearing_scheduled",
    statutoryBasis: "Micro, Small and Medium Enterprises Development (MSMED) Act, 2006 (Section 16 & 18)",
    eSignStatus: "initiator_signed",
    filingDate: "2026-08-01",
  },
  {
    id: "arb-2",
    caseNumber: "ARB-MSME-2026-0089",
    claimantName: "Acme Traders Pvt Ltd",
    respondentName: "Shreeji Auto Components",
    principalAmount: 960000,
    penalInterestRate: 20.25,
    overdueDays: 45,
    accruedInterest: 24098,
    totalClaimAmount: 984098,
    status: "open",
    statutoryBasis: "Arbitration & Conciliation Act 1996 §73 with MSMED Act 2006 §16",
    eSignStatus: "pending",
    filingDate: "2026-09-02",
  },
];

export const EVIDENCE_LOGS = [
  {
    id: "ev-1",
    type: "Section 138 NI Act Formal Legal Notice",
    target: "Metro Supplies Co (Rajesh Sharma)",
    channel: "Registered Post with A/D & Official Email",
    hash: "3a9f02c617b845e2a90d84cf3a1e944b2c159828e678b87a8f94602fba7d8901",
    deliveredAt: "2026-09-12 11:24:08 IST",
    govAck: "ITD-DISPUTE-ACK-2026-0912-78921",
  },
  {
    id: "ev-2",
    type: "Outbound Recovery Telephony Call (PCM 16kHz)",
    target: "Metro Supplies Co (+91 98765 43210)",
    channel: "Asterisk 20 / Vobiz SIP Trunk",
    hash: "7d8901c23f114ab896e0019245fcba1882d908273617b845e2a90d84cf3a1e94",
    deliveredAt: "2026-09-12 10:15:30 IST",
    govAck: "TEL-SIP-CAUSE17-BUSY-CALLSCREENED",
  },
  {
    id: "ev-3",
    type: "GST §16(4) ITC Loss Dispute Notice",
    target: "Nexus Polymers Ltd (24AABCN9102L1ZQ)",
    channel: "GSTN DRC-01A Portal Sync",
    hash: "e678b87a8f94602fba7d89013a9f02c617b845e2a90d84cf3a1e944b2c159828",
    deliveredAt: "2026-09-11 16:40:12 IST",
    govAck: "GSTN-DRC-01A-2026-99214-DEL",
  },
];
