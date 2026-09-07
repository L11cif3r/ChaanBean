package com.chaanbean.mobile.feature.admingrowth.data

import com.chaanbean.mobile.core.di.AppContainer
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.outcomeOf
import com.chaanbean.mobile.core.ui.formatInr
import kotlin.math.roundToInt
import kotlin.math.roundToLong

interface AdminGrowthRepository {
    suspend fun pipeline(): Outcome<PipelineResponse>
    suspend fun marketing(): Outcome<MarketingResponse>

    /** Returns the name of the stage the deal landed in, as the server reports it. */
    suspend fun moveStage(dealId: String, newStageId: String, winLossReason: String?): Outcome<String>
    suspend fun createDeal(request: CreateDealRequest): Outcome<Deal>
    suspend fun createLead(request: CreateLeadRequest): Outcome<Lead>

    /** Returns the server's confirmation message for the provisioned company. */
    suspend fun convertToCompany(dealId: String, companyName: String?, plan: String): Outcome<String>
    suspend fun addNote(dealId: String?, leadId: String?, description: String): Outcome<SalesActivity>
}

class LiveAdminGrowthRepository(private val api: AdminGrowthApi) : AdminGrowthRepository {

    override suspend fun pipeline(): Outcome<PipelineResponse> = outcomeOf { api.pipeline() }

    override suspend fun marketing(): Outcome<MarketingResponse> = outcomeOf { api.marketing() }

    override suspend fun moveStage(
        dealId: String,
        newStageId: String,
        winLossReason: String?,
    ): Outcome<String> = outcomeOf {
        val res = api.moveStage(
            MoveStageRequest(
                dealId = dealId,
                newStageId = newStageId,
                winLossReason = winLossReason?.takeIf { it.isNotBlank() },
            ),
        )
        res.failIfNotOk()
        res.stageName ?: res.deal?.stage?.name ?: "the selected stage"
    }

    override suspend fun createDeal(request: CreateDealRequest): Outcome<Deal> = outcomeOf {
        val res = api.createDeal(request)
        res.failIfNotOk()
        res.deal ?: throw IllegalStateException("Server accepted the request but returned no deal")
    }

    override suspend fun createLead(request: CreateLeadRequest): Outcome<Lead> = outcomeOf {
        val res = api.createLead(request)
        res.failIfNotOk()
        res.lead ?: throw IllegalStateException("Server accepted the request but returned no lead")
    }

    override suspend fun convertToCompany(
        dealId: String,
        companyName: String?,
        plan: String,
    ): Outcome<String> = outcomeOf {
        val res = api.convertToCompany(
            ConvertToCompanyRequest(
                dealId = dealId,
                companyName = companyName?.takeIf { it.isNotBlank() },
                plan = plan,
            ),
        )
        res.failIfNotOk()
        res.message ?: "Company provisioned."
    }

    override suspend fun addNote(
        dealId: String?,
        leadId: String?,
        description: String,
    ): Outcome<SalesActivity> = outcomeOf {
        val res = api.addActivity(
            AddActivityRequest(description = description, dealId = dealId, leadId = leadId),
        )
        res.failIfNotOk()
        res.activity ?: throw IllegalStateException("Server accepted the note but returned no activity")
    }

    /** The endpoint answers 200 with `{ error }` on some branches, so check both. */
    private fun PipelineActionResponse.failIfNotOk() {
        if (!success || error != null) {
            throw IllegalStateException(error ?: "Pipeline operation failed")
        }
    }
}

/**
 * In-memory pipeline that applies the same stage/probability rules as the POST
 * handler, so a move in mock mode changes exactly what a move on the server would.
 *
 * A single instance, so a deal moved on the pipeline screen is still moved when the
 * marketing screen recomputes attribution from the same deals.
 */
object MockAdminGrowthRepository : AdminGrowthRepository {

    /** Fixtures are frozen in time so the mock reads the same on every run. */
    private const val NOW = "2026-09-07T09:00:00.000Z"

