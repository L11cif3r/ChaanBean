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
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.trusthub.data.IssuedTrustProfile
import com.chaanbean.mobile.feature.trusthub.data.RegisterTrustIdRequest
import com.chaanbean.mobile.feature.trusthub.data.TrustHubModule

private data class BusinessType(val value: String, val label: String, val fee: Int)

private val businessTypes = listOf(
    BusinessType("proprietorship", "Proprietorship", 1000),
    BusinessType("partnership", "Partnership / LLP", 1500),
    BusinessType("company", "Private Limited", 2000),
)

@Composable
fun TrustRegisterScreen(onVerifyIssued: (String) -> Unit = {}) {
    val vm = rememberVm { TrustRegisterViewModel(TrustHubModule.repository(it)) }
    val state by vm.state.collectAsState()

    var companyName by remember { mutableStateOf("") }
    var pan by remember { mutableStateOf("") }
    var gstin by remember { mutableStateOf("") }
    var cin by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var signatory by remember { mutableStateOf("") }
    var businessType by remember { mutableStateOf(businessTypes[1]) }

    val issued = state.issued

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            SectionHeader(
                "Register for a Trust ID",
                "Mints a ChaanBean Trust ID for your business and publishes it to the network.",
            )
        }

        if (issued != null) {
            item { IssuedCard(issued, onVerify = { onVerifyIssued(issued.trustId) }) }
            item {
                TextButton(onClick = { vm.reset() }) { Text("Register another business") }
            }
        } else {
            item { BeforeYouApplyCard() }
            item {
                ChaanCard {
                    Text("Business structure", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Sets the verification fee. It does not change what is checked.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    businessTypes.forEach { type ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            if (type.value == businessType.value) {
                                Button(
                                    onClick = { businessType = type },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Text(type.label)
                                }
                            } else {
                                OutlinedButton(
                                    onClick = { businessType = type },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Text(type.label)
                                }
                            }
                            Spacer(Modifier.width(10.dp))
                            Column(Modifier.width(88.dp)) {
                                Text(
                                    formatInr(type.fee.toDouble()),
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }
                }
            }
            item {
                ChaanCard {
                    Text("Entity details", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(12.dp))
                    OutlinedTextField(
                        value = companyName,
                        onValueChange = { companyName = it },
                        label = { Text("Registered entity name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = pan,
                        onValueChange = { pan = it },
                        label = { Text("PAN") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = gstin,
                        onValueChange = { gstin = it },
                        label = { Text("GSTIN (optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = cin,
                        onValueChange = { cin = it },
                        label = { Text("CIN (optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = signatory,
                        onValueChange = { signatory = it },
                        label = { Text("Authorized signatory (optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("Phone (optional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = {
                            vm.submit(
                                RegisterTrustIdRequest(
                                    companyName = companyName.trim(),
                                    pan = pan.trim().uppercase(),
                                    businessType = businessType.value,
                                    gstin = gstin.trim().ifBlank { null }?.uppercase(),
                                    cin = cin.trim().ifBlank { null }?.uppercase(),
                                    phone = phone.trim().ifBlank { null },
                                    authorizedSignatory = signatory.trim().ifBlank { null },
                                ),
                            )
                        },
                        enabled = companyName.isNotBlank() && pan.isNotBlank() && !state.submitting,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            if (state.submitting) {
                                "Submitting..."
                            } else {
                                "Issue Trust ID for " + formatInr(businessType.fee.toDouble())
                            },
                        )
                    }
                }
            }
            state.error?.let { message -> item { ErrorBox(message) } }
        }
        item { Spacer(Modifier.height(40.dp)) }
    }
}

@Composable
private fun BeforeYouApplyCard() {
    ChaanCard {
        StatusPill("READ THIS FIRST", Chaan.Amber)
        Spacer(Modifier.height(10.dp))
        Text(
            "The registration endpoint checks two things: that a name and a PAN were supplied, " +
                "and that no community default row matches your PAN, GSTIN or name. If a match " +
                "exists the request is refused outright.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "It does not validate the PAN, GSTIN or CIN against NSDL, the GST Network or MCA21. " +
                "Whatever you type is stored and later echoed back as your profile.",
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "The server has no authentication, so the fee is debited from the first company " +
                "record in the database rather than from a signed-in account - and if that " +
                "wallet cannot cover the fee, the Trust ID is still issued and nothing is " +
                "charged.",
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun IssuedCard(profile: IssuedTrustProfile, onVerify: () -> Unit) {
    ChaanCard {
        StatusPill("TRUST ID ISSUED", Chaan.Green)
        Spacer(Modifier.height(10.dp))
        Text(profile.trustId, style = MaterialTheme.typography.headlineSmall)
        Spacer(Modifier.height(4.dp))
        Text(
            profile.companyName,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        KeyValueRow("Business type", profile.businessType)
        KeyValueRow("PAN submitted", profile.pan)
        KeyValueRow("GSTIN submitted", profile.gstin ?: "—")
        KeyValueRow("CIN submitted", profile.cin ?: "—")
        KeyValueRow("Signatory", profile.authorizedSignatory)
        KeyValueRow("Phone", profile.phone)
        KeyValueRow("Fee charged", formatInr(profile.verificationFee.toDouble()))
        KeyValueRow("Issued", shortDate(profile.issuedAt))
        if (profile.badges.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Text(
                "Badges attached",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
            profile.badges.forEach { badge ->
                Text("• " + badge, style = MaterialTheme.typography.bodySmall)
            }
        }
        Spacer(Modifier.height(10.dp))
        Text(
            "These badges are fixed strings the handler attaches to every successful " +
                "registration. \"GST Verified Enterprise\" was not earned by a GST check.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        Text("Certificate hash", style = MaterialTheme.typography.labelMedium)
        Spacer(Modifier.height(2.dp))
        Text(profile.certificateHash, style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onVerify, modifier = Modifier.fillMaxWidth()) {
            Text("Look this Trust ID up")
        }
    }
}
