package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.businesscheck.data.BusinessCheckModule
import com.chaanbean.mobile.feature.businesscheck.data.BusinessProfile
import com.chaanbean.mobile.feature.businesscheck.data.BusinessSourceRecord
import com.chaanbean.mobile.feature.businesscheck.data.ManualReview
import com.chaanbean.mobile.feature.businesscheck.data.humanizeKey
import com.chaanbean.mobile.feature.businesscheck.data.parseFlatFields

private val SOURCE_TYPES = listOf("GST", "MCA", "UDYAM", "ECOURTS")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BusinessDetailScreen(
    businessId: String,
    onBack: () -> Unit,
    onOpenDocuments: () -> Unit,
) {
    val vm = rememberVm {
        BusinessDetailViewModel(BusinessCheckModule.repository(it), businessId)
    }
    val state by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }
    var activeReview by remember { mutableStateOf<ManualReview?>(null) }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = { Text("Business profile") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
                actions = { TextButton(onClick = onOpenDocuments) { Text("Documents") } },
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when (val outcome = state.business) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val business = outcome.value
                    item {
                        HeaderCard(
                            business = business,
                            rerunning = state.rerunning,
                            onRerun = { vm.rerunVerification() },
                            onOpenDocuments = onOpenDocuments,
                        )
                    }
                    item { ProvenanceNote() }

                    if (business.manualReviews.isNotEmpty()) {
                        item {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                business.manualReviews.forEach { review ->
                                    ManualReviewCard(
                                        review = review,
                                        onEnterData = { activeReview = review },
                                    )
                                }
                            }
                        }
                    }

                    item { IdentitySection(business) }
                    item { FinancialHealthSection(business, onOpenDocuments) }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            SOURCE_TYPES.forEach { type ->
                                SourceSection(
                                    sourceType = type,
                                    record = business.sourceRecord(type),
                                    taskStatus = business.taskStatus(type),
                                )
                            }
                        }
                    }
                    item { RiskSection(business) }
                    item { CreditSection(business) }
                    item { ConsistencySection(business) }
                    item { CourtCasesSection(business) }
                    item { DocumentsSection(business, onOpenDocuments) }
                    item { AuditSection(business) }
                }
            }
            item { Spacer(Modifier.height(40.dp)) }
        }
    }

    val review = activeReview
    if (review != null) {
        ManualVerifySheet(
            sourceType = sourceTypeOf(review.reviewType),
            promptText = review.promptText,
            portalUrl = review.portalUrl ?: portalUrlFor(sourceTypeOf(review.reviewType)),
            submitting = state.submitting,
            onDismiss = { activeReview = null },
            onSubmitMca = { vm.submitMca(it); activeReview = null },
            onSubmitGst = { vm.submitGst(it); activeReview = null },
            onSubmitUdyam = { vm.submitUdyam(it); activeReview = null },
            onSubmitCourtCase = { vm.submitCourtCase(it); activeReview = null },
        )
    }
}

@Composable
private fun HeaderCard(
    business: BusinessProfile,
    rerunning: Boolean,
    onRerun: () -> Unit,
    onOpenDocuments: () -> Unit,
) {
    val flag = business.riskFlag
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(business.companyName, style = MaterialTheme.typography.headlineSmall)
                Spacer(Modifier.height(4.dp))
                Text(
                    business.gstin ?: business.cin ?: business.pan ?: "No identifiers on file",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            RiskBadge(RiskFlag.from(flag?.flag))
        }

        Spacer(Modifier.height(12.dp))
        if (flag == null) {
            Text(
                "No risk flag has been computed yet. It is derived once at least one " +
                    "source or financial document is on file.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    "${flag.compositeScore.toInt()}",
                    style = MaterialTheme.typography.headlineMedium,
                    color = scoreTint(flag.compositeScore),
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "/100 composite",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 4.dp, bottom = 3.dp),
                )
            }
            Spacer(Modifier.height(6.dp))
            ScoreBar(
                fraction = (flag.compositeScore / 100.0).toFloat(),
                tint = scoreTint(flag.compositeScore),
            )
            Spacer(Modifier.height(10.dp))
            KeyValueRow(
                "Recommended limit",
                if (flag.flag.uppercase() == "RED") "Blocked" else compactInr(flag.recommendedLimit),
            )
            KeyValueRow("Recommended tenor", "${flag.recommendedTenor} days")
            KeyValueRow("Computed", formatDateTime(flag.computedAt))
        }

        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatusPill(
                text = humanizeStatus(business.overallStatus),
                tint = taskStatusTint(business.overallStatus),
            )
            SourceStatusPill(business.sourceStatus)
        }

        Spacer(Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onRerun, enabled = !rerunning) {
                Text(if (rerunning) "Re-running..." else "Re-run analysis")
            }
            OutlinedButton(onClick = onOpenDocuments) { Text("Documents") }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            "Re-running queues the source tasks again; it does not fetch anything by itself.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ManualReviewCard(review: ManualReview, onEnterData: () -> Unit) {
    val sourceType = sourceTypeOf(review.reviewType)
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Manual verification: ${sourceLabel(sourceType)}",
                style = MaterialTheme.typography.titleSmall,
                color = Chaan.Amber,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            StatusPill(text = humanizeStatus(review.status), tint = Chaan.Amber)
        }
        Spacer(Modifier.height(8.dp))
        Text(
            review.promptText,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        val portal = review.portalUrl ?: portalUrlFor(sourceType)
        if (portal != null) {
            PortalButton(sourceType, portal)
        }
        Spacer(Modifier.height(4.dp))
        Button(onClick = onEnterData) { Text("Enter what you found") }
    }
}

