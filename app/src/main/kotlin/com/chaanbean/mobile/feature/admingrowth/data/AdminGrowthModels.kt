package com.chaanbean.mobile.feature.admingrowth.data

import kotlinx.serialization.Serializable

// ---------------------------------------------------------------------------
// GET /api/admin/pipeline
// ---------------------------------------------------------------------------

/**
 * Mirrors prisma `model PipelineStage`. The pipeline handler returns stages with
 * their deals nested; the same model nested inside a Deal carries no deals list,
 * which is why `deals` defaults to empty rather than being required.
 */
@Serializable
data class PipelineStage(
    val id: String = "",
    val name: String = "",
    val order: Int = 0,
    val color: String = "#64748b",
    val deals: List<Deal> = emptyList(),
)

/** The `stage: true` include on a Deal: scalar columns only, no back-reference. */
@Serializable
data class DealStage(
    val id: String = "",
    val name: String = "",
    val order: Int = 0,
    val color: String = "#64748b",
)

/** Mirrors prisma `model Deal`. `value` is a Float column holding INR. */
@Serializable
data class Deal(
    val id: String = "",
    val leadId: String? = null,
    val companyId: String? = null,
    val title: String = "",
    val value: Double = 0.0,
    val probability: Int = 50,
    val stageId: String = "",
    val ownerId: String? = null,
    val winLossReason: String? = null,
    val closedAt: String? = null,
    val stageUpdatedAt: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val stage: DealStage? = null,
    val lead: Lead? = null,
    val company: DealCompany? = null,
    val owner: AdminUser? = null,
    /** Handler takes only the 5 most recent, newest first. */
    val activities: List<SalesActivity> = emptyList(),
)

/** Mirrors prisma `model Lead`. */
@Serializable
data class Lead(
    val id: String = "",
    val name: String = "",
    val companyName: String = "",
    val email: String = "",
    val phone: String = "",
    val source: String = "organic",
    val status: String = "new",
    val notes: String? = null,
    val assignedTo: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

/** The `company: true` include on a Deal - prisma `model Company`. */
@Serializable
data class DealCompany(
    val id: String = "",
    val name: String = "",
    val plan: String = "growth",
    val walletBalance: Double = 0.0,
    val kycStatus: String = "verified",
    val industry: String? = null,
    val healthScore: String = "Healthy",
    val signupDate: String? = null,
    val lastActiveAt: String? = null,
)

/** Mirrors prisma `model AdminUser`. Roles are "owner" or "team_member". */
@Serializable
data class AdminUser(
    val id: String = "",
    val name: String = "",
    val email: String = "",
    val role: String = "team_member",
    val createdAt: String? = null,
)

/** Mirrors prisma `model SalesActivity`. */
@Serializable
data class SalesActivity(
    val id: String = "",
    val dealId: String? = null,
    val leadId: String? = null,
    val type: String = "note",
    val description: String = "",
    val performedBy: String? = null,
    val createdAt: String? = null,
)

/**
 * Computed by the handler, not stored. `winRate` falls back to a hardcoded 65
 * server-side when no deal has reached Won or Lost yet - the UI says so.
 */
@Serializable
data class PipelineMetrics(
    val totalPipelineValue: Double = 0.0,
    val weightedPipelineValue: Double = 0.0,
    val totalDealsCount: Int = 0,
    val wonDealsCount: Int = 0,
    val lostDealsCount: Int = 0,
    val winRate: Int = 0,
    val avgDealSize: Double = 0.0,
)

@Serializable
data class PipelineResponse(
    val stages: List<PipelineStage> = emptyList(),
    val metrics: PipelineMetrics = PipelineMetrics(),
    val users: List<AdminUser> = emptyList(),
    /** Handler caps this at the 20 newest leads. */
    val leads: List<Lead> = emptyList(),
)

// ---------------------------------------------------------------------------
// POST /api/admin/pipeline - one endpoint, dispatched on `action`
// ---------------------------------------------------------------------------

@Serializable
data class MoveStageRequest(
    val dealId: String,
    val newStageId: String,
    val winLossReason: String? = null,
    val action: String = "move_stage",
)

@Serializable
data class CreateDealRequest(
    val title: String,
    val value: Double,
    val probability: Int,
    val stageId: String,
    val leadId: String? = null,
    val ownerId: String? = null,
    val action: String = "create_deal",
)

@Serializable
data class CreateLeadRequest(
    val name: String,
    val companyName: String,
    val email: String,
    val phone: String,
    val source: String = "organic",
    val notes: String? = null,
    val assignedTo: String? = null,
    val action: String = "create_lead",
)

@Serializable
data class ConvertToCompanyRequest(
    val dealId: String,
    val companyName: String? = null,
    val plan: String = "growth",
    val action: String = "convert_to_company",
)

@Serializable
data class AddActivityRequest(
    val description: String,
    val dealId: String? = null,
    val leadId: String? = null,
    val type: String = "note",
    val performedBy: String? = null,
    val action: String = "add_activity",
)

/**
 * Every action branch returns some subset of these keys, so one response type
 * covers the whole endpoint. `error` is set on the 400/404/500 branches.
 */
@Serializable
data class PipelineActionResponse(
    val success: Boolean = false,
    val error: String? = null,
    val message: String? = null,
    val stageName: String? = null,
    val deal: Deal? = null,
    val lead: Lead? = null,
    val activity: SalesActivity? = null,
    val company: DealCompany? = null,
)

// ---------------------------------------------------------------------------
// GET /api/admin/marketing
// ---------------------------------------------------------------------------

/** Mirrors prisma `model CampaignSource`. */
@Serializable
data class CampaignSource(
    val id: String = "",
    val channelId: String = "",
    val name: String = "",
    val utmCampaign: String? = null,
    val cost: Double = 0.0,
    val leadsCount: Int = 0,
    val dealsCount: Int = 0,
    val createdAt: String? = null,
)

/**
 * One row of the handler's `channelMetrics`. Note `totalCost` is assigned from
 * `budget` alone - the handler does not add campaign-source cost into it, even
 * though the web page does. The screen reports both rather than blending them.
 */
@Serializable
data class MarketingChannelRow(
    val id: String = "",
    val name: String = "",
    val type: String = "inbound",
    val budget: Double = 0.0,
    val totalCost: Double = 0.0,
    val leadsCount: Int = 0,
    val wonCount: Int = 0,
    val revenueWon: Double = 0.0,
    val cpl: Double = 0.0,
    val cac: Double = 0.0,
    val convRate: Int = 0,
    val sources: List<CampaignSource> = emptyList(),
)

/** The handler's `pipelineStages`; it also echoes the identical list as `funnel`. */
@Serializable
data class FunnelStage(
    val stage: String = "",
    val order: Int = 0,
    val color: String = "#64748b",
    val count: Int = 0,
    val value: Double = 0.0,
)

@Serializable
data class TrustHubReferrals(
    val totalReferrals: Int = 0,
    val convertedCount: Int = 0,
)

@Serializable
data class MarketingResponse(
    val channels: List<MarketingChannelRow> = emptyList(),
    val pipelineStages: List<FunnelStage> = emptyList(),
    val trustHubReferrals: TrustHubReferrals = TrustHubReferrals(),
)