    private val stageDefs = listOf(
        DealStage(id = "st_lead", name = "Lead", order = 1, color = "#64748b"),
        DealStage(id = "st_contacted", name = "Contacted", order = 2, color = "#0284c7"),
        DealStage(id = "st_demo", name = "Demo Scheduled", order = 3, color = "#8b5cf6"),
        DealStage(id = "st_proposal", name = "Proposal Sent", order = 4, color = "#f59e0b"),
        DealStage(id = "st_negotiation", name = "Negotiation", order = 5, color = "#ec4899"),
        DealStage(id = "st_won", name = "Won", order = 6, color = "#16a34a"),
        DealStage(id = "st_lost", name = "Lost", order = 7, color = "#dc2626"),
    )

    private val users = listOf(
        AdminUser(id = "au_sv", name = "Siddharth Verma", email = "owner@chaanbean.in", role = "owner"),
        AdminUser(id = "au_pd", name = "Pooja Deshmukh", email = "rep@chaanbean.in", role = "team_member"),
        AdminUser(id = "au_ar", name = "Aditya Ranganathan", email = "aditya@chaanbean.in", role = "team_member"),
    )

    private val leads = mutableListOf(
        Lead(
            id = "ld_singhania", name = "Kunal Singhania", companyName = "Singhania Steels Pvt Ltd",
            email = "kunal@singhaniasteel.com", phone = "+91 98200 11223",
            source = "paid_search", status = "qualified", assignedTo = "au_pd",
            notes = "Wants automated L1/L2 recovery calls across 400+ distributor debtors.",
            createdAt = "2026-06-11T06:20:00.000Z",
        ),
        Lead(
            id = "ld_acme", name = "Harish Parekh", companyName = "Acme Traders Pvt Ltd",
            email = "harish@acmetraders.in", phone = "+91 98199 22334",
            source = "trust_hub_referral", status = "converted", assignedTo = "au_sv",
            createdAt = "2026-03-02T10:05:00.000Z",
        ),
        Lead(
            id = "ld_meridian", name = "Revathi Nair", companyName = "Meridian Textiles Ltd",
            email = "revathi@meridiantextiles.in", phone = "+91 98455 67712",
            source = "referral", status = "contacted", assignedTo = "au_ar",
            notes = "Referred by Acme Traders. 90-day receivables ageing is the pain point.",
            createdAt = "2026-07-19T08:45:00.000Z",
        ),
        Lead(
            id = "ld_deccan", name = "Ashwin Kulkarni", companyName = "Deccan Agro Exports LLP",
            email = "ashwin@deccanagro.co.in", phone = "+91 99221 14455",
            source = "whatsapp_inbound", status = "new", assignedTo = "au_ar",
            createdAt = "2026-08-30T04:15:00.000Z",
        ),
        Lead(
            id = "ld_zenith", name = "Farida Merchant", companyName = "Zenith Pharma Distributors Pvt Ltd",
            email = "farida@zenithpharma.co.in", phone = "+91 98334 45566",
            source = "organic", status = "qualified", assignedTo = "au_pd",
            notes = "Needs GST turnover verification before extending credit to 60 stockists.",
            createdAt = "2026-07-01T12:30:00.000Z",
        ),
        Lead(
            id = "ld_sethi", name = "Jasbir Sethi", companyName = "Sethi Auto Components Pvt Ltd",
            email = "jasbir@sethiauto.com", phone = "+91 98110 33447",
            source = "partner", status = "lost", assignedTo = "au_pd",
            createdAt = "2026-04-22T09:00:00.000Z",
        ),
        Lead(
            id = "ld_coromandel", name = "Nandini Rao", companyName = "Coromandel Marine Foods Pvt Ltd",
            email = "nandini@coromandelmarine.in", phone = "+91 94440 21188",
            source = "paid_search", status = "contacted", assignedTo = "au_ar",
            createdAt = "2026-08-12T11:10:00.000Z",
        ),
        Lead(
            id = "ld_ganga", name = "Vikram Chaturvedi", companyName = "Ganga Cements & Aggregates Ltd",
            email = "vikram@gangacements.com", phone = "+91 93030 55621",
            source = "trust_hub_referral", status = "qualified", assignedTo = "au_sv",
            notes = "Invited into the Trust Hub by Acme Traders while verifying a shared buyer.",
            createdAt = "2026-08-26T07:55:00.000Z",
        ),
    )

