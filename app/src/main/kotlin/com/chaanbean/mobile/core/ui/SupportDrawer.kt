package com.chaanbean.mobile.core.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

/**
 * Port of main's SupportDrawer, which AppShell renders on every page: a legal and
 * regulatory reference with four tabs.
 *
 * The inquiry tab is deliberately inert, exactly as in main - its handler sets a
 * local "sent" flag and clears the form after four seconds. No endpoint exists
 * for it, so the UI says so rather than implying a ticket was filed.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportSheet(onDismiss: () -> Unit) {
    var tab by remember { mutableIntStateOf(0) }
    val titles = listOf("MSME §16", "TRAI Rules", "IT Act §3A", "Ask Legal")

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 28.dp)) {
            Text(
                "Legal Assistance & Compliance",
                style = MaterialTheme.typography.titleLarge,
            )
            Spacer(Modifier.height(10.dp))
            TabRow(selectedTabIndex = tab) {
                titles.forEachIndexed { index, title ->
                    Tab(
                        selected = tab == index,
                        onClick = { tab = index },
                        text = { Text(title, style = MaterialTheme.typography.labelSmall) },
                    )
                }
            }
            Spacer(Modifier.height(14.dp))
            Column(
                Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                when (tab) {
                    0 -> StatutoryTab()
                    1 -> TraiTab()
                    2 -> EvidenceTab()
                    else -> InquiryTab()
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun Clause(kicker: String, heading: String, body: String, tint: androidx.compose.ui.graphics.Color) {
    ChaanCard {
        Text(kicker.uppercase(), style = MaterialTheme.typography.labelSmall, color = tint)
        Spacer(Modifier.height(4.dp))
        Text(heading, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun StatutoryTab() {
    Clause(
        "Statutory payment mandate",
        "Section 15, MSMED Act 2006",
        "Every buyer who purchases goods or services from a registered MSME must make payment on " +
            "or before the agreed date, which under no circumstances may exceed 45 days from the " +
            "date of acceptance.",
        Chaan.Green,
    )
    Clause(
        "Mandatory compound interest",
        "Section 16, MSMED Act 2006",
        "Where a buyer fails to pay within the statutory period, the buyer is liable to pay compound " +
            "interest with monthly rests at three times the Bank Rate notified by the Reserve Bank " +
            "of India (rate used by main: 20.25% p.a.).",
        Chaan.Amber,
    )
    Clause(
        "Statutory arbitration tribunal",
        "Micro and Small Enterprises Facilitation Council",
        "Disputes over unpaid amounts and accrued penal interest may be referred directly to the " +
            "MSEFC or to institutional arbitration. Awards carry the force of a civil court decree.",
        Chaan.Accent,
    )
}

@Composable
private fun TraiTab() {
    Clause(
        "Telecom regulatory mandate",
        "Calling window 09:00–18:00 IST",
        "Commercial voice dialers and tele-recovery systems must observe the statutory window on " +
            "business days.",
        Chaan.Amber,
    )
    ChaanCard {
        Text("Contact limits", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(6.dp))
        listOf(
            "Maximum 3 voice contact attempts per debtor per calendar day.",
            "One-way announcements must carry clear legal disclosure, without abusive language.",
            "Pre-approved legal scripts in the scheduled Indian languages.",
        ).forEach {
            Text("•  $it", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(4.dp))
        }
    }
    ChaanCard {
        Text("How main actually enforces this", style = MaterialTheme.typography.titleMedium, color = Chaan.Amber)
        Spacer(Modifier.height(6.dp))
        Text(
            "The window and the 3-per-day cap are applied by the policy tick only. The direct " +
                "\"Place L2 voice announcement\" action bypasses both checks and writes a Call row " +
                "regardless of the hour.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun EvidenceTab() {
    Clause(
        "Electronic evidence",
        "Section 65B certificate",
        "Delivery receipts, Asterisk CDR telemetry and notice downloads are hashed with SHA-256 and " +
            "accompanied by an automated Section 65B certificate for admission in judicial proceedings.",
        Chaan.Accent,
    )
    Clause(
        "Electronic signature",
        "Section 3A, IT Act 2000",
        "Aadhaar OTP-based electronic signatures executed through CCA-licensed certifying authorities " +
            "carry legal equivalence to hand-inked signatures.",
        Chaan.Green,
    )
    ChaanCard {
        Text("What this build can verify", style = MaterialTheme.typography.titleMedium, color = Chaan.Amber)
        Spacer(Modifier.height(6.dp))
        Text(
            "main synthesises these hashes and certificates locally; no CCA-licensed authority and no " +
                "Asterisk CDR feed is contacted. Treat the artefacts as placeholders, not as filed evidence.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun InquiryTab() {
    var subject by remember { mutableStateOf("") }
    var details by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }

    ChaanCard {
        Text(
            "Assistance with an MSME arbitration claim, a Section 138 demand notice, or an overdue " +
                "ledger.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
    OutlinedTextField(
        value = subject,
        onValueChange = { subject = it; sent = false },
        label = { Text("Subject / debtor reference") },
        placeholder = { Text("e.g. MSME §18 filing for Metro Supplies Co") },
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
    OutlinedTextField(
        value = details,
        onValueChange = { details = it; sent = false },
        label = { Text("Inquiry details") },
        minLines = 3,
        modifier = Modifier.fillMaxWidth(),
    )
    Button(
        onClick = { sent = true },
        enabled = subject.isNotBlank() && details.isNotBlank(),
        modifier = Modifier.fillMaxWidth(),
    ) { Text("Submit inquiry") }

    ChaanCard {
        Text(
            if (sent) "Recorded on this device only" else "Before you submit",
            style = MaterialTheme.typography.titleMedium,
            color = Chaan.Amber,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            "main has no endpoint behind this form. Its handler only flips a local flag and clears " +
                "the fields after four seconds, so nothing reaches a legal desk. This copy behaves " +
                "the same way rather than pretending a ticket was filed.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** Row used by the top bar to open the sheet. */
@Composable
fun SupportRow(onOpen: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(8.dp)) {
        Button(onClick = onOpen) { Text("Legal help") }
    }
}