@Composable
private fun IdentitySection(business: BusinessProfile) {
    ExpandableCard(
        title = "Business identity",
        subtitle = "Each identifier carries the provenance of the source that confirmed it.",
    ) {
        ProvenancedField("GSTIN", business.gstin, business.sourceRecord("GST")?.sourceStatus)
        ProvenancedField("CIN", business.cin, business.sourceRecord("MCA")?.sourceStatus)
        // PAN is never fetched from a portal in V0; it is only what the operator typed.
        ProvenancedField("PAN", business.pan, sourceStatus = null)
        ProvenancedField("Udyam number", business.udyamNo, business.sourceRecord("UDYAM")?.sourceStatus)
        ProvenancedField("Phone", business.phone, sourceStatus = null)
        ProvenancedField(
            "Registered address",
            business.registeredAddr,
            business.sourceRecord("MCA")?.sourceStatus,
        )
        Spacer(Modifier.height(6.dp))
        KeyValueRow("Enterprise type", business.enterpriseType ?: EM_DASH)
        KeyValueRow("Primary activity", business.primaryActivity ?: EM_DASH)
        KeyValueRow("Industry code", business.industryCode ?: EM_DASH)
        KeyValueRow("Incorporated", formatDate(business.incorporatedOn))
        KeyValueRow("Profile created", formatDateTime(business.createdAt))

        if (business.identifiers.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text("Identifier records", style = MaterialTheme.typography.titleSmall)
            Spacer(Modifier.height(4.dp))
            business.identifiers.forEach { identifier ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(identifier.identifierType, style = MaterialTheme.typography.labelSmall)
                        Text(identifier.value, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(Modifier.width(8.dp))
                    SourceStatusPill(identifier.sourceStatus)
                }
            }
        }
    }
}

@Composable
private fun SourceSection(
    sourceType: String,
    record: BusinessSourceRecord?,
    taskStatus: String?,
) {
    val parsed = parseFlatFields(record?.parsedFields)
    ExpandableCard(
        title = sourceLabel(sourceType),
        subtitle = sourceStatusNote(record?.sourceStatus),
        initiallyExpanded = false,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SourceStatusPill(record?.sourceStatus)
            StatusPill(text = humanizeStatus(taskStatus), tint = taskStatusTint(taskStatus))
        }
        Spacer(Modifier.height(10.dp))

        if (parsed.isEmpty()) {
            Text(
                "Nothing recorded for this source yet. Open the portal, look the " +
                    "business up, and enter what you read.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            parsed.forEach { (key, value) -> KeyValueRow(humanizeKey(key), value) }
            Spacer(Modifier.height(6.dp))
            KeyValueRow("Recorded", formatDateTime(record?.fetchedAt))
            record?.notes?.let {
                Spacer(Modifier.height(6.dp))
                Text(
                    it,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        val portal = portalUrlFor(sourceType)
        if (portal != null) {
            PortalButton(sourceType, portal)
        }
        if (sourceType == "ECOURTS") {
            Text(
                "eCourts is behind a CAPTCHA, so it can only ever be searched by hand.",
                style = MaterialTheme.typography.labelSmall,
                color = Chaan.Amber,
            )
        }
    }
}

internal fun BusinessProfile.sourceRecord(type: String): BusinessSourceRecord? =
    sourceRecords.firstOrNull { it.sourceType.equals(type, ignoreCase = true) }

internal fun BusinessProfile.taskStatus(type: String): String? =
    verificationTasks.firstOrNull { it.taskType.equals(type, ignoreCase = true) }?.status