    private val companies = mutableListOf(
        DealCompany(
            id = "co_acme", name = "Acme Traders Pvt Ltd", plan = "growth", walletBalance = 285000.0,
            kycStatus = "verified", industry = "Wholesale & Industrial Distribution",
            healthScore = "Healthy", signupDate = "2026-03-09T06:00:00.000Z",
            lastActiveAt = "2026-09-06T05:30:00.000Z",
        ),
    )

    private val deals = mutableListOf(
        Deal(
            id = "dl_singhania", leadId = "ld_singhania", title = "Singhania Steels — Recovery & Bureau Bundle",
            value = 480000.0, probability = 60, stageId = "st_proposal", ownerId = "au_pd",
            stageUpdatedAt = "2026-08-29T09:40:00.000Z", createdAt = "2026-06-14T06:00:00.000Z",
        ),
        Deal(
            id = "dl_acme", leadId = "ld_acme", companyId = "co_acme",
            title = "Acme Traders — Enterprise Annual Contract",
            value = 650000.0, probability = 100, stageId = "st_won", ownerId = "au_sv",
            closedAt = "2026-03-09T06:00:00.000Z", stageUpdatedAt = "2026-03-09T06:00:00.000Z",
            createdAt = "2026-03-03T05:20:00.000Z",
        ),
        Deal(
            id = "dl_meridian", leadId = "ld_meridian", title = "Meridian Textiles — L1/L2 Voice Recovery Pilot",
            value = 240000.0, probability = 40, stageId = "st_contacted", ownerId = "au_ar",
            stageUpdatedAt = "2026-08-21T10:15:00.000Z", createdAt = "2026-07-20T09:00:00.000Z",
        ),
        Deal(
            id = "dl_deccan", leadId = "ld_deccan", title = "Deccan Agro — Distributor Risk Screening",
            value = 180000.0, probability = 40, stageId = "st_lead", ownerId = "au_ar",
            stageUpdatedAt = "2026-08-30T04:20:00.000Z", createdAt = "2026-08-30T04:20:00.000Z",
        ),
        Deal(
            id = "dl_zenith", leadId = "ld_zenith", title = "Zenith Pharma — Trust Hub & GST Verification",
            value = 375000.0, probability = 80, stageId = "st_negotiation", ownerId = "au_pd",
            stageUpdatedAt = "2026-09-02T07:05:00.000Z", createdAt = "2026-07-04T08:10:00.000Z",
        ),
        Deal(
            id = "dl_sethi", leadId = "ld_sethi", title = "Sethi Auto Components — Annual Recovery Suite",
            value = 300000.0, probability = 0, stageId = "st_lost", ownerId = "au_pd",
            winLossReason = "Built an in-house collections desk instead",
            closedAt = "2026-06-18T11:00:00.000Z", stageUpdatedAt = "2026-06-18T11:00:00.000Z",
            createdAt = "2026-04-25T10:00:00.000Z",
        ),
        Deal(
            id = "dl_coromandel", leadId = "ld_coromandel", title = "Coromandel Marine — Pilot Scoping",
            value = 220000.0, probability = 40, stageId = "st_demo", ownerId = "au_ar",
            stageUpdatedAt = "2026-09-01T06:45:00.000Z", createdAt = "2026-08-13T09:30:00.000Z",
        ),
        Deal(
            id = "dl_ganga", leadId = "ld_ganga", title = "Ganga Cements — Multi-plant Rollout",
            value = 920000.0, probability = 40, stageId = "st_contacted", ownerId = "au_sv",
            stageUpdatedAt = "2026-09-04T05:25:00.000Z", createdAt = "2026-08-27T08:00:00.000Z",
        ),
    )

