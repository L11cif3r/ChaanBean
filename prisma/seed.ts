import { PrismaClient } from "@prisma/client";
import { refreshBuyerRiskFlag } from "../src/lib/services/risk-service";
import { calculateMSMEPenalInterest } from "../src/lib/arbitration/interest";

const prisma = new PrismaClient();

const REPORT_TYPES = [
  "director_details",
  "gst_slab_check",
  "gst_exact_turnover",
  "gst_supreme_report",
  "bureau_report",
  "mobile_to_pan",
  "mobile_identity",
  "mobile_to_address",
  "court_case_history",
  "import_export_report",
  "fir_check",
  "address_enrichment",
  "company_supreme_report",
  "msme_report",
  "pan_to_mobile_email",
  "payment_behaviour",
  "find_someone",
];

async function main() {
  console.log("Seeding ChaanBean platform data...");

  // Clean existing tables in relational order
  await prisma.leadAttribution.deleteMany();
  await prisma.campaignSource.deleteMany();
  await prisma.marketingChannel.deleteMany();
  await prisma.salesActivity.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.monthlyFinancial.deleteMany();
  await prisma.templateTranslation.deleteMany();
  await prisma.communityDefault.deleteMany();

  await prisma.legalEvidenceLog.deleteMany();
  await prisma.legalNotice.deleteMany();
  await prisma.arbitrationCase.deleteMany();
  await prisma.call.deleteMany();
  await prisma.messageAudioAsset.deleteMany();
  await prisma.escalationState.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.riskFlag.deleteMany();
  await prisma.creditAccount.deleteMany();
  await prisma.verificationReport.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.trustProfile.deleteMany();
  await prisma.walletUsageLedger.deleteMany();
  await prisma.buyerDebtor.deleteMany();
  await prisma.company.deleteMany();

  // 1. Admin Users (Owner and Team Member)
  const owner = await prisma.adminUser.create({
    data: {
      name: "Siddharth Verma",
      email: "owner@chaanbean.in",
      role: "owner",
    },
  });

  const rep = await prisma.adminUser.create({
    data: {
      name: "Pooja Deshmukh",
      email: "rep@chaanbean.in",
      role: "team_member",
    },
  });

  // 2. CRM Pipeline Stages
  const stageDefs = [
    { name: "Lead", order: 1, color: "#64748b" },
    { name: "Contacted", order: 2, color: "#0284c7" },
    { name: "Demo Scheduled", order: 3, color: "#8b5cf6" },
    { name: "Proposal Sent", order: 4, color: "#f59e0b" },
    { name: "Negotiation", order: 5, color: "#ec4899" },
    { name: "Won", order: 6, color: "#16a34a" },
    { name: "Lost", order: 7, color: "#dc2626" },
  ];

  const stages: Record<string, string> = {};
  for (const s of stageDefs) {
    const created = await prisma.pipelineStage.create({ data: s });
    stages[s.name] = created.id;
  }

  // 3. Marketing Channels & Sources
  const channelsData = [
    { name: "organic", type: "inbound", budget: 45000 },
    { name: "referral", type: "inbound", budget: 20000 },
    { name: "paid_search", type: "paid", budget: 180000 },
    { name: "whatsapp_inbound", type: "inbound", budget: 35000 },
    { name: "direct", type: "direct", budget: 0 },
    { name: "partner", type: "partner", budget: 60000 },
    { name: "trust_hub_referral", type: "inbound", budget: 15000 },
  ];

  const channelMap: Record<string, string> = {};
  for (const c of channelsData) {
    const created = await prisma.marketingChannel.create({ data: c });
    channelMap[c.name] = created.id;
  }

  const srcGoogle = await prisma.campaignSource.create({
    data: {
      channelId: channelMap.paid_search,
      name: "Google Search - B2B Credit Risk India",
      utmCampaign: "q3_google_search",
      cost: 85000,
      leadsCount: 42,
      dealsCount: 8,
    },
  });

  const srcTrustHub = await prisma.campaignSource.create({
    data: {
      channelId: channelMap.trust_hub_referral,
      name: "Trust Hub Vendor Invitations",
      utmCampaign: "trusthub_viral_invites",
      cost: 15000,
      leadsCount: 64,
      dealsCount: 14,
    },
  });

  // 4. Customer Company (Acme Traders Pvt Ltd)
  const company = await prisma.company.create({
    data: {
      name: "Acme Traders Pvt Ltd",
      plan: "growth",
      walletBalance: 285000,
      kycStatus: "verified",
      roles: "admin,operator",
      industry: "Wholesale & Industrial Distribution",
      healthScore: "Healthy",
      signupDate: new Date(Date.now() - 120 * 86400000),
      lastActiveAt: new Date(Date.now() - 1 * 86400000),
    },
  });

  // 5. CRM Leads & Deals
  const lead1 = await prisma.lead.create({
    data: {
      name: "Kunal Singhania",
      companyName: "Singhania Steels Pvt Ltd",
      email: "kunal@singhaniasteel.com",
      phone: "+919820011223",
      source: "paid_search",
      status: "qualified",
      assignedTo: rep.id,
      notes: "Looking to automate L1/L2 payment recovery calls for 400+ distributor debtors.",
    },
  });

  await prisma.leadAttribution.create({
    data: {
      leadId: lead1.id,
      channelId: channelMap.paid_search,
      campaignSourceId: srcGoogle.id,
      touchpointType: "first_touch",
    },
  });

  const deal1 = await prisma.deal.create({
    data: {
      leadId: lead1.id,
      title: "Singhania Steels — Recovery & Bureau Bundle",
      value: 480000,
      probability: 70,
      stageId: stages["Proposal Sent"],
      ownerId: rep.id,
    },
  });

  await prisma.salesActivity.create({
    data: {
      dealId: deal1.id,
      leadId: lead1.id,
      type: "demo",
      description: "Demonstrated automated Voice Dialing and GST Turnover verification.",
      performedBy: rep.id,
    },
  });

  // Won Deal linked to Acme Traders Pvt Ltd
  const leadAcme = await prisma.lead.create({
    data: {
      name: "Harish Parekh",
      companyName: "Acme Traders Pvt Ltd",
      email: "harish@acmetraders.in",
      phone: "+919819922334",
      source: "trust_hub_referral",
      status: "converted",
      assignedTo: owner.id,
    },
  });

  await prisma.leadAttribution.create({
    data: {
      leadId: leadAcme.id,
      channelId: channelMap.trust_hub_referral,
      campaignSourceId: srcTrustHub.id,
      touchpointType: "first_touch",
    },
  });

  await prisma.deal.create({
    data: {
      leadId: leadAcme.id,
      companyId: company.id,
      title: "Acme Traders — Enterprise Annual Contract",
      value: 650000,
      probability: 100,
      stageId: stages["Won"],
      ownerId: owner.id,
      closedAt: new Date(Date.now() - 110 * 86400000),
    },
  });

  // 6. 12-Month Historical Financials
  const financialRecords = [
    { year: 2023, month: 10, totalMRR: 680000, newMRR: 120000, expansionMRR: 30000, churnedMRR: 20000, activeCustomers: 18, reportsPulled: 1240, dealsWon: 4, dealsLost: 2, grossRevenue: 850000 },
    { year: 2023, month: 11, totalMRR: 770000, newMRR: 110000, expansionMRR: 25000, churnedMRR: 15000, activeCustomers: 21, reportsPulled: 1480, dealsWon: 5, dealsLost: 1, grossRevenue: 980000 },
    { year: 2023, month: 12, totalMRR: 890000, newMRR: 150000, expansionMRR: 40000, churnedMRR: 25000, activeCustomers: 25, reportsPulled: 1820, dealsWon: 6, dealsLost: 2, grossRevenue: 1150000 },
    { year: 2024, month: 1, totalMRR: 1020000, newMRR: 165000, expansionMRR: 50000, churnedMRR: 35000, activeCustomers: 29, reportsPulled: 2100, dealsWon: 7, dealsLost: 3, grossRevenue: 1340000 },
    { year: 2024, month: 2, totalMRR: 1160000, newMRR: 180000, expansionMRR: 55000, churnedMRR: 40000, activeCustomers: 33, reportsPulled: 2450, dealsWon: 8, dealsLost: 2, grossRevenue: 1520000 },
    { year: 2024, month: 3, totalMRR: 1310000, newMRR: 195000, expansionMRR: 65000, churnedMRR: 45000, activeCustomers: 37, reportsPulled: 2890, dealsWon: 9, dealsLost: 3, grossRevenue: 1720000 },
    { year: 2024, month: 4, totalMRR: 1460000, newMRR: 210000, expansionMRR: 70000, churnedMRR: 50000, activeCustomers: 41, reportsPulled: 3240, dealsWon: 10, dealsLost: 4, grossRevenue: 1910000 },
    { year: 2024, month: 5, totalMRR: 1620000, newMRR: 230000, expansionMRR: 85000, churnedMRR: 55000, activeCustomers: 45, reportsPulled: 3680, dealsWon: 11, dealsLost: 3, grossRevenue: 2120000 },
    { year: 2024, month: 6, totalMRR: 1780000, newMRR: 245000, expansionMRR: 95000, churnedMRR: 60000, activeCustomers: 49, reportsPulled: 4150, dealsWon: 12, dealsLost: 4, grossRevenue: 2340000 },
    { year: 2024, month: 7, totalMRR: 1920000, newMRR: 260000, expansionMRR: 110000, churnedMRR: 65000, activeCustomers: 53, reportsPulled: 4620, dealsWon: 13, dealsLost: 3, grossRevenue: 2530000 },
    { year: 2024, month: 8, totalMRR: 2080000, newMRR: 280000, expansionMRR: 125000, churnedMRR: 70000, activeCustomers: 57, reportsPulled: 5120, dealsWon: 14, dealsLost: 5, grossRevenue: 2750000 },
    { year: 2024, month: 9, totalMRR: 2260000, newMRR: 310000, expansionMRR: 140000, churnedMRR: 70000, activeCustomers: 62, reportsPulled: 5740, dealsWon: 15, dealsLost: 4, grossRevenue: 2980000 },
  ];

  for (const f of financialRecords) {
    await prisma.monthlyFinancial.create({ data: f });
  }

  // 7. Wallet Usage Ledger
  for (const reportType of REPORT_TYPES) {
    await prisma.walletUsageLedger.create({
      data: {
        companyId: company.id,
        reportType,
        timesUsed: 14 + (reportType.charCodeAt(0) % 20),
        available: 80,
        cost: 45 + ((reportType.charCodeAt(1) || 65) % 55),
      },
    });
  }

  // 8. Trust Profile & Community Defaults
  await prisma.trustProfile.create({
    data: {
      companyId: company.id,
      trustId: "TRUST-CB-ACME-001",
      visibility: "network",
      linkedReports: JSON.stringify(["gst_supreme_report", "bureau_report", "msme_report", "company_supreme_report"]),
      complianceBadges: JSON.stringify([
        "GST Verified Enterprise",
        "Zero Peer Default Certified",
        "MSMED Act Registered",
        "Statutory Audit Clear",
      ]),
    },
  });

  // Seed a peer community default
  await prisma.communityDefault.create({
    data: {
      reportingCompanyId: company.id,
      debtorName: "Metro Supplies Co",
      debtorGstin: "GSTRED003",
      debtorPan: "AAECM9012K",
      amountDefaulted: 890000,
      defaultDate: new Date(Date.now() - 95 * 86400000),
      notes: "Non-payment against invoice #INV-2024-889. Cheque bounced with insufficient funds (Sec 138 NI Act).",
      verified: true,
    },
  });

  // 9. Vendors
  const vendorList = [
    { name: "Shree Logistics Solutions", pan: "AABCS1234F", gstin: "27AABCS1234F1Z5", cin: "U74999MH2018PTC312345", category: "Logistics & Freight", turnoverRange: "₹5Cr–15Cr", score: 92 },
    { name: "Delta Polymer Components", pan: "AABCD5678G", gstin: "29AABCD5678G1Z8", cin: "U27100KA2016PTC987654", category: "Raw Materials", turnoverRange: "₹1.5Cr–5Cr", score: 86 },
    { name: "Apex Tech Cloud Services", pan: "AABCA9012P", gstin: "27AABCA9012P1ZA", cin: "U72200MH2020PTC445566", category: "IT Services", turnoverRange: "₹40L–1.5Cr", score: 88 },
  ];

  for (let i = 0; i < vendorList.length; i++) {
    const v = vendorList[i];
    await prisma.vendor.create({
      data: {
        companyId: company.id,
        name: v.name,
        vendorTrustId: `VTID-${1000 + i}`,
        pan: v.pan,
        gstin: v.gstin,
        cin: v.cin,
        category: v.category,
        turnoverRange: v.turnoverRange,
        trustScore: v.score,
        status: "active",
        kycStatus: "verified",
        directorDetails: JSON.stringify([
          { name: "Director A", din: `0123456${i}`, status: "active" },
          { name: "Director B", din: `0765432${i}`, status: "active" },
        ]),
      },
    });
  }

  // 10. Pre-Approved Multilingual Template Translations (EN, HI, ML, TA, TE, KN, TU)
  const templates = [
    {
      templateId: "l1_whatsapp_reminder_v1",
      channel: "whatsapp",
      level: "L1",
      translations: {
        en: { subject: "Payment Reminder", body: "Hello {{buyerName}}, this is a friendly reminder from ChaanBean that an invoice for {{amount}} was due on {{dueDate}}. Please clear the dues at your earliest convenience." },
        hi: { subject: "भुगतान अनुस्मारक", body: "नमस्ते {{buyerName}}, चानबीन की ओर से विनम्र सूचना: {{amount}} की राशि का भुगतान {{dueDate}} को देय था। कृपया यथाशीघ्र भुगतान करें।" },
        ml: { subject: "പെയ്‌മെന്റ് ഓർമ്മപ്പെടുത്തൽ", body: "നമസ്കാരം {{buyerName}}, ചാൻബീനിൽ നിന്നുള്ള അറിയിപ്പ്: {{amount}} രൂപയുടെ കുടിശ്ശിക {{dueDate}} തീയതിയിൽ അടക്കേണ്ടതായിരുന്നു. ദയവായി ഉടൻ തീർപ്പാക്കുക." },
        ta: { subject: "கடன் நினைவூட்டல்", body: "வணக்கம் {{buyerName}}, சான்பீன் சார்பாக நினைவூட்டல்: {{amount}} தொகைக்கான நிலுவை {{dueDate}} அன்று முடிந்தது. தயவுசெய்து விரைவில் செலுத்தவும்." },
        te: { subject: "చెల్లింపు రిమైండర్", body: "నమస్కారం {{buyerName}}, చాన్బీన్ నుండి రిమైండర్: {{amount}} మొత్తం {{dueDate}} నాటికి చెల్లించాల్సి ఉంది. దయచేసి వెంటనే చెల్లించండి." },
        kn: { subject: "ಪಾವತಿ ನೆನಪೋಲೆ", body: "ನಮಸ್ಕಾರ {{buyerName}}, ಚಾನ್‌ಬೀನ್ ವತಿಯಿಂದ ವಿನಂತಿ: {{amount}} ಮೊತ್ತವು {{dueDate}} ರಂದು ಪಾವತಿಸಬೇಕಾಗಿತ್ತು. ದಯವಿಟ್ಟು ಕೂಡಲೇ ಪಾವತಿಸಿ." },
        tu: { subject: "ಬಾಕಿ ಪಾವತಿ ಎಚ್ಚರಿಕೆ", body: "ನಮಸ್ಕಾರ {{buyerName}}, ಚಾನ್‌ಬೀನ್ ನಿಧಿ ಬಾಕಿ: {{amount}} ಮೊತ್ತ {{dueDate}} ಕ್ಕೆ ಪಾವತಿ ಮಲ್ಪೊಡು. ದಯವಿಟ್ಟು ಬೇಗ ಪಾವತಿ ಮಲ್ಪುಲೆ." },
      },
    },
    {
      templateId: "l1_email_reminder_v1",
      channel: "email",
      level: "L1",
      translations: {
        en: { subject: "Friendly Payment Reminder: Outstanding Balance {{amount}}", body: "Dear {{buyerName}},\n\nWe would like to remind you of an outstanding balance of {{amount}} due on {{dueDate}}.\n\nPlease process the payment at your earliest convenience or contact our accounts desk.\n\nWarm regards,\nChaanBean Credit Operations" },
        hi: { subject: "भुगतान अनुस्मारक: बकाया राशि {{amount}}", body: "प्रिय {{buyerName}},\n\nहम आपको सूचित करते हैं कि {{amount}} की बकाया राशि {{dueDate}} को देय थी।\n\nकृपया भुगतान प्रक्रिया शीघ्र पूरी करें।\n\nसादर,\nचानबीन क्रेडिट ऑपरेशंस" },
        ml: { subject: "കുടിശ്ശിക ഓർമ്മപ്പെടുത്തൽ: {{amount}}", body: "പ്രിയപ്പെട്ട {{buyerName}},\n\n{{amount}} രൂപയുടെ കുടിശ്ശിക {{dueDate}} തീയതിയിൽ അവസാനിച്ച വിവരം ഓർമ്മിപ്പിക്കുന്നു. ദയവായി തുക എത്രയും വേഗം കൈമാറുക.\n\nവിശ്വസ്തതയോടെ,\nചാൻബീൻ ക്രെഡിറ്റ് ഡെസ്ക്" },
        ta: { subject: "கடன் நிலுவை நினைவூட்டல்: {{amount}}", body: "அன்புள்ள {{buyerName}},\n\n{{dueDate}} அன்று செலுத்த வேண்டிய {{amount}} நிலுவைத் தொகையை நினைவூட்டுகிறோம்.\n\nநன்றி,\nசான்பீன் கிரெடிட் குழு" },
        te: { subject: "చెల్లింపు నోటీసు: {{amount}}", body: "ప్రియమైన {{buyerName}},\n\n{{dueDate}} నాటికి గడువు ముగిసిన {{amount}} బకాయిని చెల్లించవలసిందిగా కోరుతున్నాము.\n\nభవదీయుడు,\nచాన్బీన్" },
        kn: { subject: "ಪಾವತಿ ಜ್ಞಾಪನೆ: {{amount}}", body: "ಆತ್ಮೀಯ {{buyerName}},\n\n{{dueDate}} ರಂದು ಪಾವತಿಸಬೇಕಾದ {{amount}} ಮೊತ್ತವನ್ನು ದಯವಿಟ್ಟು ಶೀಘ್ರವೇ ಕ್ಲಿಯರ್ ಮಾಡಿ.\n\nಧನ್ಯವಾದಗಳು,\nಚಾನ್‌ಬೀನ್" },
        tu: { subject: "ಬಾಕಿ ಪಾವತಿ ನೆನಪು: {{amount}}", body: "ಆತ್ಮೀಯ {{buyerName}},\n\n{{dueDate}} ಕ್ಕೆ ಪಾವತಿ ಮಲ್ಪೊಡಾಯಿನ {{amount}} ಮೊತ್ತ ಬೇಗ ಕಡಪುಡುಲೆ.\n\nಚಾನ್‌ಬೀನ್" },
      },
    },
    {
      templateId: "l2_voice_reminder_v1",
      channel: "voice",
      level: "L2",
      translations: {
        en: { subject: "Firm Voice Notice", body: "This is an automated firm payment notification from ChaanBean. Attention {{buyerName}}, an outstanding balance of {{amount}} has been overdue since {{dueDate}}. Continued delay may impact your commercial credit score and lead to statutory legal recovery. Please settle immediately." },
        hi: { subject: "वसूली वॉइस सूचना", body: "यह चानबीन से एक स्वचालित सख्त भुगतान सूचना है। ध्यान दें {{buyerName}}, {{dueDate}} से {{amount}} की राशि अतिदेय है। आगे के विलंब से आपका क्रेडिट स्कोर प्रभावित हो सकता है और कानूनी कार्रवाई हो सकती है। कृपया तुरंत भुगतान करें।" },
        ml: { subject: "ശബ്ദ അറിയിപ്പ്", body: "ഇത് ചാൻബീനിൽ നിന്നുള്ള അറിയിപ്പാണ്. ശ്രദ്ധിക്കുക {{buyerName}}, {{amount}} രൂപയുടെ കുടിശ്ശിക {{dueDate}} മുതൽ അടക്കാതെയുണ്ട്. കൂടുതൽ കാലതാമസം നിങ്ങളുടെ ക്രെഡിറ്റ് സ്കോറിനെ ബാധിക്കുകയും നിയമനടപടികളിലേക്ക് നയിക്കുകയും ചെയ്യും. ദയവായി ഉടൻ അടക്കുക." },
        ta: { subject: "குரல் வழி நினைவூட்டல்", body: "இது சான்பீன் வழங்கும் அவசர குரல் அறிவிப்பு. {{buyerName}} கவனத்திற்கு, {{amount}} தொகை {{dueDate}} முதல் நிலுவையில் உள்ளது. இது உங்கள் கிரெடிட் மதிப்பெண்ணை பாதிக்கும். உடனடியாக செலுத்தவும்." },
        te: { subject: "వాయిస్ రిమైండర్", body: "ఇది చాన్బీన్ నుండి ముఖ్యమైన వాయిస్ ప్రకటన. {{buyerName}}, {{dueDate}} నుండి {{amount}} బకాయి ఉంది. వెంటనే చెల్లించండి." },
        kn: { subject: "ಧ್ವನಿ ಸೂಚನೆ", body: "ಇದು ಚಾನ್‌ಬೀನ್ ಸ್ವಯಂಚಾಲಿತ ಪಾವತಿ ಪ್ರಕಟಣೆ. {{buyerName}}, {{dueDate}} ರಿಂದ {{amount}} ಬಾಕಿ ಉಳಿದಿದೆ. ತಕ್ಷಣವೇ ಪಾವತಿಸಿ." },
        tu: { subject: "ಸ್ವರ ಸಂದೇಶ", body: "ಉಂದು ಚಾನ್‌ಬೀನ್ ಕಡೆಯಿಂದ ಪಾವತಿ ಸೂಚನೆ. {{buyerName}}, {{dueDate}} ಡ್ದು {{amount}} ಬಾಕಿ ಉಂಡು. ಬೇಗ ಸಂದಾಯ ಮಲ್ಪುಲೆ." },
      },
    },
    {
      templateId: "legal_notice_demand_v1",
      channel: "legal_notice",
      level: "L3",
      translations: {
        en: { subject: "STATUTORY DEMAND NOTICE UNDER SEC 138 NI ACT / MSMED ACT 2006", body: "STATUTORY LEGAL DEMAND NOTICE\n\nTo: {{buyerName}}\n\nTAKE NOTICE that an undisputed commercial debt of {{amount}} remains overdue since {{dueDate}}.\n\nFailure to remit payment within 15 days of this notice will result in immediate escalation to the ChaanBean Arbitration Center for statutory recovery with compound penal interest at 3x RBI Bank Rate pursuant to Section 16 of the MSMED Act, 2006, along with criminal proceedings under Section 138 of the Negotiable Instruments Act.\n\nCross-referenced with Income Tax and GSTN Portal Acknowledgments." },
        hi: { subject: "वैधानिक कानूनी मांग नोटिस (धारा 138 एनआई अधिनियम / एमएसएमई अधिनियम)", body: "वैधानिक कानूनी मांग नोटिस\n\nप्रति: {{buyerName}}\n\nसूचित किया जाता है कि {{amount}} का व्यावसायिक ऋण {{dueDate}} से अतिदेय है।\n\n15 दिनों के भीतर भुगतान न करने पर एमएसएमई अधिनियम 2006 की धारा 16 के तहत 3 गुना आरबीआई बैंक दर से चक्रवृद्धि ब्याज सहित मध्यस्थता और कानूनी वसूली की जाएगी।" },
        ml: { subject: "നിയമപരമായ ഡിമാൻഡ് നോട്ടീസ് (MSMED Act 2006 §16)", body: "നിയമപരമായ ഡിമാൻഡ് നോട്ടീസ്\n\nസ്വീകർത്താവ്: {{buyerName}}\n\n{{dueDate}} മുതൽ തീർപ്പാക്കാത്ത {{amount}} രൂപയുടെ കടം ഉടൻ അടക്കുക. 15 ദിവസത്തിനകം പണം അടച്ചില്ലെങ്കിൽ എം.എസ്.എം.ഇ ആക്ട് വകുപ്പ് 16 പ്രകാരം ആർ.ബി.ഐ ബാങ്ക് നിരക്കിന്റെ 3 ഇരട്ടി കൂട്ടുപലിശ ഈടാക്കി ആർബിട്രേഷൻ നടപടികൾ ആരംഭിക്കുന്നതാണ്." },
        ta: { subject: "சட்டப்பூர்வ கோரிக்கை அறிவிப்பு", body: "சட்டப்பூர்வ கோரிக்கை அறிவிப்பு\n\nபெறுநர்: {{buyerName}}\n\n{{dueDate}} முதல் நிலுவையில் உள்ள {{amount}} தொகையை 15 நாட்களுக்குள் செலுத்தவும். தவறினால் MSME சட்டம் பிரிவு 16ன் படி 3 மடங்கு கூட்டு வட்டியுடன் மத்தியஸ்த நடவடிக்கை எடுக்கப்படும்." },
        te: { subject: "చట్టపరమైన డిమాండ్ నోటీసు", body: "చట్టపరమైన డిమాండ్ నోటీసు\n\nస్వీకర్త: {{buyerName}}\n\n{{dueDate}} నుండి బకాయి ఉన్న {{amount}} ని 15 రోజుల్లో చెల్లించండి. లేనిచో చట్టపరమైన ఆర్బిట్రేషన్ చర్యలు తీసుకోబడును." },
        kn: { subject: "ಕಾನೂನು ಡಿಮ್ಯಾಂಡ್ ನೋಟಿಸ್", body: "ಕಾನೂನು ಡಿಮ್ಯಾಂಡ್ ನೋಟಿಸ್\n\nಸ್ವೀಕರ್ತ: {{buyerName}}\n\n{{dueDate}} ರಿಂದ ಬಾಕಿ ಇರುವ {{amount}} ಮೊತ್ತವನ್ನು 15 ದಿನಗಳಲ್ಲಿ ಪಾವತಿಸಿ. ತಪ್ಪಿದರೆ ಎಂ.ಎಸ್.ಎಂ.ಇ ಕಾಯ್ದೆಯಡಿ ಸೂಕ್ತ ಕ್ರಮ ಕೈಗೊಳ್ಳಲಾಗುವುದು." },
        tu: { subject: "ಕಾನೂನು ನೋಟಿಸ್", body: "ಕಾನೂನು ನೋಟಿಸ್\n\nಸ್ವೀಕರ್ತ: {{buyerName}}\n\n{{dueDate}} ಡ್ದು ಬಾಕಿ ಇತ್ತಿನ {{amount}} ಮೊತ್ತ ಬೇಗ ಕಡಪುಲೆ. ಇಜ್ಜಾಂಡ ಕಾನೂನು ಕ್ರಮ ಕೈಗೊಳ್ಳುವ." },
      },
    },
  ];

  for (const t of templates) {
    for (const [lang, val] of Object.entries(t.translations)) {
      await prisma.templateTranslation.create({
        data: {
          templateId: t.templateId,
          languageCode: lang,
          channel: t.channel,
          level: t.level,
          subject: val.subject,
          bodyTemplate: val.body,
          isApproved: true,
          approvedBy: "ChaanBean Senior Legal Counsel",
        },
      });
    }
  }

  // 11. Buyers / Debtors with Varied Risk Flags and Overdue Statuses
  const buyersData = [
    {
      name: "Greenline Retail LLP",
      pan: "AAECG1234H",
      gstin: "27AAECG1234H1Z5",
      mobile: ["9876543210"],
      language: "en",
      email: "finance@greenlineretail.com",
      overdueDays: 0,
      amount: 125000,
    },
    {
      name: "Sunrise Distributors",
      pan: "AAECS5678J",
      gstin: "29AAECS5678J1Z8",
      mobile: ["9123456780"],
      language: "hi",
      email: "accounts@sunrisedist.in",
      overdueDays: 35,
      amount: 480000,
    },
    {
      name: "Metro Supplies Co",
      pan: "AAECM9012K",
      gstin: "GSTRED003",
      mobile: ["9988776655"],
      language: "en",
      email: "billing@metrosupplies.co.in",
      overdueDays: 95,
      amount: 890000,
    },
    {
      name: "Malabar Spices & Trading",
      pan: "AAECM4432L",
      gstin: "32AAECM4432L1Z2",
      mobile: ["9447012345"],
      language: "ml",
      email: "trade@malabarspices.in",
      overdueDays: 42,
      amount: 320000,
    },
  ];

  const buyerIds: string[] = [];

  for (const b of buyersData) {
    const buyer = await prisma.buyerDebtor.create({
      data: {
        companyId: company.id,
        name: b.name,
        pan: b.pan,
        gstin: b.gstin,
        mobileNumbers: JSON.stringify(b.mobile),
        language: b.language,
        email: b.email,
        address: "Commercial Market Complex, Sector 18",
      },
    });
    buyerIds.push(buyer.id);

    const creditAccount = await prisma.creditAccount.create({
      data: {
        buyerId: buyer.id,
        outstandingAmount: b.amount,
        creditLimit: 0,
        dueDate: new Date(Date.now() - b.overdueDays * 86400000),
        overdueStatus: b.overdueDays > 60 ? "defaulted" : b.overdueDays > 30 ? "overdue" : b.overdueDays > 0 ? "due" : "current",
        penalInterestRate: 20.25,
      },
    });

    // Special setup for Red buyer (Metro Supplies Co)
    if (b.gstin === "GSTRED003") {
      const calc = calculateMSMEPenalInterest(b.amount, creditAccount.dueDate);

      const notice = await prisma.legalNotice.create({
        data: {
          creditAccountId: creditAccount.id,
          templateId: "legal_notice_demand_v1",
          channel: "registered_post_email",
          govReferenceId: "IT-GST-ACK-2024-8891",
          contentHash: "hash_l3_metro_demand_notice",
          status: "served",
        },
      });

      await prisma.legalEvidenceLog.create({
        data: {
          relatedEntityType: "legal_notice",
          relatedEntityId: notice.id,
          channel: "legal_notice",
          contentHash: "hash_l3_metro_demand_notice",
          deliveredAt: new Date(Date.now() - 12 * 86400000),
          metadata: JSON.stringify({
            govReferenceId: "IT-GST-ACK-2024-8891",
            incomeTaxAck: "ITD-DISPUTE-ACK-99214",
            gstAck: "GSTN-DRC-01A-44321",
            method: "Speed Post & Registered Email",
          }),
        },
      });

      await prisma.arbitrationCase.create({
        data: {
          creditAccountId: creditAccount.id,
          caseNumber: "ARB-CB-2024-001",
          status: "hearing_scheduled",
          assignedLegalOwner: "Adv. Rajesh Nair (ChaanBean Legal Desk)",
          claimantName: "Acme Traders Pvt Ltd",
          respondentName: "Metro Supplies Co",
          principalAmount: b.amount,
          penalInterestRate: calc.statutoryRatePercent,
          accruedInterest: calc.accruedInterest,
          totalClaimAmount: calc.totalPayable,
          statutoryBasis: calc.statutorySection,
          settlementTerms: "Payment of ₹10,24,000 in 2 monthly installments.",
          eSignStatus: "initiator_signed",
          eSignSignatures: JSON.stringify([
            {
              name: "Harish Parekh",
              role: "Claimant Signatory",
              signedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
              authMode: "Aadhaar e-Sign Verified",
            },
          ]),
          hearings: JSON.stringify([
            {
              hearingDate: new Date(Date.now() + 5 * 86400000).toISOString(),
              venue: "ChaanBean Virtual Arbitration Room 2",
              arbitrator: "Sole Arbitrator Retd. District Judge K. Raman",
            },
          ]),
        },
      });

      await prisma.escalationState.create({
        data: {
          creditAccountId: creditAccount.id,
          currentLevel: "L3",
          history: JSON.stringify([
            { level: "L1", action: "polite_reminder", channel: "whatsapp", at: new Date(Date.now() - 75 * 86400000).toISOString() },
            { level: "L2", action: "firm_reminder", channel: "voice", at: new Date(Date.now() - 45 * 86400000).toISOString() },
            { level: "L3", action: "send_legal_notice", channel: "legal_notice", govReferenceId: "IT-GST-ACK-2024-8891", at: new Date(Date.now() - 15 * 86400000).toISOString() },
            { level: "L3", action: "escalate_arbitration", channel: "arbitration", at: new Date(Date.now() - 3 * 86400000).toISOString() },
          ]),
          nextActionAt: new Date(Date.now() + 48 * 3600000),
        },
      });
    }

    // Special setup for Malayalam Buyer (Malabar Spices & Trading)
    if (b.language === "ml") {
      await prisma.escalationState.create({
        data: {
          creditAccountId: creditAccount.id,
          currentLevel: "L2",
          history: JSON.stringify([
            { level: "L1", action: "polite_reminder", channel: "whatsapp", at: new Date(Date.now() - 20 * 86400000).toISOString() },
            { level: "L2", action: "firm_reminder", channel: "voice", at: new Date(Date.now() - 2 * 86400000).toISOString() },
          ]),
          nextActionAt: new Date(Date.now() + 24 * 3600000),
        },
      });
    }
  }

  // Compute Risk Flags with realistic inputs
  console.log("Computing risk flags...");
  await refreshBuyerRiskFlag(buyerIds[0]); // Greenline -> Green
  await refreshBuyerRiskFlag(buyerIds[1]); // Sunrise -> Amber
  await refreshBuyerRiskFlag(buyerIds[2], 1); // Metro -> Red (1 peer default)
  await refreshBuyerRiskFlag(buyerIds[3]); // Malabar -> Amber

  // 12. Campaign & Calls
  const campaign = await prisma.campaign.create({
    data: {
      companyId: company.id,
      name: "Q3 Outbound Recovery Drive",
      targetBuyers: JSON.stringify(buyerIds),
      callingWindow: "09:00-18:00",
      frequency: "daily",
      status: "active",
    },
  });

  for (let i = 0; i < buyerIds.length; i++) {
    const statuses = ["answered", "busy", "answered", "no_answer"];
    await prisma.call.create({
      data: {
        campaignId: campaign.id,
        buyerId: buyerIds[i],
        attemptNo: 1,
        scheduledAt: new Date(Date.now() - (i + 1) * 3600000),
        calledAt: new Date(Date.now() - i * 3600000),
        status: statuses[i % statuses.length],
        durationSec: statuses[i % statuses.length] === "answered" ? 38 : 0,
        audioRef: "https://chaanbean-audio-assets.s3.ap-south-1.amazonaws.com/voice/announcement.mp3",
        outcomeNotes: "Asterisk PBX / Vobiz SIP Trunk (SIP-VOBIZ-ACK-8819). One-way announcement completed.",
      },
    });
  }

  console.log("Seeding complete successfully!");
  console.log(`Demo Company ID: ${company.id}`);
  console.log(`Admin Owner: ${owner.email} | Team Member: ${rep.email}`);
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
