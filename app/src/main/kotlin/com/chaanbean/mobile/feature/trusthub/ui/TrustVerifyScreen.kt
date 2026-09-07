package com.chaanbean.mobile.feature.trusthub.ui

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
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.trusthub.data.CommunityDefault
import com.chaanbean.mobile.feature.trusthub.data.TrustHubModule
import com.chaanbean.mobile.feature.trusthub.data.TrustVerification
import com.chaanbean.mobile.feature.trusthub.data.VerificationCheckpoint
import com.chaanbean.mobile.feature.trusthub.data.VerificationSource

@Composable
fun TrustVerifyScreen(initialQuery: String = "") {
    val vm = rememberVm {
        TrustVerifyViewModel(TrustHubModule.repository(it), initialQuery)
    }
    val state by vm.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Verify a business",
                "Look up a Trust ID, a vendor Trust ID, a GSTIN, a PAN or a company name " +
                    "against the ChaanBean network.",
            )
        }
        item {
            SearchPanel(
                query = state.query,
                onQueryChange = vm::onQueryChange,
                onSubmit = { vm.verify() },
            )
        }

        when (val lookup = state.lookup) {
            null -> item { IdleNote() }
            is Outcome.Loading -> item { LoadingBox() }
            is Outcome.Err -> item { ErrorBox(lookup.message, onRetry = { vm.verify() }) }
            is Outcome.Ok -> {
                val result = lookup.value
                if (!result.found) {
                    item { NotFoundCard(result, onTry = { vm.verify(it) }) }
                } else {
                    val source = VerificationSource.from(result.verificationAuthority)
                    item { IdentityCard(result) }
                    item { ProvenanceCard(source) }
                    item { IdentifiersCard(result, source) }
                    item { SectionHeader("Checkpoints returned by the server") }
                    items(result.checkpoints, key = { it.key }) {
                        CheckpointRow(it, source)
                    }
                    if (result.adverseDefaults.isNotEmpty()) {
                        item {
                            SectionHeader(
                                "Peer defaults on record",
                                result.adverseDefaultsCount.toString() +
                                    " matching row(s) in the community default registry. " +
                                    "This is the one part of the answer backed by stored data.",
                            )
                        }
                        items(result.adverseDefaults, key = { it.id }) { AdverseDefaultRow(it) }
                    } else {
                        item {
                            ChaanCard {
                                Text(
                                    "No peer default rows matched this entity.",
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    "Matching is by name substring, GSTIN or PAN only. A default " +
                                        "filed under a different spelling would not be found.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                    item { CertificateCard(result) }
                }
            }
        }
        item { Spacer(Modifier.height(40.dp)) }
    }
}

@Composable
private fun SearchPanel(
    query: String,
    onQueryChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    ChaanCard {
        OutlinedTextField(
            value = query,
            onValueChange = onQueryChange,
            label = { Text("Trust ID, GSTIN, PAN or name") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onSubmit,
            enabled = query.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Verify")
        }
    }
}

@Composable
private fun IdleNote() {
    ChaanCard {
        Text("What this lookup can tell you", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        Text(
            "The server searches three tables in order: registered Trust profiles, then " +
                "vendors, then monitored counterparties. Whichever matches first answers, and " +
                "the shape of the answer differs between them.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "It does not contact GSTN, NSDL, MCA21 or NPCI at any point. Treat the result as " +
                "a network record, not as government verification.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun NotFoundCard(result: TrustVerification, onTry: (String) -> Unit) {
    ChaanCard {
        StatusPill("NOT FOUND", Chaan.Amber)
        Spacer(Modifier.height(10.dp))
        Text(
            result.error ?: "No verified business found for that identifier.",
            style = MaterialTheme.typography.bodyMedium,
        )
        if (result.suggestedIds.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Text(
                "IDs the server suggests trying:",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            result.suggestedIds.forEach { id ->
                OutlinedButton(
                    onClick = { onTry(id) },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(id)
                }
                Spacer(Modifier.height(6.dp))
            }
        }
    }
}

@Composable
private fun IdentityCard(result: TrustVerification) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    result.entityName ?: "Unnamed entity",
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    result.trustId ?: "No Trust ID",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(horizontalAlignment = Alignment.End) {
                val score = result.trustScore
                Text(
                    score?.toString() ?: "—",
                    style = MaterialTheme.typography.headlineMedium,
                    color = scoreTint(score),
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "TRUST",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(10.dp))
        result.entityType?.let { KeyValueRow("Entity type", it) }
        result.scoreTier?.let { KeyValueRow("Tier", it) }
        result.visibility?.let { KeyValueRow("Visibility", it) }
        KeyValueRow("Issued", shortDate(result.issuedAt))
        KeyValueRow("Valid until", shortDate(result.validUntil))
        Spacer(Modifier.height(10.dp))
        val kyc = result.kycStatus ?: "unknown"
        StatusPill(
            text = "KYC " + kyc.uppercase(),
            tint = if (kyc == "verified") Chaan.Green else Chaan.Red,
        )
        if (result.badges.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Text(
                "Badges the server attached",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            result.badges.forEach { badge ->
                Text("• " + badge, style = MaterialTheme.typography.bodySmall)
            }
            Spacer(Modifier.height(4.dp))
            Text(
                "Badge text is stored on the profile or hard-coded per branch; none of it is " +
                    "re-checked at lookup time.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** The one card that must never be dropped: it says where the numbers actually came from. */
@Composable
private fun ProvenanceCard(source: VerificationSource) {
    val body = when (source) {
        VerificationSource.TRUST_PROFILE ->
            "This answer came from the registered Trust profile branch. Its PAN, GSTIN and CIN " +
                "are generated from a hash of the entity name and Trust ID - they are not " +
                "lookups and will not match the real registers. Its trust score is one of two " +
                "constants: 94 when no peer default rows match, 42 when any do."
        VerificationSource.VENDOR ->
            "This answer came from the vendor register. PAN, GSTIN and CIN are whatever was " +
                "typed in at onboarding; the server does not re-check them. The score is the " +
                "stored vendor trust score, forced to 38 if a peer default matches."
        VerificationSource.COUNTERPARTY ->
            "This answer came from the monitored counterparty branch. Identifiers are the ones " +
                "on the debtor record - when no PAN is stored the server substitutes a slice of " +
                "the GSTIN. The score is the latest computed risk composite, or 45/88 if none " +
                "has been computed yet."
        VerificationSource.UNKNOWN ->
            "The server did not name the branch that produced this answer, so the provenance of " +
                "these fields cannot be stated."
    }
    ChaanCard {
        StatusPill("HOW THIS WAS PRODUCED", Chaan.Amber)
        Spacer(Modifier.height(10.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun IdentifiersCard(result: TrustVerification, source: VerificationSource) {
    val synthesized = source == VerificationSource.TRUST_PROFILE
    ChaanCard {
        Text(
            if (synthesized) "Identifiers (synthesized, not verified)" else "Identifiers on record",
            style = MaterialTheme.typography.titleMedium,
            color = if (synthesized) Chaan.Amber else MaterialTheme.colorScheme.onSurface,
        )
        Spacer(Modifier.height(8.dp))
        KeyValueRow("PAN", result.pan ?: "—")
        KeyValueRow("GSTIN", result.gstin ?: "—")
        KeyValueRow("CIN", result.cin ?: "—")
        Spacer(Modifier.height(6.dp))
        Text(
            if (synthesized) {
                "Derived from a hash of the name and Trust ID by the verify handler. Do not " +
                    "quote these on an invoice, a filing or a reconciliation."
            } else {
                "Self-declared values stored on the record. No registry confirmed them."
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun CheckpointRow(checkpoint: VerificationCheckpoint, source: VerificationSource) {
    val dataBacked = isDataBacked(checkpoint.key, source)
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                checkpoint.label,
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            StatusPill(checkpoint.status.uppercase(), statusTint(checkpoint.status))
        }
        Spacer(Modifier.height(8.dp))
        Text(
            checkpoint.detail,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        StatusPill(
            text = if (dataBacked) "REFLECTS STORED DATA" else "FIXED SERVER RESPONSE",
            tint = if (dataBacked) Chaan.Accent else Chaan.TextMuted,
        )
        if (!dataBacked) {
            Spacer(Modifier.height(6.dp))
            Text(
                "This status and wording are the same for every entity the branch returns. " +
                    "No external register was queried.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun AdverseDefaultRow(record: CommunityDefault) {
    ChaanCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                record.debtorName,
                style = MaterialTheme.typography.titleSmall,
                modifier = Modifier.weight(1f),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                formatInr(record.amountDefaulted),
                style = MaterialTheme.typography.titleSmall,
                color = Chaan.Red,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(Modifier.height(8.dp))
        record.debtorGstin?.let { KeyValueRow("Debtor GSTIN", it) }
        record.debtorPan?.let { KeyValueRow("Debtor PAN", it) }
        KeyValueRow("Default date", shortDate(record.defaultDate))
        record.notes?.let { KeyValueRow("Notes", it) }
        Spacer(Modifier.height(8.dp))
        StatusPill(
            text = if (record.verified) "MARKED VERIFIED" else "UNVERIFIED",
            tint = if (record.verified) Chaan.Amber else Chaan.TextMuted,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "\"Verified\" here means the reporting endpoint set the column to true on submission. " +
                "Nobody adjudicated the claim.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun CertificateCard(result: TrustVerification) {
    ChaanCard {
        Text("Certificate hash", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        Text(
            result.certificateHash ?: "—",
            style = MaterialTheme.typography.bodySmall,
        )
        Spacer(Modifier.height(8.dp))
        result.verificationAuthority?.let { KeyValueRow("Issuing system", it) }
        Spacer(Modifier.height(6.dp))
        Text(
            "A plain SHA-256 of the Trust ID, entity name and issue date. It is not a signature " +
                "and proves nothing about the entity - anyone with those three values can " +
                "reproduce it.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/**
 * True when the checkpoint's status actually varies with stored data. Everything else
 * in the handler is a literal, and the UI has to say so.
 */
private fun isDataBacked(key: String, source: VerificationSource): Boolean = when (source) {
    VerificationSource.COUNTERPARTY -> key == "dues" || key == "gst"
    VerificationSource.VENDOR -> key == "dues"
    else -> key == "dues" || key == "behavior" || key == "legal"
}

private fun statusTint(status: String) = when (status.lowercase()) {
    "passed" -> Chaan.Green
    "warning" -> Chaan.Amber
    "failed" -> Chaan.Red
    else -> Chaan.TextMuted
}

private fun scoreTint(score: Int?) = when {
    score == null -> Chaan.TextMuted
    score >= 85 -> Chaan.Green
    score >= 65 -> Chaan.Amber
    else -> Chaan.Red
}

/** Server dates are ISO-8601; the date half is all these screens need. */
internal fun shortDate(iso: String?): String {
    if (iso.isNullOrBlank()) return "—"
    return if (iso.length >= 10) iso.substring(0, 10) else iso
}