    private val activities = mutableListOf(
        SalesActivity(
            id = "ac_1", dealId = "dl_singhania", leadId = "ld_singhania", type = "demo",
            description = "Demonstrated automated voice dialling and GST turnover verification.",
            performedBy = "au_pd", createdAt = "2026-08-19T09:00:00.000Z",
        ),
        SalesActivity(
            id = "ac_2", dealId = "dl_singhania", leadId = "ld_singhania", type = "stage_change",
            description = "Moved deal to stage: \"Proposal Sent\"",
            createdAt = "2026-08-29T09:40:00.000Z",
        ),
        SalesActivity(
            id = "ac_3", dealId = "dl_zenith", leadId = "ld_zenith", type = "call",
            description = "Pricing call with the finance controller; asked for a 12-month lock-in.",
            performedBy = "au_pd", createdAt = "2026-09-02T07:00:00.000Z",
        ),
        SalesActivity(
            id = "ac_4", dealId = "dl_acme", leadId = "ld_acme", type = "company_converted",
            description = "Deal converted! Live customer company \"Acme Traders Pvt Ltd\" provisioned on growth plan.",
            createdAt = "2026-03-09T06:00:00.000Z",
        ),
        SalesActivity(
            id = "ac_5", dealId = "dl_ganga", leadId = "ld_ganga", type = "note",
            description = "Three plants in UP and Bihar; wants a single wallet across all of them.",
            performedBy = "au_sv", createdAt = "2026-09-04T05:20:00.000Z",
        ),
        SalesActivity(
            id = "ac_6", dealId = "dl_sethi", leadId = "ld_sethi", type = "stage_change",
            description = "Moved deal to stage: \"Lost\" (Reason: Built an in-house collections desk instead)",
            createdAt = "2026-06-18T11:00:00.000Z",
        ),
    )

    private val channels = listOf(
        MockChannel("mc_organic", "organic", "inbound", 45000.0),
        MockChannel("mc_referral", "referral", "inbound", 20000.0),
        MockChannel("mc_paid_search", "paid_search", "paid", 180000.0),
        MockChannel("mc_whatsapp", "whatsapp_inbound", "inbound", 35000.0),
        MockChannel("mc_direct", "direct", "direct", 0.0),
        MockChannel("mc_partner", "partner", "partner", 60000.0),
        MockChannel("mc_trust_hub", "trust_hub_referral", "inbound", 15000.0),
    )

    private val sources = listOf(
        CampaignSource(
            id = "cs_google", channelId = "mc_paid_search",
            name = "Google Search — B2B Credit Risk India", utmCampaign = "q3_google_search",
            cost = 85000.0, leadsCount = 42, dealsCount = 8,
        ),
        CampaignSource(
            id = "cs_linkedin", channelId = "mc_paid_search",
            name = "LinkedIn ABM — MSME Finance Heads", utmCampaign = "q3_linkedin_abm",
            cost = 62000.0, leadsCount = 18, dealsCount = 3,
        ),
        CampaignSource(
            id = "cs_trusthub", channelId = "mc_trust_hub",
            name = "Trust Hub Vendor Invitations", utmCampaign = "trusthub_viral_invites",
            cost = 15000.0, leadsCount = 64, dealsCount = 14,
        ),
        CampaignSource(
            id = "cs_ca_network", channelId = "mc_partner",
            name = "CA Partner Network — Maharashtra", utmCampaign = "partner_ca_mh",
            cost = 40000.0, leadsCount = 22, dealsCount = 5,
        ),
        CampaignSource(
            id = "cs_wa", channelId = "mc_whatsapp",
            name = "WhatsApp Business Catalogue", utmCampaign = "wa_inbound_catalogue",
            cost = 12000.0, leadsCount = 31, dealsCount = 4,
        ),
    )

    private var seq = 100

