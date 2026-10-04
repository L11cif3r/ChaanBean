import { PrismaClient } from "@prisma/client";

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
  "gst_monthly_filings",
  "trust_hub_verification",
  "education_marksheet_check",
  "pan_to_gst",
  "voice_call_cadence",
  "legal_notice_suite",
  "delayed_payment_followup",
  "subscription_seats",
];

async function main() {
  console.log("Initializing ChaanBean platform data (Clean Launch State + Enterprise Scenarios)...");

  // 1. Purge existing tables in relational integrity order
  await prisma.bizAuditLog.deleteMany();
  await prisma.manualReview.deleteMany();
  await prisma.verificationTask.deleteMany();
  await prisma.courtCase.deleteMany();
  await prisma.creditRecommendation.deleteMany();
  await prisma.bizRiskFlag.deleteMany();
  await prisma.bizRiskSignal.deleteMany();
  await prisma.financialConsistencyCheck.deleteMany();
  await prisma.financialYearSummary.deleteMany();
  await prisma.financialMetric.deleteMany();
  await prisma.financialExtraction.deleteMany();
  await prisma.financialDocument.deleteMany();
  await prisma.businessSourceRecord.deleteMany();
  await prisma.businessIdentifier.deleteMany();
  await prisma.businessProfile.deleteMany();

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

  await prisma.legalFeeLedger.deleteMany();
  await prisma.legalEvidencePack.deleteMany();
  await prisma.legalAdvisor.deleteMany();
  await prisma.paymentReconciliation.deleteMany();
  await prisma.paymentLink.deleteMany();
  await prisma.promiseToPay.deleteMany();
  await prisma.creditHold.deleteMany();
  await prisma.monitoringAlert.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.aiDecisionLog.deleteMany();
  await prisma.erpSyncConfig.deleteMany();

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

  // 2. Administrative Users
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

  // 3. CRM Pipeline Stages
  const stageDefs = [
    { name: "New Lead", order: 1, color: "#3b82f6" },
    { name: "Contacted", order: 2, color: "#8b5cf6" },
    { name: "Qualified", order: 3, color: "#f59e0b" },
    { name: "Proposal Sent", order: 4, color: "#ec4899" },
    { name: "Won", order: 5, color: "#10b981" },
    { name: "Lost", order: 6, color: "#ef4444" },
  ];

  for (const s of stageDefs) {
    await prisma.pipelineStage.create({ data: s });
  }

  // =========================================================================
  // 4. TENANT 1: Acme Traders Pvt Ltd (Clean State / First Time User Login)
  // Completely empty, 0 mock debtors, 0 transactions, clean launch state.
  // =========================================================================
  const cleanCompany = await prisma.company.create({
    data: {
      name: "Acme Traders Pvt Ltd",
      plan: "growth",
      walletBalance: 285000,
      kycStatus: "verified",
      roles: "admin,operator",
      industry: "Wholesale & Industrial Distribution",
      healthScore: "Healthy",
      signupDate: new Date(),
      lastActiveAt: new Date(),
    },
  });

  for (const rt of REPORT_TYPES) {
    await prisma.walletUsageLedger.create({
      data: {
        companyId: cleanCompany.id,
        reportType: rt,
        timesUsed: 0,
        available: 250,
        cost: 25,
      },
    });
  }

  // =========================================================================
  // 5. TENANT 2: ABC Industry (Enterprise Subscription Plan with 3 Scenarios)
  // Credentials: enterprise@abcindustry.in / ABCIndustry@Enterprise2026!
  // =========================================================================
  const enterpriseCompany = await prisma.company.create({
    data: {
      name: "ABC Industry",
      plan: "enterprise",
      walletBalance: 350000, // Enterprise subscription wallet
      kycStatus: "verified",
      roles: "admin,operator,finance,legal,auditor", // 5 user seats
      industry: "Precision Engineering & Heavy Manufacturing",
      healthScore: "Healthy",
      signupDate: new Date(),
      lastActiveAt: new Date(),
    },
  });

  for (const rt of REPORT_TYPES) {
    await prisma.walletUsageLedger.create({
      data: {
        companyId: enterpriseCompany.id,
        reportType: rt,
        timesUsed: rt === "director_details" || rt === "gst_supreme_report" ? 2 : 0,
        available: 500,
        cost: 25,
      },
    });
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1: You (ABC Industry) performing a check on PP Industry.
  // Credit check & Business security check done, all documents uploaded.
  // Due date established based on the date provided by PP Industry (45-day tenor).
  // -------------------------------------------------------------------------
  const ppBiz = await prisma.businessProfile.create({
    data: {
      companyName: "PP Industry",
      gstin: "27AABCP1234P1Z8",
      pan: "AABCP1234P",
      cin: "U29253MH2016PTC288100",
      udyamNo: "UDYAM-MH-33-0091244",
      phone: "+91 98205 11223",
      registeredAddr: "Plot 42, MIDC Industrial Area, Phase II, Taloja, Navi Mumbai, Maharashtra 410208",
      primaryActivity: "Industrial Polymer & Component Manufacturing",
      enterpriseType: "Medium Enterprise",
      overallStatus: "VERIFIED",
      sourceStatus: "COMPLETED",
      createdBy: enterpriseCompany.id,
    },
  });

  // Uploaded Financial & Compliance Documents
  await prisma.financialDocument.create({
    data: {
      businessId: ppBiz.id,
      originalName: "PP_Industry_Audited_BalanceSheet_FY24_25.pdf",
      storagePath: "/docs/pp_industry/Audited_BalanceSheet_FY24_25.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 2450000,
      category: "BALANCE_SHEET",
      fiscalYear: "2024-25",
      processingStatus: "PROCESSED",
      processedAt: new Date(),
    },
  });

  await prisma.financialDocument.create({
    data: {
      businessId: ppBiz.id,
      originalName: "GSTR3B_Annual_Tax_Filings_2024_25.pdf",
      storagePath: "/docs/pp_industry/GSTR3B_Tax_Filings.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1820000,
      category: "GSTR_3B",
      fiscalYear: "2024-25",
      processingStatus: "PROCESSED",
      processedAt: new Date(),
    },
  });

  await prisma.financialDocument.create({
    data: {
      businessId: ppBiz.id,
      originalName: "Board_Resolution_Authorized_Signatory.pdf",
      storagePath: "/docs/pp_industry/Board_Resolution.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 620000,
      category: "BOARD_RESOLUTION",
      fiscalYear: "2024-25",
      processingStatus: "PROCESSED",
      processedAt: new Date(),
    },
  });

  // Credit & Security Check Risk Flag: GREEN (Score: 85/100)
  await prisma.bizRiskFlag.create({
    data: {
      businessId: ppBiz.id,
      flag: "GREEN",
      compositeScore: 85.0,
      signalBreakdown: JSON.stringify({
        gstCompliance: 96,
        bankLedgerHealth: 88,
        litigationRisk: 95,
        directorIntegrity: 92,
        financialConsistency: 84,
      }),
      recommendedLimit: 2500000,
      recommendedTenor: 45,
    },
  });

  await prisma.creditRecommendation.create({
    data: {
      businessId: ppBiz.id,
      creditLimit: 2500000,
      tenor: 45,
      flag: "GREEN",
      rationale:
        "Comprehensive credit check and business security check completed after document verification. Audited financials, GSTR-3B filings, and board authorization verified. Credit limit of ₹25,00,000 recommended with 45-day statutory payment term agreed by PP Industry.",
      signalRefs: JSON.stringify(["AUDITED_BS_FY25", "GSTR3B_VERIFIED", "MCA_ACTIVE"]),
    },
  });

  // Debtor Account for PP Industry with due date established based on date provided by PP Industry
  const ppBuyer = await prisma.buyerDebtor.create({
    data: {
      companyId: enterpriseCompany.id,
      name: "PP Industry",
      contactPerson: "Prakash Patel (Managing Director)",
      email: "accounts@ppindustry.in",
      mobileNumbers: JSON.stringify([
        "+91 98205 11223",
        "+91 98205 99881",
        "+91 97110 44332",
      ]),
      gstin: "27AABCP1234P1Z8",
      pan: "AABCP1234P",
      address: "Plot 42, MIDC Industrial Area, Phase II, Taloja, Navi Mumbai, Maharashtra 410208",
      language: "en",
    },
  });

  // Established Due Date based on date provided by PP Industry (e.g. 45 days: 30-Oct-2026)
  const ppDueDate = new Date("2026-10-30T00:00:00.000Z");
  const ppCreditAccount = await prisma.creditAccount.create({
    data: {
      buyerId: ppBuyer.id,
      outstandingAmount: 1250000,
      creditLimit: 2500000,
      tenorDays: 45,
      dueDate: ppDueDate,
      overdueStatus: "current", // Due date established, not overdue
      penalInterestRate: 18.0,
      disputeStatus: "none",
    },
  });

  await prisma.invoice.create({
    data: {
      creditAccountId: ppCreditAccount.id,
      buyerId: ppBuyer.id,
      invoiceNumber: "INV-PP-2026-0089",
      invoiceDate: new Date("2026-09-15T00:00:00.000Z"),
      dueDate: ppDueDate,
      amount: 1250000,
      status: "current",
      ageingBucket: "0-30",
      notes: JSON.stringify({
        terms: "45 Days Tenor agreed with PP Industry",
        documentStatus: "All KYC, Audited Balance Sheet, and GST Filings Uploaded & Verified",
      }),
    },
  });

  // -------------------------------------------------------------------------
  // SCENARIO 2: MB Industry hasn't paid back ABC Industry in the last two years.
  // Critical default (>730 days overdue). Recovery process: Call him every 5 minutes.
  // Alternate number options available to call from.
  // -------------------------------------------------------------------------
  const mbBuyer = await prisma.buyerDebtor.create({
    data: {
      companyId: enterpriseCompany.id,
      name: "MB Industry",
      contactPerson: "Mahesh Bhansali (Director)",
      email: "finance@mbindustry.in",
      mobileNumbers: JSON.stringify([
        "+91 98200 44551", // Primary Mobile (Managing Director)
        "+91 98199 88772", // Alternate 1: MD Alternate SIM (Jio 5G - DoT Verified, 4.2 yrs active)
        "+91 99300 11223", // Alternate 2: Finance Controller Mobile (Airtel - GST Signatory, 6.1 yrs active)
        "+91 97680 33445", // Alternate 3: Secondary Branch Registered SIM (Vi - MCA Record, 1.8 yrs active)
      ]),
      gstin: "27AAECG9988M1Z2",
      pan: "AAECG9988M",
      address: "Shed 18-20, GIDC Industrial Estate, Umbergaon, Gujarat 396171",
      language: "en",
    },
  });

  // 2 Years Overdue (735 days)
  const mbTwoYearsOverdueDate = new Date(Date.now() - 735 * 86400000);
  const mbCreditAccount2Y = await prisma.creditAccount.create({
    data: {
      buyerId: mbBuyer.id,
      outstandingAmount: 1840000, // ₹18,40,000 overdue for 2 years
      creditLimit: 1000000,
      tenorDays: 30,
      dueDate: mbTwoYearsOverdueDate,
      overdueStatus: "defaulted",
      penalInterestRate: 20.25, // 3x RBI bank rate
      disputeStatus: "none",
    },
  });

  await prisma.escalationState.create({
    data: {
      creditAccountId: mbCreditAccount2Y.id,
      currentLevel: "L1",
      history: JSON.stringify([
        {
          timestamp: new Date(Date.now() - 730 * 86400000).toISOString(),
          action: "Commercial liability passed 30-day tenor. Initial reminder sent.",
        },
        {
          timestamp: new Date(Date.now() - 365 * 86400000).toISOString(),
          action: "1-Year uncollected milestone reached. Categorized as High-Risk Chronic Defaulter.",
        },
        {
          timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
          action: "Automated Call Cadence activated: Calling every 5 minutes with Emergency 24/7 Override.",
        },
      ]),
    },
  });

  // Recent 5-minute cadence call attempts
  const now = Date.now();
  await prisma.call.create({
    data: {
      buyerId: mbBuyer.id,
      attemptNo: 48,
      scheduledAt: new Date(now - 15 * 60000),
      calledAt: new Date(now - 15 * 60000),
      status: "no_answer",
      durationSec: 0,
      outcomeNotes: "Dialer cadence (Every 5 Mins) - Ringing timeout on primary number +91 98200 44551. Routing to alternate line.",
    },
  });

  await prisma.call.create({
    data: {
      buyerId: mbBuyer.id,
      attemptNo: 49,
      scheduledAt: new Date(now - 10 * 60000),
      calledAt: new Date(now - 10 * 60000),
      status: "busy",
      durationSec: 0,
      outcomeNotes: "Dialer cadence (Every 5 Mins) - User busy on alternate line 1 (+91 98199 88772). Next retry in 5 minutes.",
    },
  });

  await prisma.call.create({
    data: {
      buyerId: mbBuyer.id,
      attemptNo: 50,
      scheduledAt: new Date(now - 5 * 60000),
      calledAt: new Date(now - 5 * 60000),
      status: "no_answer",
      durationSec: 0,
      outcomeNotes: "Dialer cadence (Every 5 Mins) - Unanswered on alternate line 2 (+91 99300 11223). ₹0 deducted from wallet.",
    },
  });

  // -------------------------------------------------------------------------
  // SCENARIO 3: MB Industry is a defaulter for ABC Industry, no payment for 2 months (60 days).
  // Payment recovery telephony methods haven't yet made him pay back.
  // Ready to shoot statutory legal notice (Income Tax 43B(h), MSMED §18, GST DRC-01A).
  // -------------------------------------------------------------------------
  const mbBuyerScenario3 = await prisma.buyerDebtor.create({
    data: {
      companyId: enterpriseCompany.id,
      name: "MB Industry (Unit 2 - Legal Docket)",
      contactPerson: "Mahesh Bhansali (Promoter)",
      email: "legal.notice@mbindustry.in",
      mobileNumbers: JSON.stringify([
        "+91 98200 44551",
        "+91 98199 88772",
        "+91 99300 11223",
      ]),
      gstin: "27AAECG9988M1Z2",
      pan: "AAECG9988M",
      address: "Plot 12, Wagle Industrial Estate, Road No. 16, Thane, Maharashtra 400604",
      language: "en",
    },
  });

  // Exactly 60 Days Overdue (2 Months Default)
  const mbTwoMonthsOverdueDate = new Date(Date.now() - 60 * 86400000);
  const mbCreditAccount60D = await prisma.creditAccount.create({
    data: {
      buyerId: mbBuyerScenario3.id,
      outstandingAmount: 680000, // ₹6,80,000 overdue for 2 months
      creditLimit: 500000,
      tenorDays: 30,
      dueDate: mbTwoMonthsOverdueDate,
      overdueStatus: "overdue",
      penalInterestRate: 20.25,
      disputeStatus: "none",
    },
  });

  await prisma.escalationState.create({
    data: {
      creditAccountId: mbCreditAccount60D.id,
      currentLevel: "L2", // Escalated to Level 2 Legal Action
      history: JSON.stringify([
        {
          timestamp: new Date(Date.now() - 60 * 86400000).toISOString(),
          action: "Payment overdue by 60 days (2 months). Telephony call recovery sequence initiated.",
        },
        {
          timestamp: new Date(Date.now() - 14 * 86400000).toISOString(),
          action: "12 voice call attempts completed with no settlement commitment received.",
        },
        {
          timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
          action: "Telephony recovery exhausted. Escalated to Statutory Legal Notice transmission.",
        },
      ]),
    },
  });

  await prisma.call.create({
    data: {
      buyerId: mbBuyerScenario3.id,
      attemptNo: 12,
      scheduledAt: new Date(now - 24 * 3600000),
      calledAt: new Date(now - 24 * 3600000),
      status: "no_answer",
      durationSec: 0,
      outcomeNotes: "Final telephony recovery attempt failed. Debtor refusing settlement. Case ready for statutory legal notice.",
    },
  });

  // Pre-seed a draft legal notice ready to shoot / dispatch
  await prisma.legalNotice.create({
    data: {
      creditAccountId: mbCreditAccount60D.id,
      templateId: "tpl_notice_43bh",
      channel: "registered_post_email_gst_it",
      govReferenceId: "ITD-43BH-2026-981042",
      contentHash: "sha256-mb-industry-60d-statutory-notice-draft",
      status: "served",
      sentAt: new Date(Date.now() - 2 * 3600000),
    },
  });

  // 6. Statutory Notice & Voice Call Translation Templates
  const noticeTemplates = [
    {
      templateId: "tpl_voice_l1",
      languageCode: "en",
      channel: "voice",
      level: "L1",
      subject: "Friendly Invoice Payment Reminder",
      bodyTemplate:
        "Hello, this is ChaanBean calling on behalf of {{companyName}}. Invoice number {{invoiceNo}} for rupees {{amount}} is due on {{dueDate}}. Kindly arrange payment at the earliest to prevent statutory interest accrual.",
    },
    {
      templateId: "tpl_voice_l1",
      languageCode: "hi",
      channel: "voice",
      level: "L1",
      subject: "बिल भुगतान स्मरण पत्र",
      bodyTemplate:
        "नमस्ते, मैं {{companyName}} की ओर से कॉल कर रहा हूँ। बिल संख्या {{invoiceNo}} की राशि {{amount}} रुपये की देय तिथि {{dueDate}} है। कृपया समय पर भुगतान करें।",
    },
    {
      templateId: "l2_voice_reminder_v1",
      languageCode: "en",
      channel: "voice",
      level: "L2",
      subject: "Urgent Payment Recovery Demand",
      bodyTemplate:
        "Urgent notice for {{buyerName}}: An overdue liability of rupees {{amount}} due since {{dueDate}} remains unsettled. Immediate payment is required to avoid legal escalation under Section 43B(h) and MSMED Act 2006.",
    },
    {
      templateId: "l2_voice_reminder_v1",
      languageCode: "hi",
      channel: "voice",
      level: "L2",
      subject: "तत्काल भुगतान वसूली मांग",
      bodyTemplate:
        "{{buyerName}} के लिए महत्वपूर्ण सूचना: {{amount}} रुपये की अतिदेय राशि जो {{dueDate}} से देय है, अभी तक बकाया है। कानूनी कार्रवाई से बचने के लिए तत्काल भुगतान करें।",
    },
    {
      templateId: "tpl_notice_43bh",
      languageCode: "en",
      channel: "legal_notice",
      level: "L2",
      subject: "Statutory Notice under Section 43B(h) Income Tax Act",
      bodyTemplate:
        "FORMAL STATUTORY DEMAND NOTICE: In accordance with Section 43B(h) of the Income Tax Act 1961, your outstanding commercial liability of INR {{amount}} to {{companyName}} must be cleared within 45 days. Delayed payment shall result in complete disallowance of tax deduction.",
    },
    {
      templateId: "tpl_notice_msmed",
      languageCode: "en",
      channel: "legal_notice",
      level: "L3",
      subject: "Notice of Arbitration under Section 18 MSMED Act 2006",
      bodyTemplate:
        "NOTICE OF LEGAL ARBITRATION FILING: Notice is hereby given under Section 18 of the Micro, Small and Medium Enterprises Development Act 2006. Outstanding debt of INR {{amount}} is now referred to the MSME Facilitation Council with statutory compound interest at 3 times RBI Bank Rate (20.25% p.a.).",
    },
  ];

  for (const t of noticeTemplates) {
    await prisma.templateTranslation.create({ data: t });
  }

  console.log("Database successfully seeded!");
  console.log("Clean Tenant (Acme Traders Pvt Ltd): 0 mock debtors (Pristine clean state)");
  console.log("Enterprise Tenant (ABC Industry): 3 specific scenarios seeded:");
  console.log("  1. PP Industry - Credit & Business Security Check, Uploaded Financial Docs, Established Due Date (45-Day Tenor)");
  console.log("  2. MB Industry - 2 Years Overdue (₹18.4L), 5-Min Cadence Dialer, Alternate Numbers Selection");
  console.log("  3. MB Industry - 2 Months Overdue (₹6.8L), Telephony Recovery Failed, Statutory Legal Notice Docket Ready");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
