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
  console.log("Initializing clean ChaanBean platform data (Production Launch State)...");

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

  // 4. Initial Tenant Company Shell (Acme Traders Pvt Ltd)
  const company = await prisma.company.create({
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

  // 5. Verification Wallet Ledgers (Quotas & Pricing per report)
  for (const rt of REPORT_TYPES) {
    await prisma.walletUsageLedger.create({
      data: {
        companyId: company.id,
        reportType: rt,
        timesUsed: 0,
        available: 250, // Initial quota included in Growth plan
        cost: 25,
      },
    });
  }

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

  console.log("Clean platform data successfully initialized!");
  console.log("No mock debtors, dummy businesses, or synthetic deals injected.");
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