    override suspend fun pipeline(): Outcome<PipelineResponse> {
        val hydrated = deals.map { hydrate(it) }
        val stages = stageDefs.map { def ->
            PipelineStage(
                id = def.id,
                name = def.name,
                order = def.order,
                color = def.color,
                deals = hydrated.filter { it.stageId == def.id }
                    .sortedByDescending { it.stageUpdatedAt ?: "" },
            )
        }
        val total = hydrated.sumOf { it.value }
        val weighted = hydrated.sumOf { it.value * it.probability / 100.0 }
        val won = hydrated.count { it.stage?.name == "Won" }
        val lost = hydrated.count { it.stage?.name == "Lost" }
        return Outcome.Ok(
            PipelineResponse(
                stages = stages,
                metrics = PipelineMetrics(
                    totalPipelineValue = total,
                    weightedPipelineValue = weighted,
                    totalDealsCount = hydrated.size,
                    wonDealsCount = won,
                    lostDealsCount = lost,
                    // Matches the handler, including its 65 fallback when nothing has closed.
                    winRate = if (won + lost > 0) (won * 100.0 / (won + lost)).roundToInt() else 65,
                    avgDealSize = if (hydrated.isEmpty()) 0.0 else (total / hydrated.size).roundToLong().toDouble(),
                ),
                users = users,
                leads = leads.sortedByDescending { it.createdAt ?: "" }.take(20),
            ),
        )
    }

    override suspend fun marketing(): Outcome<MarketingResponse> {
        // The server attributes through LeadAttribution rows; the mock stands in for
        // them with the lead's own `source`, which the seed keeps in sync anyway.
        val rows = channels.map { ch ->
            val channelLeads = leads.filter { it.source == ch.name }
            val channelDeals = deals.filter { d -> channelLeads.any { it.id == d.leadId } }
            val wonDeals = channelDeals.filter { stageOf(it.stageId)?.name == "Won" }
            val count = channelLeads.size
            val wonCount = wonDeals.size
            MarketingChannelRow(
                id = ch.id,
                name = ch.name,
                type = ch.type,
                budget = ch.budget,
                // The handler assigns totalCost = budget and never folds in source cost.
                totalCost = ch.budget,
                leadsCount = count,
                wonCount = wonCount,
                revenueWon = wonDeals.sumOf { it.value },
                cpl = if (count > 0) (ch.budget / count).roundToLong().toDouble() else 0.0,
                cac = if (wonCount > 0) (ch.budget / wonCount).roundToLong().toDouble() else 0.0,
                convRate = if (count > 0) (wonCount * 100.0 / count).roundToInt() else 0,
                sources = sources.filter { it.channelId == ch.id },
            )
        }
        val funnel = stageDefs.map { def ->
            val inStage = deals.filter { it.stageId == def.id }
            FunnelStage(
                stage = def.name,
                order = def.order,
                color = def.color,
                count = inStage.size,
                value = inStage.sumOf { it.value },
            )
        }
        val trustHubLeads = leads.filter { it.source == "trust_hub_referral" }
        return Outcome.Ok(
            MarketingResponse(
                channels = rows,
                pipelineStages = funnel,
                trustHubReferrals = TrustHubReferrals(
                    totalReferrals = trustHubLeads.size,
                    convertedCount = trustHubLeads.count { lead ->
                        deals.any { it.leadId == lead.id && stageOf(it.stageId)?.name == "Won" }
                    },
                ),
            ),
        )
    }

    override suspend fun moveStage(
        dealId: String,
        newStageId: String,
        winLossReason: String?,
    ): Outcome<String> {
        val stage = stageOf(newStageId) ?: return Outcome.Err("Stage not found")
        val index = deals.indexOfFirst { it.id == dealId }
        if (index < 0) return Outcome.Err("Deal not found")
        val closing = stage.name == "Won" || stage.name == "Lost"
        deals[index] = deals[index].copy(
            stageId = stage.id,
            winLossReason = winLossReason?.takeIf { it.isNotBlank() },
            stageUpdatedAt = NOW,
            closedAt = if (closing) NOW else null,
            probability = probabilityFor(stage.name),
        )
        val reasonSuffix = if (!winLossReason.isNullOrBlank()) " (Reason: $winLossReason)" else ""
        log(
            dealId = dealId,
            leadId = deals[index].leadId,
            type = "stage_change",
            description = "Moved deal to stage: \"${stage.name}\"$reasonSuffix",
        )
        return Outcome.Ok(stage.name)
    }

