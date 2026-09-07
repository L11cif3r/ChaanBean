package com.chaanbean.mobile.feature.backgroundcheck.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.backgroundcheck.data.BackgroundCheckModule

/**
 * The two-step GST Supreme flow.
 *
 * Read `otp-verify/route.ts` and `verifyGstSupremeOtp` before changing the copy here:
 * the handler destructures `otp`, passes it down, and the provider function never reads
 * it. Nothing on this screen may imply the code was checked.
 */
@Composable
fun GstOtpScreen() {
    val vm = rememberVm { GstOtpViewModel(BackgroundCheckModule.repository(it)) }
    val state by vm.state.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SectionHeader(
            "GST Supreme Report - OTP flow",
            "Two calls: otp-initiate creates a session, otp-verify stores a report.",
        )

        CaveatBox(
            title = "This is not a verification step",
            tint = Chaan.Red,
            text = "otp-verify accepts a code and never checks it - verifyGstSupremeOtp reads only " +
                "the session id, so any six digits produce the same report. The flow is an audit " +
                "trail of who clicked, not proof that the taxpayer consented.",
        )

        ChaanCard {
            Text("Step 1 - request a session", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = state.gstin,
                onValueChange = vm::onGstinChange,
                label = { Text("GSTIN") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = state.mobile,
                onValueChange = vm::onMobileChange,
                label = { Text("Authorised signatory mobile") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "The mobile is used only to build the message text below; the server defaults it to " +
                    "9876543210 when blank.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(14.dp))
            Button(
                onClick = { vm.initiate() },
                enabled = state.gstin.isNotBlank() && !state.initiating,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (state.initiating) "Requesting..." else "Request OTP session")
            }
        }

        val sessionId = state.sessionId
        if (sessionId != null) {
            ChaanCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("Session open", style = MaterialTheme.typography.titleMedium)
                    StatusPill("NO SMS SENT", Chaan.Amber)
                }
                Spacer(Modifier.height(8.dp))
                KeyValueRow("Session id", sessionId)
                state.gatewayMessage?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "GATEWAY MESSAGE, VERBATIM",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(10.dp))
                CaveatBox(
                    text = "initiateGstSupremeOtp only puts a random id in an in-process map and " +
                        "formats that sentence. No SMS gateway is called, so no code will arrive. " +
                        "The session also survives nothing: after a server restart the map is empty, " +
                        "yet verify still accepts any id starting with GST-OTP.",
                )
            }

            ChaanCard {
                Text("Step 2 - submit a code", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = state.code,
                    onValueChange = vm::onCodeChange,
                    label = { Text("6-digit code") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    "Whatever you type is sent as `otp` and discarded server-side.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(14.dp))
                Button(
                    onClick = { vm.submit() },
                    enabled = state.code.isNotBlank() && !state.verifying,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(if (state.verifying) "Submitting..." else "Submit and fetch report")
                }
            }
        }

        state.error?.let { ErrorBox(it) }

        val payload = state.payload
        if (payload != null) {
            ChaanCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text("GST Supreme Report", style = MaterialTheme.typography.titleMedium)
                    StatusPill("STORED, UNVERIFIED", Chaan.Amber)
                }
                Spacer(Modifier.height(8.dp))
                state.reportId?.let { KeyValueRow("VerificationReport id", it) }
                KeyValueRow("Provider", "GST Supreme Intermediary Gateway")
                Spacer(Modifier.height(10.dp))
                JsonFields(payload)
                Spacer(Modifier.height(12.dp))
                CaveatBox(
                    title = "What this row means",
                    text = "The server wrote a VerificationReport with status \"completed\" and a " +
                        "30-day cache window. The filing counts and counterparty PANs come from your " +
                        "own vendor and buyer tables, and the consistency verdict is picked by the " +
                        "subject's overdue or defaulted flag - not from GSTN returns.",
                )
                Spacer(Modifier.height(4.dp))
                TextButton(onClick = { vm.reset() }) { Text("Start over") }
            }
        }

        Spacer(Modifier.height(32.dp))
    }
}
