/**
 * ChaanBean Centralized Knowledge Source: Sample Corporate Intelligence Database
 * Acts as the authoritative API and statutory registry backend during transition to external live gateways.
 * Covers diverse Indian corporate sectors, risk grades (Green, Amber, Red), and compliance histories.
 */

export interface KnowledgeDirector {
  din: string;
  name: string;
  designation: string;
  dinStatus: "ACTIVE" | "DISQUALIFIED";
  appointedDate: string;
}

export interface KnowledgeCourtCase {
  cnrNumber: string;
  court: string;
  caseType: string;
  status: "PENDING" | "DISPOSED" | "DECREED";
  filingYear: number;
  claimAmount: number;
  disputeSummary: string;
}

export interface KnowledgeYearFinancial {
  fiscalYear: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  ebitda: number;
  netProfit: number;
  totalAssets: number;
  totalDebt: number;
  debtToEquity: number;
  currentRatio: number;
  interestCoverage: number;
}

export interface KnowledgeCompany {
  id: string;
  legalName: string;
  tradeName: string;
  gstin: string;
  pan: string;
  cin: string;
  udyamNo: string;
  phone: string;
  email: string;
  registeredAddress: string;
  stateCode: string;
  stateName: string;
  incorporatedOn: string;
  enterpriseType: "Private Limited" | "Public Limited" | "LLP" | "Partnership";
  industryCode: string;
  primaryActivity: string;
  sector: string;
  employeeCount: number;

  // MCA21 Data
  authorizedCapital: number;
  paidUpCapital: number;
  rocJurisdiction: string;
  directors: KnowledgeDirector[];

  // GST Compliance Data
  gstStatus: "Active" | "Cancelled" | "Suspended";
  taxPayerType: "Regular" | "Composition" | "SEZ";
  gstRegistrationDate: string;
  filingRegularityScore: number; // 0 - 100
  gstr1FilingRatio: number; // e.g. 100% or 83%
  gstr3bFilingRatio: number;
  lastFilingPeriod: string;
  annualTurnoverSlab: string;

  // Litigation & e-Courts
  courtCases: KnowledgeCourtCase[];

  // Police & Regulatory FIR
  firRecords: Array<{
    firNumber: string;
    policeStation: string;
    sections: string[];
    status: string;
    year: number;
  }>;

  // Udyam MSME Registry
  udyamCategory: "Micro" | "Small" | "Medium" | "Large";
  nicClassification: string;

  // Financial Intelligence
  yearFinancials: KnowledgeYearFinancial[];

  // Credit Underwriting & Risk Radar
  creditScore: number; // 0 - 100
  riskFlag: "GREEN" | "AMBER" | "RED";
  recommendedCreditLimit: number; // in INR
  paymentTenorDays: number; // 45-day MSMED standard or shorter
  daysBeyondTerms: number; // Average delay in days
  defaultProbability: number; // Percentage
  riskSummary: string;
}

