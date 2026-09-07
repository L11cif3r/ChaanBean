package com.chaanbean.mobile.feature.businesscheck.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.feature.businesscheck.data.CourtCasePayload
import com.chaanbean.mobile.feature.businesscheck.data.GstManualPayload
import com.chaanbean.mobile.feature.businesscheck.data.McaManualPayload
import com.chaanbean.mobile.feature.businesscheck.data.UdyamManualPayload

private data class ManualField(val key: String, val label: String, val multiline: Boolean = false)

/**
 * The web app posts a free-text JSON blob here. A typed form is used instead so
 * the keys always match the payloads the manual-verify handler expects.
 */
private fun fieldsFor(sourceType: String): List<ManualField> = when (sourceType) {
    "MCA" -> listOf(
        ManualField("cin", "CIN"),
        ManualField("companyName", "Company name on MCA"),
        ManualField("status", "Company status"),
        ManualField("incorporationDate", "Incorporation date (YYYY-MM-DD)"),
        ManualField("registeredAddress", "Registered address", multiline = true),
        ManualField("authorisedCapital", "Authorised capital"),
        ManualField("paidUpCapital", "Paid-up capital"),
        ManualField("charges", "Open charges"),
        ManualField("rawText", "Anything else you read", multiline = true),
    )
    "GST" -> listOf(
        ManualField("gstin", "GSTIN"),
        ManualField("legalName", "Legal name"),
        ManualField("tradeName", "Trade name"),
        ManualField("gstStatus", "Registration status"),
        ManualField("taxPayerType", "Taxpayer type"),
        ManualField("registrationDate", "Registration date (YYYY-MM-DD)"),
        ManualField("stateCode", "State / code"),
        ManualField("principalAddress", "Principal place of business", multiline = true),
        ManualField("rawText", "Anything else you read", multiline = true),
    )
    "UDYAM" -> listOf(
        ManualField("udyamNo", "Udyam number"),
        ManualField("enterpriseName", "Enterprise name"),
        ManualField("ownerName", "Owner name"),
        ManualField("type", "Enterprise type (MICRO / SMALL / MEDIUM)"),
        ManualField("activity", "Primary activity"),
        ManualField("nic", "NIC code"),
        ManualField("registrationDate", "Registration date (YYYY-MM-DD)"),
        ManualField("district", "District"),
        ManualField("state", "State"),
        ManualField("validUpto", "Valid up to"),
        ManualField("rawText", "Anything else you read", multiline = true),
    )
    else -> listOf(
        ManualField("caseNumber", "Case number"),
        ManualField("courtName", "Court"),
        ManualField("filingDate", "Filing date (YYYY-MM-DD)"),
        ManualField("caseType", "Case type"),
        ManualField("status", "Case status"),
        ManualField("partyRole", "Party role (PLAINTIFF / DEFENDANT / ...)"),
        ManualField("description", "What the case is about", multiline = true),
        ManualField("notes", "Notes", multiline = true),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ManualVerifySheet(
    sourceType: String,
    promptText: String,
    portalUrl: String?,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmitMca: (McaManualPayload) -> Unit,
    onSubmitGst: (GstManualPayload) -> Unit,
    onSubmitUdyam: (UdyamManualPayload) -> Unit,
    onSubmitCourtCase: (CourtCasePayload) -> Unit,
) {
    val values = remember(sourceType) { mutableStateMapOf<String, String>() }
    val fields = fieldsFor(sourceType)

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(
                "Enter ${sourceLabel(sourceType)} data",
                style = MaterialTheme.typography.titleLarge,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                promptText,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "What you type is stored as USER_PROVIDED and is shown that way " +
                    "everywhere. It is not treated as a verified government record.",
                style = MaterialTheme.typography.labelSmall,
                color = Chaan.Amber,
                fontWeight = FontWeight.Medium,
            )
            if (portalUrl != null) {
                PortalButton(sourceType, portalUrl)
            }
            Spacer(Modifier.height(8.dp))

            fields.forEach { field ->
                OutlinedTextField(
                    value = values[field.key].orEmpty(),
                    onValueChange = { values[field.key] = it },
                    label = { Text(field.label) },
                    singleLine = !field.multiline,
                    minLines = if (field.multiline) 3 else 1,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(10.dp))
            }

            Spacer(Modifier.height(8.dp))
            Button(
                onClick = { submit(sourceType, values, onSubmitMca, onSubmitGst, onSubmitUdyam, onSubmitCourtCase) },
                enabled = !submitting && values.values.any { it.isNotBlank() },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (submitting) "Saving..." else "Save as user-provided")
            }
        }
    }
}

private fun submit(
    sourceType: String,
    values: Map<String, String>,
    onSubmitMca: (McaManualPayload) -> Unit,
    onSubmitGst: (GstManualPayload) -> Unit,
    onSubmitUdyam: (UdyamManualPayload) -> Unit,
    onSubmitCourtCase: (CourtCasePayload) -> Unit,
) {
    when (sourceType) {
        "MCA" -> onSubmitMca(
            McaManualPayload(
                cin = values.clean("cin"),
                companyName = values.clean("companyName"),
                registeredAddress = values.clean("registeredAddress"),
                incorporationDate = values.clean("incorporationDate"),
                status = values.clean("status"),
                authorisedCapital = values.clean("authorisedCapital"),
                paidUpCapital = values.clean("paidUpCapital"),
                charges = values.clean("charges"),
                rawText = values.clean("rawText"),
            ),
        )
        "GST" -> onSubmitGst(
            GstManualPayload(
                gstin = values.clean("gstin"),
                tradeName = values.clean("tradeName"),
                legalName = values.clean("legalName"),
                registrationDate = values.clean("registrationDate"),
                taxPayerType = values.clean("taxPayerType"),
                gstStatus = values.clean("gstStatus"),
                stateCode = values.clean("stateCode"),
                principalAddress = values.clean("principalAddress"),
                rawText = values.clean("rawText"),
            ),
        )
        "UDYAM" -> onSubmitUdyam(
            UdyamManualPayload(
                udyamNo = values.clean("udyamNo"),
                enterpriseName = values.clean("enterpriseName"),
                ownerName = values.clean("ownerName"),
                type = values.clean("type"),
                activity = values.clean("activity"),
                nic = values.clean("nic"),
                registrationDate = values.clean("registrationDate"),
                district = values.clean("district"),
                state = values.clean("state"),
                validUpto = values.clean("validUpto"),
                rawText = values.clean("rawText"),
            ),
        )
        else -> onSubmitCourtCase(
            CourtCasePayload(
                caseNumber = values.clean("caseNumber"),
                courtName = values.clean("courtName"),
                filingDate = values.clean("filingDate"),
                caseType = values.clean("caseType"),
                status = values.clean("status"),
                partyRole = values.clean("partyRole"),
                description = values.clean("description"),
                notes = values.clean("notes"),
            ),
        )
    }
}

private fun Map<String, String>.clean(key: String): String? = this[key]?.trim()?.ifBlank { null }