    override suspend fun createDeal(request: CreateDealRequest): Outcome<Deal> {
        if (stageOf(request.stageId) == null) return Outcome.Err("Stage not found")
        val deal = Deal(
            id = "dl_${nextId()}",
            leadId = request.leadId,
            title = request.title,
            value = request.value,
            probability = request.probability,
            stageId = request.stageId,
            ownerId = request.ownerId,
            stageUpdatedAt = NOW,
            createdAt = NOW,
        )
        deals.add(0, deal)
        log(
            dealId = deal.id,
            leadId = deal.leadId,
            type = "deal_created",
            description = "Deal \"${deal.title}\" created with pipeline value ${formatInr(deal.value)}",
        )
        return Outcome.Ok(hydrate(deal))
    }

    override suspend fun createLead(request: CreateLeadRequest): Outcome<Lead> {
        val lead = Lead(
            id = "ld_${nextId()}",
            name = request.name,
            companyName = request.companyName,
            email = request.email,
            phone = request.phone,
            source = request.source,
            status = "new",
            notes = request.notes,
            assignedTo = request.assignedTo,
            createdAt = NOW,
        )
        leads.add(0, lead)
        return Outcome.Ok(lead)
    }

    override suspend fun convertToCompany(
        dealId: String,
        companyName: String?,
        plan: String,
    ): Outcome<String> {
        val index = deals.indexOfFirst { it.id == dealId }
        if (index < 0) return Outcome.Err("Deal not found")
        val deal = deals[index]
        val name = companyName?.takeIf { it.isNotBlank() }
            ?: leads.firstOrNull { it.id == deal.leadId }?.companyName
            ?: deal.title
        val company = DealCompany(
            id = "co_${nextId()}",
            name = name,
            plan = plan,
            // The handler hardcodes a 2,00,000 opening wallet on conversion.
            walletBalance = 200000.0,
            kycStatus = "verified",
            healthScore = "Healthy",
            signupDate = NOW,
            lastActiveAt = NOW,
        )
        companies.add(company)
        val wonStage = stageDefs.first { it.name == "Won" }
        deals[index] = deal.copy(
            companyId = company.id,
            stageId = wonStage.id,
            closedAt = NOW,
            probability = 100,
            stageUpdatedAt = NOW,
        )
        log(
            dealId = dealId,
            leadId = null,
            type = "company_converted",
            description = "Deal converted! Live customer company \"${company.name}\" provisioned on " +
                "$plan plan with ₹2,00,000 wallet balance.",
        )
        return Outcome.Ok("Company \"${company.name}\" successfully created and linked to Won deal.")
    }

    override suspend fun addNote(
        dealId: String?,
        leadId: String?,
        description: String,
    ): Outcome<SalesActivity> =
        Outcome.Ok(log(dealId = dealId, leadId = leadId, type = "note", description = description))

    private fun hydrate(deal: Deal): Deal = deal.copy(
        stage = stageOf(deal.stageId),
        lead = leads.firstOrNull { it.id == deal.leadId },
        company = companies.firstOrNull { it.id == deal.companyId },
        owner = users.firstOrNull { it.id == deal.ownerId },
        activities = activities.filter { it.dealId == deal.id }
            .sortedByDescending { it.createdAt ?: "" }
            .take(5),
    )

    private fun stageOf(id: String): DealStage? = stageDefs.firstOrNull { it.id == id }

    private fun log(dealId: String?, leadId: String?, type: String, description: String): SalesActivity {
        val activity = SalesActivity(
            id = "ac_${nextId()}",
            dealId = dealId,
            leadId = leadId,
            type = type,
            description = description,
            createdAt = NOW,
        )
        activities.add(0, activity)
        return activity
    }

    private fun nextId(): Int = ++seq

    /** Mirrors the handler's stage-to-probability table exactly. */
    private fun probabilityFor(stageName: String): Int = when (stageName) {
        "Won" -> 100
        "Lost" -> 0
        "Negotiation" -> 80
        "Proposal Sent" -> 60
        else -> 40
    }

    private data class MockChannel(
        val id: String,
        val name: String,
        val type: String,
        val budget: Double,
    )
}

object AdminGrowthModule {
    fun repository(container: AppContainer): AdminGrowthRepository =
        if (container.useMock) MockAdminGrowthRepository
        else LiveAdminGrowthRepository(container.retrofit.create(AdminGrowthApi::class.java))
}
