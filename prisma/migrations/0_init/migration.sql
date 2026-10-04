-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'growth',
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "kycStatus" TEXT NOT NULL DEFAULT 'verified',
    "roles" TEXT NOT NULL DEFAULT 'admin,operator',
    "industry" TEXT DEFAULT 'Manufacturing & Trading',
    "healthScore" TEXT NOT NULL DEFAULT 'Healthy',
    "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscriptionExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerDebtor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "mobileNumbers" TEXT NOT NULL,
    "pan" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerDebtor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAccount" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "outstandingAmount" DOUBLE PRECISION NOT NULL,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tenorDays" INTEGER NOT NULL DEFAULT 30,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "overdueStatus" TEXT NOT NULL DEFAULT 'current',
    "penalInterestRate" DOUBLE PRECISION NOT NULL DEFAULT 18.0,
    "disputeStatus" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationReport" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "rawPayload" TEXT NOT NULL,
    "normalizedPayload" TEXT NOT NULL,
    "requestedBy" TEXT,
    "cachedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReportLibrary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "subjectId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL DEFAULT 'business',
    "reportType" TEXT NOT NULL,
    "reportTitle" TEXT NOT NULL,
    "costPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportData" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserReportLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "signalBreakdown" TEXT NOT NULL,
    "recommendedLimit" DOUBLE PRECISION NOT NULL,
    "recommendedTenor" INTEGER NOT NULL DEFAULT 30,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustProfile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "trustId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'network',
    "linkedReports" TEXT NOT NULL,
    "complianceBadges" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityDefault" (
    "id" TEXT NOT NULL,
    "reportingCompanyId" TEXT NOT NULL,
    "debtorGstin" TEXT,
    "debtorPan" TEXT,
    "debtorName" TEXT NOT NULL,
    "amountDefaulted" DOUBLE PRECISION NOT NULL,
    "defaultDate" TIMESTAMP(3) NOT NULL,
    "evidenceDocUrl" TEXT,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorTrustId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Raw Materials',
    "pan" TEXT,
    "gstin" TEXT,
    "cin" TEXT,
    "turnoverRange" TEXT DEFAULT 'Γé╣1.5CrΓÇô5Cr',
    "trustScore" INTEGER NOT NULL DEFAULT 85,
    "kycStatus" TEXT NOT NULL DEFAULT 'verified',
    "onboardingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "directorDetails" TEXT,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetBuyers" TEXT NOT NULL,
    "callingWindow" TEXT NOT NULL DEFAULT '09:00-18:00',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationState" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL DEFAULT 'L1',
    "history" TEXT NOT NULL,
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscalationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT,
    "buyerId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "calledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "audioRef" TEXT,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "outcomeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAudioAsset" (
    "id" TEXT NOT NULL,
    "messageHash" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "voiceConfig" TEXT NOT NULL,
    "s3Url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateTranslation" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "subject" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT DEFAULT 'Legal Review Desk',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalNotice" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'registered_post_email',
    "govReferenceId" TEXT,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'served',

    CONSTRAINT "LegalNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEvidenceLog" (
    "id" TEXT NOT NULL,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "LegalEvidenceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArbitrationCase" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "assignedLegalOwner" TEXT,
    "assignedAdvisorId" TEXT,
    "claimantName" TEXT,
    "respondentName" TEXT,
    "principalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penalInterestRate" DOUBLE PRECISION NOT NULL DEFAULT 21.75,
    "accruedInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalClaimAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statutoryBasis" TEXT NOT NULL DEFAULT 'Micro, Small and Medium Enterprises Development (MSMED) Act, 2006 (Section 16)',
    "settlementTerms" TEXT,
    "settlementDocUrl" TEXT,
    "eSignStatus" TEXT NOT NULL DEFAULT 'pending',
    "eSignSignatures" TEXT,
    "hearings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArbitrationCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletUsageLedger" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 100,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 50,

    CONSTRAINT "WalletUsageLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'team_member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'organic',
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "assignedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 50,
    "stageId" TEXT NOT NULL,
    "ownerId" TEXT,
    "winLossReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "stageUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesActivity" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "leadId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'note',
    "description" TEXT NOT NULL,
    "performedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'inbound',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSource" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "utmCampaign" TEXT,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "dealsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAttribution" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "campaignSourceId" TEXT,
    "touchpointType" TEXT NOT NULL DEFAULT 'first_touch',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyFinancial" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "newMRR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expansionMRR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnedMRR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMRR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "activeCustomers" INTEGER NOT NULL DEFAULT 0,
    "reportsPulled" INTEGER NOT NULL DEFAULT 0,
    "dealsWon" INTEGER NOT NULL DEFAULT 0,
    "dealsLost" INTEGER NOT NULL DEFAULT 0,
    "grossRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyFinancial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "gstin" TEXT,
    "cin" TEXT,
    "pan" TEXT,
    "udyamNo" TEXT,
    "phone" TEXT,
    "registeredAddr" TEXT,
    "incorporatedOn" TIMESTAMP(3),
    "enterpriseType" TEXT,
    "industryCode" TEXT,
    "primaryActivity" TEXT,
    "overallStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessIdentifier" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "identifierType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sourceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSourceRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
    "rawPayload" TEXT NOT NULL,
    "parsedFields" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "BusinessSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialDocument" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "fiscalYear" TEXT,
    "processingStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "processingError" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialExtraction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "extractionMethod" TEXT NOT NULL,
    "rawText" TEXT,
    "fields" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'HIGH',
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialMetric" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'INR',
    "sourceDocId" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'HIGH',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialYearSummary" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "revenue" DOUBLE PRECISION,
    "cogs" DOUBLE PRECISION,
    "grossProfit" DOUBLE PRECISION,
    "grossMarginPct" DOUBLE PRECISION,
    "ebitda" DOUBLE PRECISION,
    "ebitdaMarginPct" DOUBLE PRECISION,
    "netProfit" DOUBLE PRECISION,
    "netMarginPct" DOUBLE PRECISION,
    "totalAssets" DOUBLE PRECISION,
    "totalLiabilities" DOUBLE PRECISION,
    "equity" DOUBLE PRECISION,
    "debtToEquity" DOUBLE PRECISION,
    "currentRatio" DOUBLE PRECISION,
    "bankInflows" DOUBLE PRECISION,
    "bankOutflows" DOUBLE PRECISION,
    "gstTurnover" DOUBLE PRECISION,
    "revenueSource" TEXT,
    "dataCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialYearSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialConsistencyCheck" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "checkName" TEXT NOT NULL,
    "fiscalYear" TEXT,
    "valueA" DOUBLE PRECISION,
    "labelA" TEXT,
    "valueB" DOUBLE PRECISION,
    "labelB" TEXT,
    "discrepancyPct" DOUBLE PRECISION,
    "result" TEXT NOT NULL DEFAULT 'PASS',
    "note" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialConsistencyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizRiskSignal" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "signalCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'AMBER',
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rationale" TEXT NOT NULL,
    "sourceRefs" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizRiskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizRiskFlag" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "compositeScore" DOUBLE PRECISION NOT NULL,
    "signalBreakdown" TEXT NOT NULL,
    "hardRedFlags" TEXT,
    "recommendedLimit" DOUBLE PRECISION NOT NULL,
    "recommendedTenor" INTEGER NOT NULL DEFAULT 30,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "configSnapshot" TEXT,

    CONSTRAINT "BizRiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditRecommendation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "creditLimit" DOUBLE PRECISION NOT NULL,
    "tenor" INTEGER NOT NULL DEFAULT 30,
    "flag" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "signalRefs" TEXT NOT NULL,
    "documentTrail" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtCase" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "caseNumber" TEXT,
    "courtName" TEXT,
    "filingDate" TIMESTAMP(3),
    "caseType" TEXT,
    "status" TEXT,
    "partyRole" TEXT,
    "description" TEXT,
    "sourceStatus" TEXT NOT NULL DEFAULT 'USER_PROVIDED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourtCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationTask" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "error" TEXT,
    "retriesCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualReview" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reviewType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "promptText" TEXT NOT NULL,
    "portalUrl" TEXT,
    "submittedData" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizAuditLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actor" TEXT,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BizAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "ageingBucket" TEXT NOT NULL DEFAULT 'current',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringAlert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "acknowledgedBy" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonitoringAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditHold" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "placedBy" TEXT DEFAULT 'Risk Engine',
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromiseToPay" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "promisedDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMode" TEXT DEFAULT 'NEFT/RTGS',
    "notes" TEXT,
    "recordedBy" TEXT DEFAULT 'Agent',
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromiseToPay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLink" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "creditAccountId" TEXT,
    "invoiceId" TEXT,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paymentMode" TEXT NOT NULL DEFAULT 'bank_transfer',
    "referenceNo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'matched',
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAdvisor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firmName" TEXT,
    "barCouncilNo" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'verified',
    "contactEmail" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "activeCasesCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 92.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAdvisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEvidencePack" (
    "id" TEXT NOT NULL,
    "creditAccountId" TEXT NOT NULL,
    "arbitrationCaseId" TEXT,
    "title" TEXT NOT NULL,
    "bundleUrl" TEXT,
    "documentsList" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generatedBy" TEXT NOT NULL DEFAULT 'Legal Desk',
    "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalEvidencePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalFeeLedger" (
    "id" TEXT NOT NULL,
    "arbitrationCaseId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "feeType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'escrowed',
    "transactionRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalFeeLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiDecisionLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "modelUsed" TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "flaggedForHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "decisionSummary" TEXT NOT NULL,
    "rawResponse" TEXT,
    "reviewedBy" TEXT,
    "reviewAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDecisionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErpSyncConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiEndpoint" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'ready',
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ErpSyncConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BuyerDebtor_companyId_idx" ON "BuyerDebtor"("companyId");

-- CreateIndex
CREATE INDEX "CreditAccount_buyerId_idx" ON "CreditAccount"("buyerId");

-- CreateIndex
CREATE INDEX "VerificationReport_subjectType_subjectId_reportType_idx" ON "VerificationReport"("subjectType", "subjectId", "reportType");

-- CreateIndex
CREATE INDEX "VerificationReport_cachedUntil_idx" ON "VerificationReport"("cachedUntil");

-- CreateIndex
CREATE INDEX "UserReportLibrary_companyId_subjectId_idx" ON "UserReportLibrary"("companyId", "subjectId");

-- CreateIndex
CREATE INDEX "UserReportLibrary_companyId_reportType_idx" ON "UserReportLibrary"("companyId", "reportType");

-- CreateIndex
CREATE INDEX "RiskFlag_buyerId_idx" ON "RiskFlag"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustProfile_trustId_key" ON "TrustProfile"("trustId");

-- CreateIndex
CREATE INDEX "CommunityDefault_debtorGstin_idx" ON "CommunityDefault"("debtorGstin");

-- CreateIndex
CREATE INDEX "CommunityDefault_debtorPan_idx" ON "CommunityDefault"("debtorPan");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorTrustId_key" ON "Vendor"("vendorTrustId");

-- CreateIndex
CREATE INDEX "EscalationState_creditAccountId_idx" ON "EscalationState"("creditAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAudioAsset_messageHash_key" ON "MessageAudioAsset"("messageHash");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateTranslation_templateId_languageCode_key" ON "TemplateTranslation"("templateId", "languageCode");

-- CreateIndex
CREATE INDEX "LegalEvidenceLog_relatedEntityType_relatedEntityId_idx" ON "LegalEvidenceLog"("relatedEntityType", "relatedEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "ArbitrationCase_caseNumber_key" ON "ArbitrationCase"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WalletUsageLedger_companyId_reportType_key" ON "WalletUsageLedger"("companyId", "reportType");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineStage_name_key" ON "PipelineStage"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingChannel_name_key" ON "MarketingChannel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyFinancial_year_month_key" ON "MonthlyFinancial"("year", "month");

-- CreateIndex
CREATE INDEX "BusinessProfile_gstin_idx" ON "BusinessProfile"("gstin");

-- CreateIndex
CREATE INDEX "BusinessProfile_cin_idx" ON "BusinessProfile"("cin");

-- CreateIndex
CREATE INDEX "BusinessProfile_pan_idx" ON "BusinessProfile"("pan");

-- CreateIndex
CREATE INDEX "BusinessProfile_createdBy_idx" ON "BusinessProfile"("createdBy");

-- CreateIndex
CREATE INDEX "BusinessIdentifier_businessId_idx" ON "BusinessIdentifier"("businessId");

-- CreateIndex
CREATE INDEX "BusinessIdentifier_value_idx" ON "BusinessIdentifier"("value");

-- CreateIndex
CREATE INDEX "BusinessSourceRecord_businessId_sourceType_idx" ON "BusinessSourceRecord"("businessId", "sourceType");

-- CreateIndex
CREATE INDEX "FinancialDocument_businessId_idx" ON "FinancialDocument"("businessId");

-- CreateIndex
CREATE INDEX "FinancialDocument_businessId_category_idx" ON "FinancialDocument"("businessId", "category");

-- CreateIndex
CREATE INDEX "FinancialExtraction_documentId_idx" ON "FinancialExtraction"("documentId");

-- CreateIndex
CREATE INDEX "FinancialExtraction_businessId_idx" ON "FinancialExtraction"("businessId");

-- CreateIndex
CREATE INDEX "FinancialMetric_businessId_fiscalYear_idx" ON "FinancialMetric"("businessId", "fiscalYear");

-- CreateIndex
CREATE INDEX "FinancialMetric_businessId_metricName_idx" ON "FinancialMetric"("businessId", "metricName");

-- CreateIndex
CREATE INDEX "FinancialYearSummary_businessId_idx" ON "FinancialYearSummary"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialYearSummary_businessId_fiscalYear_key" ON "FinancialYearSummary"("businessId", "fiscalYear");

-- CreateIndex
CREATE INDEX "FinancialConsistencyCheck_businessId_idx" ON "FinancialConsistencyCheck"("businessId");

-- CreateIndex
CREATE INDEX "BizRiskSignal_businessId_idx" ON "BizRiskSignal"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BizRiskFlag_businessId_key" ON "BizRiskFlag"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditRecommendation_businessId_key" ON "CreditRecommendation"("businessId");

-- CreateIndex
CREATE INDEX "CourtCase_businessId_idx" ON "CourtCase"("businessId");

-- CreateIndex
CREATE INDEX "VerificationTask_businessId_idx" ON "VerificationTask"("businessId");

-- CreateIndex
CREATE INDEX "VerificationTask_businessId_taskType_idx" ON "VerificationTask"("businessId", "taskType");

-- CreateIndex
CREATE INDEX "ManualReview_businessId_idx" ON "ManualReview"("businessId");

-- CreateIndex
CREATE INDEX "BizAuditLog_businessId_idx" ON "BizAuditLog"("businessId");

-- CreateIndex
CREATE INDEX "BizAuditLog_businessId_eventType_idx" ON "BizAuditLog"("businessId", "eventType");

-- CreateIndex
CREATE INDEX "Invoice_creditAccountId_idx" ON "Invoice"("creditAccountId");

-- CreateIndex
CREATE INDEX "Invoice_buyerId_idx" ON "Invoice"("buyerId");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "MonitoringAlert_companyId_idx" ON "MonitoringAlert"("companyId");

-- CreateIndex
CREATE INDEX "MonitoringAlert_buyerId_idx" ON "MonitoringAlert"("buyerId");

-- CreateIndex
CREATE INDEX "MonitoringAlert_status_idx" ON "MonitoringAlert"("status");

-- CreateIndex
CREATE INDEX "CreditHold_creditAccountId_idx" ON "CreditHold"("creditAccountId");

-- CreateIndex
CREATE INDEX "PromiseToPay_creditAccountId_idx" ON "PromiseToPay"("creditAccountId");

-- CreateIndex
CREATE INDEX "PromiseToPay_buyerId_idx" ON "PromiseToPay"("buyerId");

-- CreateIndex
CREATE INDEX "PromiseToPay_promisedDate_idx" ON "PromiseToPay"("promisedDate");

-- CreateIndex
CREATE INDEX "PaymentLink_creditAccountId_idx" ON "PaymentLink"("creditAccountId");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_companyId_idx" ON "PaymentReconciliation"("companyId");

-- CreateIndex
CREATE INDEX "PaymentReconciliation_referenceNo_idx" ON "PaymentReconciliation"("referenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "LegalAdvisor_barCouncilNo_key" ON "LegalAdvisor"("barCouncilNo");

-- CreateIndex
CREATE INDEX "LegalEvidencePack_creditAccountId_idx" ON "LegalEvidencePack"("creditAccountId");

-- CreateIndex
CREATE INDEX "LegalFeeLedger_arbitrationCaseId_idx" ON "LegalFeeLedger"("arbitrationCaseId");

-- CreateIndex
CREATE INDEX "LegalFeeLedger_advisorId_idx" ON "LegalFeeLedger"("advisorId");

-- CreateIndex
CREATE INDEX "AiDecisionLog_companyId_idx" ON "AiDecisionLog"("companyId");

-- CreateIndex
CREATE INDEX "AiDecisionLog_module_idx" ON "AiDecisionLog"("module");

-- CreateIndex
CREATE INDEX "ErpSyncConfig_companyId_idx" ON "ErpSyncConfig"("companyId");

-- AddForeignKey
ALTER TABLE "BuyerDebtor" ADD CONSTRAINT "BuyerDebtor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAccount" ADD CONSTRAINT "CreditAccount_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerDebtor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReportLibrary" ADD CONSTRAINT "UserReportLibrary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerDebtor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustProfile" ADD CONSTRAINT "TrustProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityDefault" ADD CONSTRAINT "CommunityDefault_reportingCompanyId_fkey" FOREIGN KEY ("reportingCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationState" ADD CONSTRAINT "EscalationState_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerDebtor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalNotice" ADD CONSTRAINT "LegalNotice_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitrationCase" ADD CONSTRAINT "ArbitrationCase_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbitrationCase" ADD CONSTRAINT "ArbitrationCase_assignedAdvisorId_fkey" FOREIGN KEY ("assignedAdvisorId") REFERENCES "LegalAdvisor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletUsageLedger" ADD CONSTRAINT "WalletUsageLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesActivity" ADD CONSTRAINT "SalesActivity_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSource" ADD CONSTRAINT "CampaignSource_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAttribution" ADD CONSTRAINT "LeadAttribution_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAttribution" ADD CONSTRAINT "LeadAttribution_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "MarketingChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAttribution" ADD CONSTRAINT "LeadAttribution_campaignSourceId_fkey" FOREIGN KEY ("campaignSourceId") REFERENCES "CampaignSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessIdentifier" ADD CONSTRAINT "BusinessIdentifier_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessSourceRecord" ADD CONSTRAINT "BusinessSourceRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialDocument" ADD CONSTRAINT "FinancialDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialExtraction" ADD CONSTRAINT "FinancialExtraction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FinancialDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialMetric" ADD CONSTRAINT "FinancialMetric_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialYearSummary" ADD CONSTRAINT "FinancialYearSummary_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialConsistencyCheck" ADD CONSTRAINT "FinancialConsistencyCheck_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizRiskSignal" ADD CONSTRAINT "BizRiskSignal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizRiskFlag" ADD CONSTRAINT "BizRiskFlag_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditRecommendation" ADD CONSTRAINT "CreditRecommendation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtCase" ADD CONSTRAINT "CourtCase_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationTask" ADD CONSTRAINT "VerificationTask_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualReview" ADD CONSTRAINT "ManualReview_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizAuditLog" ADD CONSTRAINT "BizAuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerDebtor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitoringAlert" ADD CONSTRAINT "MonitoringAlert_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerDebtor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditHold" ADD CONSTRAINT "CreditHold_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseToPay" ADD CONSTRAINT "PromiseToPay_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromiseToPay" ADD CONSTRAINT "PromiseToPay_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerDebtor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLink" ADD CONSTRAINT "PaymentLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidencePack" ADD CONSTRAINT "LegalEvidencePack_creditAccountId_fkey" FOREIGN KEY ("creditAccountId") REFERENCES "CreditAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEvidencePack" ADD CONSTRAINT "LegalEvidencePack_arbitrationCaseId_fkey" FOREIGN KEY ("arbitrationCaseId") REFERENCES "ArbitrationCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalFeeLedger" ADD CONSTRAINT "LegalFeeLedger_arbitrationCaseId_fkey" FOREIGN KEY ("arbitrationCaseId") REFERENCES "ArbitrationCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalFeeLedger" ADD CONSTRAINT "LegalFeeLedger_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "LegalAdvisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiDecisionLog" ADD CONSTRAINT "AiDecisionLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErpSyncConfig" ADD CONSTRAINT "ErpSyncConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