export const KNOWLEDGE_COMPANIES: KnowledgeCompany[] = [
  // 1. GREEN / LOW RISK — Large Infrastructure Corporate
  {
    id: "kc-lt-infra",
    legalName: "Larsen & Toubro Heavy Infrastructure Ltd",
    tradeName: "L&T Heavy Infra",
    gstin: "27AAACL0123M1Z2",
    pan: "AAACL0123M",
    cin: "L28920MH1985PLC038291",
    udyamNo: "UDYAM-MH-03-0019284",
    phone: "022-67525656",
    email: "corporate.finance@ltheavyinfra.in",
    registeredAddress: "L&T House, Ballard Estate, Narottam Morarjee Marg, Fort, Mumbai 400001, Maharashtra",
    stateCode: "27",
    stateName: "Maharashtra",
    incorporatedOn: "1985-06-14",
    enterpriseType: "Public Limited",
    industryCode: "INFRA-4210",
    primaryActivity: "Heavy civil engineering, highway infrastructure, and turnkey industrial installations",
    sector: "Infrastructure & Heavy Engineering",
    employeeCount: 4200,

    authorizedCapital: 500000000,
    paidUpCapital: 320000000,
    rocJurisdiction: "ROC Mumbai",
    directors: [
      { din: "00018293", name: "Anil Manibhai Naik", designation: "Non-Executive Chairman", dinStatus: "ACTIVE", appointedDate: "2012-04-01" },
      { din: "01827394", name: "Sekharipuram Narayanan Subrahmanyan", designation: "Managing Director & CEO", dinStatus: "ACTIVE", appointedDate: "2017-07-01" },
      { din: "02938475", name: "R Shankar Raman", designation: "Whole-Time Director & CFO", dinStatus: "ACTIVE", appointedDate: "2015-10-01" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 98,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 100,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "Above ₹500 Crore",

    courtCases: [
      {
        cnrNumber: "MHCC02-004821-2024",
        court: "Bombay High Court Commercial Division",
        caseType: "Arbitration Application §11",
        status: "DISPOSED",
        filingYear: 2024,
        claimAmount: 4500000,
        disputeSummary: "Contractor milestone payment dispute resolved through mutual conciliation docket.",
      },
    ],
    firRecords: [],

    udyamCategory: "Large",
    nicClassification: "42101 - Construction of motorways, streets, roads, other vehicular and pedestrian ways",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 14200000000,
        cogs: 9800000000,
        grossProfit: 4400000000,
        operatingExpenses: 1900000000,
        ebitda: 2500000000,
        netProfit: 1650000000,
        totalAssets: 18900000000,
        totalDebt: 3200000000,
        debtToEquity: 0.35,
        currentRatio: 2.15,
        interestCoverage: 6.8,
      },
      {
        fiscalYear: "FY 2022-23",
        revenue: 12800000000,
        cogs: 8900000000,
        grossProfit: 3900000000,
        operatingExpenses: 1750000000,
        ebitda: 2150000000,
        netProfit: 1420000000,
        totalAssets: 16500000000,
        totalDebt: 3100000000,
        debtToEquity: 0.38,
        currentRatio: 2.05,
        interestCoverage: 6.2,
      },
    ],

    creditScore: 92,
    riskFlag: "GREEN",
    recommendedCreditLimit: 50000000, // ₹5 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 2,
    defaultProbability: 0.8,
    riskSummary: "Tier-1 institutional counterparty with pristine MCA21 filing consistency, low leverage, strong interest coverage, and AAA-equivalent creditworthiness.",
  },

  // 2. GREEN / LOW RISK — Renewable Energy Technologies
  {
    id: "kc-zenith-solar",
    legalName: "Zenith Renewable Energy Systems Ltd",
    tradeName: "Zenith Solar",
    gstin: "24AAACZ7890R1Z9",
    pan: "AAACZ7890R",
    cin: "U40106GJ2016PLC091244",
    udyamNo: "UDYAM-GJ-01-0082914",
    phone: "079-40192800",
    email: "commercial@zenithsolar.in",
    registeredAddress: "Plot 14-B, GIDC Electronics Zone, Sector 25, Gandhinagar 382024, Gujarat",
    stateCode: "24",
    stateName: "Gujarat",
    incorporatedOn: "2016-04-20",
    enterpriseType: "Public Limited",
    industryCode: "SOLAR-2710",
    primaryActivity: "Solar PV module manufacturing, grid-scale inverters, and battery storage solutions",
    sector: "Clean Energy & Renewables",
    employeeCount: 680,

    authorizedCapital: 250000000,
    paidUpCapital: 185000000,
    rocJurisdiction: "ROC Ahmedabad",
    directors: [
      { din: "03456789", name: "Ketan Rameshchandra Patel", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "2016-04-20" },
      { din: "04567890", name: "Bhavna Ketan Patel", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2016-04-20" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 94,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 96,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "₹100 Crore to ₹500 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Medium",
    nicClassification: "27101 - Manufacture of electric motors, generators and transformers",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 2850000000,
        cogs: 1950000000,
        grossProfit: 900000000,
        operatingExpenses: 460000000,
        ebitda: 440000000,
        netProfit: 290000000,
        totalAssets: 3400000000,
        totalDebt: 650000000,
        debtToEquity: 0.42,
        currentRatio: 1.85,
        interestCoverage: 5.4,
      },
      {
        fiscalYear: "FY 2022-23",
        revenue: 2100000000,
        cogs: 1450000000,
        grossProfit: 650000000,
        operatingExpenses: 340000000,
        ebitda: 310000000,
        netProfit: 195000000,
        totalAssets: 2600000000,
        totalDebt: 580000000,
        debtToEquity: 0.48,
        currentRatio: 1.72,
        interestCoverage: 4.8,
      },
    ],

    creditScore: 84,
    riskFlag: "GREEN",
    recommendedCreditLimit: 25000000, // ₹2.5 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 4,
    defaultProbability: 2.1,
    riskSummary: "High-growth clean energy manufacturer with robust order books, consistent GST filings, zero legal disputes, and healthy operating cash flows.",
  },

  // 3. AMBER / MODERATE RISK — Agro Technologies
  {
    id: "kc-kaveri-agro",
    legalName: "Kaveri Precision Agro Technologies Pvt Ltd",
    tradeName: "Kaveri Agro",
    gstin: "29AAACK4567P1Z5",
    pan: "AAACK4567P",
    cin: "U01111KA2019PTC124810",
    udyamNo: "UDYAM-KR-03-0042918",
    phone: "080-28394011",
    email: "finance@kaveriagro.in",
    registeredAddress: "Plot 88, Peenya Industrial Area 3rd Phase, Bengaluru 560058, Karnataka",
    stateCode: "29",
    stateName: "Karnataka",
    incorporatedOn: "2019-03-11",
    enterpriseType: "Private Limited",
    industryCode: "AGRO-0111",
    primaryActivity: "Drip irrigation systems, agricultural drone telemetry, and hybrid seed processing",
    sector: "Agriculture & Food Tech",
    employeeCount: 210,

    authorizedCapital: 80000000,
    paidUpCapital: 55000000,
    rocJurisdiction: "ROC Bangalore",
    directors: [
      { din: "06789012", name: "Venkatesh Murthy Hegde", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2019-03-11" },
      { din: "07890123", name: "Suresh Babu Reddy", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2021-08-15" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2019-04-01",
    filingRegularityScore: 78,
    gstr1FilingRatio: 88,
    gstr3bFilingRatio: 83,
    lastFilingPeriod: "July 2026",
    annualTurnoverSlab: "₹25 Crore to ₹100 Crore",

    courtCases: [
      {
        cnrNumber: "KABC01-009124-2023",
        court: "City Civil Court Bengaluru",
        caseType: "Commercial Suit (O.S.)",
        status: "PENDING",
        filingYear: 2023,
        claimAmount: 1850000,
        disputeSummary: "Subcontractor supply quality dispute under trial in commercial court.",
      },
    ],
    firRecords: [],

    udyamCategory: "Small",
    nicClassification: "01612 - Operation of agricultural irrigation equipment",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 480000000,
        cogs: 365000000,
        grossProfit: 115000000,
        operatingExpenses: 78000000,
        ebitda: 37000000,
        netProfit: 18500000,
        totalAssets: 420000000,
        totalDebt: 185000000,
        debtToEquity: 1.15,
        currentRatio: 1.25,
        interestCoverage: 2.3,
      },
      {
        fiscalYear: "FY 2022-23",
        revenue: 390000000,
        cogs: 295000000,
        grossProfit: 95000000,
        operatingExpenses: 64000000,
        ebitda: 31000000,
        netProfit: 14200000,
        totalAssets: 350000000,
        totalDebt: 160000000,
        debtToEquity: 1.28,
        currentRatio: 1.18,
        interestCoverage: 2.1,
      },
    ],

    creditScore: 64,
    riskFlag: "AMBER",
    recommendedCreditLimit: 7500000, // ₹75 Lakh
    paymentTenorDays: 30,
    daysBeyondTerms: 18,
    defaultProbability: 9.4,
    riskSummary: "Moderate commercial risk profile. Highly seasonal cash flows with periodic 15-25 day delays in vendor clearance. Working capital leverage is elevated. Recommended 30-day strict tenor with bill discounting support.",
  },

  // 4. RED / HIGH RISK — Industrial Logistics & Warehousing
  {
    id: "kc-apex-logistics",
    legalName: "Apex Industrial Logistics & Warehousing Pvt Ltd",
    tradeName: "Apex Logistics",
    gstin: "33AAACA2345K1Z3",
    pan: "AAACA2345K",
    cin: "U63090TN2018PTC119842",
    udyamNo: "UDYAM-TN-02-0038194",
    phone: "044-26881920",
    email: "accounts@apexlogistics-tn.in",
    registeredAddress: "Survey 108/2, Ambattur Industrial Estate Extn, Chennai 600058, Tamil Nadu",
    stateCode: "33",
    stateName: "Tamil Nadu",
    incorporatedOn: "2018-01-22",
    enterpriseType: "Private Limited",
    industryCode: "LOG-6309",
    primaryActivity: "Container freight handling, inter-state fleet transport, and third-party logistics",
    sector: "Logistics & Supply Chain",
    employeeCount: 140,

    authorizedCapital: 30000000,
    paidUpCapital: 20000000,
    rocJurisdiction: "ROC Chennai",
    directors: [
      { din: "07891245", name: "Murugan Swaminathan", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "2018-01-22" },
      { din: "08912345", name: "Karthik Swaminathan", designation: "Director", dinStatus: "DISQUALIFIED", appointedDate: "2019-05-10" },
    ],

    gstStatus: "Suspended",
    taxPayerType: "Regular",
    gstRegistrationDate: "2018-02-15",
    filingRegularityScore: 42,
    gstr1FilingRatio: 58,
    gstr3bFilingRatio: 50,
    lastFilingPeriod: "April 2026",
    annualTurnoverSlab: "₹5 Crore to ₹25 Crore",

    courtCases: [
      {
        cnrNumber: "TNCH01-003184-2024",
        court: "Commercial Court Chennai",
        caseType: "Summary Suit Order 37 CPC",
        status: "DECREED",
        filingYear: 2024,
        claimAmount: 6850000,
        disputeSummary: "Decree executed against company for unpaid fleet leasing invoices exceeding 180 days.",
      },
      {
        cnrNumber: "TNCH02-001290-2023",
        court: "Metropolitan Magistrate Court Egmore",
        caseType: "Section 138 NI Act (Cheque Bounce)",
        status: "PENDING",
        filingYear: 2023,
        claimAmount: 2200000,
        disputeSummary: "Negotiable Instruments Act criminal complaint for dishonoured commercial cheque.",
      },
    ],
    firRecords: [
      {
        firNumber: "FIR-48/2024",
        policeStation: "Ambattur Police Station",
        sections: ["IPC 420 (Cheating)", "IPC 406 (Criminal Breach of Trust)"],
        status: "Chargesheet Filed",
        year: 2024,
      },
    ],

    udyamCategory: "Small",
    nicClassification: "52109 - Other storage and warehousing",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 145000000,
        cogs: 122000000,
        grossProfit: 23000000,
        operatingExpenses: 29000000,
        ebitda: -6000000,
        netProfit: -12500000,
        totalAssets: 95000000,
        totalDebt: 78000000,
        debtToEquity: 4.85,
        currentRatio: 0.62,
        interestCoverage: -0.4,
      },
    ],

    creditScore: 28,
    riskFlag: "RED",
    recommendedCreditLimit: 0, // Zero credit recommended
    paymentTenorDays: 0,
    daysBeyondTerms: 72,
    defaultProbability: 68.5,
    riskSummary: "SEVERE DEFAULT RISK. GSTIN currently suspended for non-filing. Active Section 138 NI Act cheque bounce criminal complaint and execution decree. Operating at net loss with negative interest coverage. Cash-and-carry terms only.",
  },

  // 5. GREEN / LOW RISK — Cloud & Enterprise Cyber Systems
  {
    id: "kc-vanguard-cloud",
    legalName: "Vanguard Cloud & Cyber Systems Pvt Ltd",
    tradeName: "Vanguard Cloud",
    gstin: "07AAACV6789L1Z1",
    pan: "AAACV6789L",
    cin: "U72900DL2020PTC364819",
    udyamNo: "UDYAM-DL-01-0029418",
    phone: "011-49823400",
    email: "ops@vanguardcloud.in",
    registeredAddress: "Unit 402, DLF Cyber City Tower B, Phase II, Gurugram / New Delhi 110001",
    stateCode: "07",
    stateName: "Delhi",
    incorporatedOn: "2020-09-15",
    enterpriseType: "Private Limited",
    industryCode: "TECH-7290",
    primaryActivity: "Enterprise SaaS, SOC-2 compliant multi-cloud orchestration, and identity protection",
    sector: "Enterprise Software & Cloud",
    employeeCount: 340,

    authorizedCapital: 100000000,
    paidUpCapital: 72000000,
    rocJurisdiction: "ROC Delhi",
    directors: [
      { din: "08923456", name: "Rohan Siddharth Roy", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "2020-09-15" },
      { din: "09034567", name: "Meera Krishnan Roy", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2020-09-15" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2020-10-01",
    filingRegularityScore: 96,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 98,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "₹50 Crore to ₹100 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Small",
    nicClassification: "62011 - Writing, modifying, testing of computer program to meet the needs of a particular client",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 840000000,
        cogs: 380000000,
        grossProfit: 460000000,
        operatingExpenses: 240000000,
        ebitda: 220000000,
        netProfit: 165000000,
        totalAssets: 920000000,
        totalDebt: 95000000,
        debtToEquity: 0.14,
        currentRatio: 3.4,
        interestCoverage: 14.2,
      },
    ],

    creditScore: 89,
    riskFlag: "GREEN",
    recommendedCreditLimit: 35000000, // ₹3.5 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 3,
    defaultProbability: 1.2,
    riskSummary: "High-margin technology firm with negative net debt, pristine statutory filing compliance, and zero litigation. Strongly recommended for prime commercial terms.",
  },

  // 6. RED / HIGH RISK — Metallurgical Foundry Works
  {
    id: "kc-titanium-foundry",
    legalName: "Titanium Metallurgical & Foundry Works LLP",
    tradeName: "Titanium Foundry",
    gstin: "19AAACT9012J1Z8",
    pan: "AAACT9012J",
    cin: "AAK-8291",
    udyamNo: "UDYAM-WB-10-0019284",
    phone: "033-22894011",
    email: "orders@titaniumfoundry.in",
    registeredAddress: "48 Industrial Area, Howrah MIDC Belt, Kolkata 711101, West Bengal",
    stateCode: "19",
    stateName: "West Bengal",
    incorporatedOn: "2017-11-08",
    enterpriseType: "LLP",
    industryCode: "METAL-2410",
    primaryActivity: "Pig iron casting, high-tensile alloy fabrication, and structural beam manufacturing",
    sector: "Metallurgy & Foundry",
    employeeCount: 95,

    authorizedCapital: 20000000,
    paidUpCapital: 15000000,
    rocJurisdiction: "ROC Kolkata",
    directors: [
      { din: "05432109", name: "Biswanath Mukherjee", designation: "Designated Partner", dinStatus: "ACTIVE", appointedDate: "2017-11-08" },
      { din: "06543210", name: "Subrata Chatterjee", designation: "Designated Partner", dinStatus: "ACTIVE", appointedDate: "2017-11-08" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-12-01",
    filingRegularityScore: 52,
    gstr1FilingRatio: 64,
    gstr3bFilingRatio: 58,
    lastFilingPeriod: "May 2026",
    annualTurnoverSlab: "₹5 Crore to ₹25 Crore",

    courtCases: [
      {
        cnrNumber: "WBHW01-002849-2023",
        court: "District Court Howrah",
        caseType: "Money Recovery Suit",
        status: "PENDING",
        filingYear: 2023,
        claimAmount: 4200000,
        disputeSummary: "Default on raw iron ingot procurement supplies exceeding 240 days.",
      },
    ],
    firRecords: [],

    udyamCategory: "Micro",
    nicClassification: "24102 - Manufacture of ferro-alloys",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 112000000,
        cogs: 98000000,
        grossProfit: 14000000,
        operatingExpenses: 18500000,
        ebitda: -4500000,
        netProfit: -7800000,
        totalAssets: 68000000,
        totalDebt: 54000000,
        debtToEquity: 3.9,
        currentRatio: 0.74,
        interestCoverage: -0.2,
      },
    ],

    creditScore: 36,
    riskFlag: "RED",
    recommendedCreditLimit: 500000, // Minimal limit
    paymentTenorDays: 15,
    daysBeyondTerms: 48,
    defaultProbability: 44.0,
    riskSummary: "HIGH DEFAULT RISK. Foundry operating under stressed cash flow, erratic GST filings, and pending district court supplier recovery suit. Cash against delivery (CAD) or strict bank guarantee terms advised.",
  },

  // 7. GREEN / LOW RISK — Tata Motors Limited (Automotive Pioneer)
  {
    id: "kc-tata-motors",
    legalName: "Tata Motors Limited",
    tradeName: "Tata Motors",
    gstin: "27AAACT2727Q1ZW",
    pan: "AAACT2727Q",
    cin: "L28920MH1945PLC004520",
    udyamNo: "UDYAM-MH-26-0004520",
    phone: "022-66658282",
    email: "inv_rel@tatamotors.com",
    registeredAddress: "Bombay House, 24 Homi Mody Street, Fort, Mumbai 400001, Maharashtra",
    stateCode: "27",
    stateName: "Maharashtra",
    incorporatedOn: "1945-09-01",
    enterpriseType: "Public Limited",
    industryCode: "AUTO-2910",
    primaryActivity: "Manufacture of commercial and passenger motor vehicles, electric vehicles, and automotive assemblies",
    sector: "Automotive & Electric Mobility",
    employeeCount: 78000,

    authorizedCapital: 50000000000,
    paidUpCapital: 7660000000,
    rocJurisdiction: "ROC Mumbai",
    directors: [
      { din: "00121863", name: "Natarajan Chandrasekaran", designation: "Chairman & Non-Executive Director", dinStatus: "ACTIVE", appointedDate: "2017-01-12" },
      { din: "03119324", name: "Girish Wagh", designation: "Executive Director", dinStatus: "ACTIVE", appointedDate: "2021-07-01" },
      { din: "08678018", name: "Shailesh Chandra", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "2024-04-01" },
      { din: "02762983", name: "Pathamadai Balachandran Balaji", designation: "Whole-Time Director & Group CFO", dinStatus: "ACTIVE", appointedDate: "2017-11-15" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 99,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 100,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "Above ₹500 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Large",
    nicClassification: "29101 - Manufacture of passenger cars, buses, commercial vehicles",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 4379280000000,
        cogs: 2845000000000,
        grossProfit: 1534280000000,
        operatingExpenses: 980000000000,
        ebitda: 554280000000,
        netProfit: 318070000000,
        totalAssets: 3450000000000,
        totalDebt: 980000000000,
        debtToEquity: 0.85,
        currentRatio: 1.15,
        interestCoverage: 6.8,
      },
    ],

    creditScore: 92,
    riskFlag: "GREEN",
    recommendedCreditLimit: 1000000000, // ₹100 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 2,
    defaultProbability: 0.8,
    riskSummary: "Pristine sovereign-grade enterprise credit rating. Consistent statutory compliance, 100% GSTR-3B filings, blue-chip institutional backing, and positive net cash positions.",
  },

  // 8. GREEN / LOW RISK — Reliance Retail Limited
  {
    id: "kc-reliance-retail",
    legalName: "Reliance Retail Limited",
    tradeName: "Reliance Retail",
    gstin: "27AABCR1234M1Z5",
    pan: "AABCR1234M",
    cin: "U01100MH2006PLC164721",
    udyamNo: "UDYAM-MH-19-0012948",
    phone: "022-35555000",
    email: "retail.compliance@ril.com",
    registeredAddress: "3rd Floor, Court House, Lokmanya Tilak Marg, Dhobi Talao, Mumbai 400002, Maharashtra",
    stateCode: "27",
    stateName: "Maharashtra",
    incorporatedOn: "1999-06-25",
    enterpriseType: "Public Limited",
    industryCode: "RETAIL-4711",
    primaryActivity: "Organized multi-brand retail, supermarkets, digital consumer electronics, and FMCG supply chain",
    sector: "Consumer Retail & Distribution",
    employeeCount: 245000,

    authorizedCapital: 85000000000,
    paidUpCapital: 65000000000,
    rocJurisdiction: "ROC Mumbai",
    directors: [
      { din: "06984133", name: "Isha Mukesh Ambani", designation: "Executive Director", dinStatus: "ACTIVE", appointedDate: "2014-10-15" },
      { din: "00001551", name: "Venkataraman Srikanth", designation: "Director & CFO", dinStatus: "ACTIVE", appointedDate: "2018-05-24" },
      { din: "00085077", name: "Pankaj Mohan Pawar", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2017-09-01" },
      { din: "00043501", name: "Kundapur Vaman Kamath", designation: "Independent Director", dinStatus: "ACTIVE", appointedDate: "2021-11-05" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 99,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 100,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "Above ₹500 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Large",
    nicClassification: "47110 - Retail sale in non-specialized stores with food, beverages or tobacco predominating",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 3067860000000,
        cogs: 2240000000000,
        grossProfit: 827860000000,
        operatingExpenses: 590000000000,
        ebitda: 237860000000,
        netProfit: 111010000000,
        totalAssets: 2150000000000,
        totalDebt: 340000000000,
        debtToEquity: 0.28,
        currentRatio: 1.45,
        interestCoverage: 11.2,
      },
    ],

    creditScore: 95,
    riskFlag: "GREEN",
    recommendedCreditLimit: 1500000000, // ₹150 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 1,
    defaultProbability: 0.5,
    riskSummary: "India's largest retail network. Top-tier financial liquidity, zero litigation defaults, 100% on-time statutory return reconciliation, and flawless promoter governance.",
  },

  // 9. GREEN / LOW RISK — Infosys Limited
  {
    id: "kc-infosys",
    legalName: "Infosys Limited",
    tradeName: "Infosys",
    gstin: "29AAACI4321Q1Z8",
    pan: "AAACI4321Q",
    cin: "L85110KA1981PLC013115",
    udyamNo: "UDYAM-KR-03-0091823",
    phone: "080-28520261",
    email: "investors@infosys.com",
    registeredAddress: "Electronics City, Hosur Road, Bengaluru 560100, Karnataka",
    stateCode: "29",
    stateName: "Karnataka",
    incorporatedOn: "1981-07-02",
    enterpriseType: "Public Limited",
    industryCode: "IT-6201",
    primaryActivity: "Next-generation digital services, IT consulting, AI platform orchestration, and software development",
    sector: "Information Technology & Services",
    employeeCount: 315000,

    authorizedCapital: 24000000000,
    paidUpCapital: 20700000000,
    rocJurisdiction: "ROC Bangalore",
    directors: [
      { din: "00976739", name: "Nandan Manohar Nilekani", designation: "Non-Executive Chairman", dinStatus: "ACTIVE", appointedDate: "2017-08-24" },
      { din: "01876159", name: "Salil Satish Parekh", designation: "CEO & Managing Director", dinStatus: "ACTIVE", appointedDate: "2018-01-02" },
      { din: "00016304", name: "D. Sundaram", designation: "Lead Independent Director", dinStatus: "ACTIVE", appointedDate: "2017-07-14" },
      { din: "00542385", name: "Govind Iyer", designation: "Independent Director", dinStatus: "ACTIVE", appointedDate: "2023-01-12" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 100,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 100,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "Above ₹500 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Large",
    nicClassification: "62011 - Writing, modifying, testing of computer program to meet the needs of a particular client",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 1536700000000,
        cogs: 940000000000,
        grossProfit: 596700000000,
        operatingExpenses: 280000000000,
        ebitda: 316700000000,
        netProfit: 262480000000,
        totalAssets: 1280000000000,
        totalDebt: 45000000000,
        debtToEquity: 0.05,
        currentRatio: 2.35,
        interestCoverage: 28.4,
      },
    ],

    creditScore: 97,
    riskFlag: "GREEN",
    recommendedCreditLimit: 1200000000, // ₹120 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 0,
    defaultProbability: 0.3,
    riskSummary: "Global premier software leader with net zero financial debt, AAA credit quality, spotless regulatory track record, and industry-benchmark corporate governance.",
  },

  // 10. GREEN / LOW RISK — Tata Consultancy Services Limited
  {
    id: "kc-tcs",
    legalName: "Tata Consultancy Services Limited",
    tradeName: "TCS",
    gstin: "27AAACT2879P1Z2",
    pan: "AAACT2879P",
    cin: "L22210MH1995PLC084781",
    udyamNo: "UDYAM-MH-19-0092831",
    phone: "022-67789595",
    email: "investor.relations@tcs.com",
    registeredAddress: "9th Floor, Nirmal Building, Nariman Point, Mumbai 400021, Maharashtra",
    stateCode: "27",
    stateName: "Maharashtra",
    incorporatedOn: "1995-01-19",
    enterpriseType: "Public Limited",
    industryCode: "IT-6202",
    primaryActivity: "IT services, enterprise transformation, cognitive business operations, and cloud infrastructure",
    sector: "Information Technology & Enterprise Services",
    employeeCount: 601000,

    authorizedCapital: 4600000000,
    paidUpCapital: 3618000000,
    rocJurisdiction: "ROC Mumbai",
    directors: [
      { din: "00121863", name: "Natarajan Chandrasekaran", designation: "Non-Executive Chairman", dinStatus: "ACTIVE", appointedDate: "2017-02-21" },
      { din: "10103565", name: "K. Krithivasan", designation: "CEO & Managing Director", dinStatus: "ACTIVE", appointedDate: "2023-06-01" },
      { din: "07006215", name: "N. Ganapathy Subramaniam", designation: "Executive Director", dinStatus: "ACTIVE", appointedDate: "2017-02-21" },
      { din: "07121802", name: "Aarthi Subramanian", designation: "Non-Executive Director", dinStatus: "ACTIVE", appointedDate: "2017-08-17" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 100,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 100,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "Above ₹500 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Large",
    nicClassification: "62020 - Computer consultancy and computer facilities management activities",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 2408930000000,
        cogs: 1395000000000,
        grossProfit: 1013930000000,
        operatingExpenses: 420000000000,
        ebitda: 593930000000,
        netProfit: 460990000000,
        totalAssets: 1540000000000,
        totalDebt: 32000000000,
        debtToEquity: 0.03,
        currentRatio: 2.65,
        interestCoverage: 42.1,
      },
    ],

    creditScore: 98,
    riskFlag: "GREEN",
    recommendedCreditLimit: 1500000000, // ₹150 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 0,
    defaultProbability: 0.2,
    riskSummary: "India's highest market-cap technology bellwether. Impeccable balance sheet, virtually debt-free, premier MSMED §43B(h) compliance, and zero litigation risk.",
  },

  // 11. GREEN / LOW RISK — Maharashtra Seamless Limited
  {
    id: "kc-msl",
    legalName: "Maharashtra Seamless Limited",
    tradeName: "Maharashtra Seamless",
    gstin: "27AAACM1988L1Z3",
    pan: "AAACM1988L",
    cin: "L99999MH1988PLC080545",
    udyamNo: "UDYAM-MH-26-0018294",
    phone: "02194-238511",
    email: "corporate@jindalmsl.com",
    registeredAddress: "Pipe Nagar, Village Sukeli, NH-17, BKG Road, Taluka Roha, Raigad 402126, Maharashtra",
    stateCode: "27",
    stateName: "Maharashtra",
    incorporatedOn: "1988-05-10",
    enterpriseType: "Public Limited",
    industryCode: "PIPE-2431",
    primaryActivity: "Manufacture of seamless steel pipes, ERW pipes, oil casing pipes, and renewable wind energy",
    sector: "Steel & Industrial Manufacturing",
    employeeCount: 1850,

    authorizedCapital: 700000000,
    paidUpCapital: 670000000,
    rocJurisdiction: "ROC Mumbai",
    directors: [
      { din: "00022562", name: "Dharam Pal Jindal", designation: "Chairman", dinStatus: "ACTIVE", appointedDate: "1988-05-10" },
      { din: "00204215", name: "Saket Jindal", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "1997-04-01" },
      { din: "00022718", name: "Shiv Prasad Singhal", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2005-08-12" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2017-07-01",
    filingRegularityScore: 97,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 98,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "Above ₹500 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Large",
    nicClassification: "24311 - Manufacture of tubes, pipes and hollow profiles and of tube or pipe fittings of cast-iron/cast-steel",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 55420000000,
        cogs: 38200000000,
        grossProfit: 17220000000,
        operatingExpenses: 6800000000,
        ebitda: 10420000000,
        netProfit: 9540000000,
        totalAssets: 68000000000,
        totalDebt: 3200000000,
        debtToEquity: 0.08,
        currentRatio: 2.8,
        interestCoverage: 18.5,
      },
    ],

    creditScore: 91,
    riskFlag: "GREEN",
    recommendedCreditLimit: 85000000, // ₹8.5 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 3,
    defaultProbability: 1.1,
    riskSummary: "Pristine industrial manufacturer. Market leader in seamless pipes with negligible debt, healthy net margins, prompt vendor payments, and 100% verified RoC records.",
  },

  // 12. GREEN / LOW RISK — Titan Winners Fund Management LLP
  {
    id: "kc-titan-winners",
    legalName: "Titan Winners Fund Management LLP",
    tradeName: "Titan Winners Fund",
    gstin: "06AAACT4912J1Z6",
    pan: "AAACT4912J",
    cin: "AAY-4912",
    udyamNo: "UDYAM-HR-04-0012948",
    phone: "0124-4829100",
    email: "partners@titanwinnersfund.in",
    registeredAddress: "Level 5, Horizon One, Golf Course Road, Sector 43, Gurugram 122002, Haryana",
    stateCode: "06",
    stateName: "Haryana",
    incorporatedOn: "2021-06-15",
    enterpriseType: "LLP",
    industryCode: "FIN-6430",
    primaryActivity: "Alternative investment fund management, private debt structuring, and early growth capital",
    sector: "Financial Services & Investment",
    employeeCount: 35,

    authorizedCapital: 50000000,
    paidUpCapital: 35000000,
    rocJurisdiction: "ROC Delhi",
    directors: [
      { din: "01289124", name: "Rajeev Agrawal", designation: "Designated Partner", dinStatus: "ACTIVE", appointedDate: "2021-06-15" },
      { din: "02384910", name: "Vikramaditya Singhania", designation: "Designated Partner", dinStatus: "ACTIVE", appointedDate: "2021-06-15" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2021-07-01",
    filingRegularityScore: 98,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 100,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "₹25 Crore to ₹100 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Small",
    nicClassification: "64300 - Trusts, funds and similar financial entities",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 185000000,
        cogs: 42000000,
        grossProfit: 143000000,
        operatingExpenses: 58000000,
        ebitda: 85000000,
        netProfit: 68000000,
        totalAssets: 420000000,
        totalDebt: 12000000,
        debtToEquity: 0.04,
        currentRatio: 4.8,
        interestCoverage: 22.1,
      },
    ],

    creditScore: 88,
    riskFlag: "GREEN",
    recommendedCreditLimit: 25000000, // ₹2.5 Crore
    paymentTenorDays: 30,
    daysBeyondTerms: 2,
    defaultProbability: 1.5,
    riskSummary: "Well-capitalized alternative asset management LLP. Strong balance sheet liquidity, SEBI and MCA statutory compliance intact, and prompt trade receivables clearance.",
  },

  // 13. GREEN / LOW RISK — Acme Traders Pvt Ltd
  {
    id: "kc-acme-traders",
    legalName: "Acme Traders Pvt Ltd",
    tradeName: "Acme Traders",
    gstin: "27AAECG1234H1Z5",
    pan: "AAECG1234H",
    cin: "U72900MH2020PTC345678",
    udyamNo: "UDYAM-MH-12-0084920",
    phone: "022-49823100",
    email: "operations@acmetraders.in",
    registeredAddress: "402, Trade Center, Bandra Kurla Complex, Bandra East, Mumbai 400051, Maharashtra",
    stateCode: "27",
    stateName: "Maharashtra",
    incorporatedOn: "2020-08-15",
    enterpriseType: "Private Limited",
    industryCode: "TRADE-4659",
    primaryActivity: "Wholesale distribution of industrial machinery, precision instrumentation, and engineering components",
    sector: "Wholesale Trade & Industrial Distribution",
    employeeCount: 85,

    authorizedCapital: 5000000,
    paidUpCapital: 2500000,
    rocJurisdiction: "ROC Mumbai",
    directors: [
      { din: "01234567", name: "Rajesh Sharma", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2020-08-15" },
      { din: "02345678", name: "Sunil Varma", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "2020-08-15" },
      { din: "03456789", name: "Pooja Mehta", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2022-03-01" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2020-09-01",
    filingRegularityScore: 96,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 98,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "₹5 Crore to ₹25 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Small",
    nicClassification: "46599 - Wholesale of other machinery and equipment",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 148200000,
        cogs: 118000000,
        grossProfit: 30200000,
        operatingExpenses: 16500000,
        ebitda: 13700000,
        netProfit: 9800000,
        totalAssets: 89000000,
        totalDebt: 18500000,
        debtToEquity: 0.32,
        currentRatio: 1.85,
        interestCoverage: 5.8,
      },
    ],

    creditScore: 86,
    riskFlag: "GREEN",
    recommendedCreditLimit: 15000000, // ₹1.5 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 3,
    defaultProbability: 1.8,
    riskSummary: "Solid mid-market enterprise with steady turnover growth, 100% on-time GST filings, zero legal disputes, and excellent director reputation.",
  },

  // 14. GREEN / LOW RISK — Khedut Agro Tech Pvt Ltd
  {
    id: "kc-khedut-agro",
    legalName: "Khedut Agro Tech Pvt Ltd",
    tradeName: "Khedut Agro Tech",
    gstin: "24AAACK1029P1Z4",
    pan: "AAACK1029P",
    cin: "U01403GJ2018PTC102941",
    udyamNo: "UDYAM-GJ-01-0028491",
    phone: "079-26894011",
    email: "contact@khedutagrotech.in",
    registeredAddress: "Survey 42/1, Sanand Industrial Estate Phase II, Sanand, Ahmedabad 382110, Gujarat",
    stateCode: "24",
    stateName: "Gujarat",
    incorporatedOn: "2018-02-14",
    enterpriseType: "Private Limited",
    industryCode: "AGRI-0140",
    primaryActivity: "Agricultural seed conditioning, cold plasma organic fertilizer distribution, and farm mechanization",
    sector: "Agriculture & Agro Services",
    employeeCount: 92,

    authorizedCapital: 10000000,
    paidUpCapital: 7500000,
    rocJurisdiction: "ROC Ahmedabad",
    directors: [
      { din: "02938471", name: "Ramesh Bhai Patel", designation: "Managing Director", dinStatus: "ACTIVE", appointedDate: "2018-02-14" },
      { din: "03849102", name: "Bharat Kumar Patel", designation: "Director", dinStatus: "ACTIVE", appointedDate: "2018-02-14" },
    ],

    gstStatus: "Active",
    taxPayerType: "Regular",
    gstRegistrationDate: "2018-03-01",
    filingRegularityScore: 95,
    gstr1FilingRatio: 100,
    gstr3bFilingRatio: 96,
    lastFilingPeriod: "August 2026",
    annualTurnoverSlab: "₹25 Crore to ₹100 Crore",

    courtCases: [],
    firRecords: [],

    udyamCategory: "Medium",
    nicClassification: "01403 - Agricultural activities on a fee or contract basis",

    yearFinancials: [
      {
        fiscalYear: "FY 2023-24",
        revenue: 345000000,
        cogs: 265000000,
        grossProfit: 80000000,
        operatingExpenses: 46000000,
        ebitda: 34000000,
        netProfit: 24500000,
        totalAssets: 215000000,
        totalDebt: 38000000,
        debtToEquity: 0.26,
        currentRatio: 2.1,
        interestCoverage: 8.2,
      },
    ],

    creditScore: 85,
    riskFlag: "GREEN",
    recommendedCreditLimit: 20000000, // ₹2.0 Crore
    paymentTenorDays: 45,
    daysBeyondTerms: 4,
    defaultProbability: 2.0,
    riskSummary: "High-performing agro-tech enterprise in Gujarat. Consistent profitability, clean directorship records, zero cheque bounce flags, and strong supplier network credibility.",
  },
];

