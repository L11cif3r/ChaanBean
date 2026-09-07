package com.chaanbean.mobile.feature.recovery.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.recovery.data.PAYMENT_MODES
import com.chaanbean.mobile.feature.recovery.data.RecoveryModule
import com.chaanbean.mobile.feature.recovery.data.SettlementResponse

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecoverySettlementScreen(
    creditAccountId: String,
    onBack: () -> Unit,
) {
    val vm = rememberVm {
        RecoverySettlementViewModel(RecoveryModule.repository(it), creditAccountId)
    }
    val state by vm.state.collectAsState()
    val snackbar = remember { SnackbarHostState() }

    var amountText by remember { mutableStateOf("") }
    var mode by remember { mutableStateOf(PAYMENT_MODES.first()) }
    var utr by remember { mutableStateOf("") }
    var payerName by remember { mutableStateOf("") }
    var confirming by remember { mutableStateOf(false) }

    LaunchedEffect(state.message) {
        val message = state.message
        if (message != null) {
            snackbar.showSnackbar(message)
            vm.clearMessage()
        }
    }

    val loaded = when (val current = state.detail) {
        is Outcome.Ok -> current.value
        else -> null
    }
    val outstanding = loaded?.account?.outstandingAmount ?: 0.0
    val entered = amountText.trim().toDoubleOrNull()
    // Blank means "settle the whole balance" — that is what the server does with a
    // missing or non-positive paymentAmount.
    val effective = entered?.takeIf { it > 0 } ?: outstanding
    val remaining = (outstanding - effective).coerceAtLeast(0.0)
    val discarded = (effective - outstanding).coerceAtLeast(0.0)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Record settlement") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when (val outcome = state.detail) {
                is Outcome.Loading -> item { LoadingBox() }
                is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = { vm.refresh() }) }
                is Outcome.Ok -> {
                    val account = outcome.value.account

                    item {
                        SectionHeader(
                            account.buyerName,
                            "Outstanding ${formatInr(account.outstandingAmount)} · due ${account.dueDate.take(10)}",
                        )
                    }

                    item { ServerLimitsCard() }

                    if (state.submissions > 0) {
                        item {
                            CaveatNote(
                                "You have already submitted ${state.submissions} settlement(s) for this " +
                                    "account on this screen. Submitting again will subtract the amount " +
                                    "a second time — the server will not recognise it as the same payment.",
                                tint = Chaan.Red,
                            )
                        }
                    }

                    item {
                        SettlementForm(
                            amountText = amountText,
                            onAmountChange = { amountText = it },
                            mode = mode,
                            onModeChange = { mode = it },
                            utr = utr,
                            onUtrChange = { utr = it },
                            payerName = payerName,
                            onPayerNameChange = { payerName = it },
                            defaultPayerName = account.buyerName,
                        )
                    }

                    item {
                        EffectPreview(
                            previousBalance = account.outstandingAmount,
                            applying = effective,
                            remaining = remaining,
                            discarded = discarded,
                            amountBlank = entered == null || entered <= 0.0,
                        )
                    }

                    item {
                        Button(
                            onClick = { confirming = true },
                            enabled = !state.submitting,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(if (state.submitting) "Posting…" else "Review and submit")
                        }
                    }

                    state.receipt?.let { item { ReceiptCard(it) } }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }

    if (confirming && loaded != null) {
        ConfirmSettlementDialog(
            applying = effective,
            remaining = remaining,
            discarded = discarded,
            mode = mode,
            utrProvided = utr.isNotBlank(),
            onDismiss = { confirming = false },
            onConfirm = {
                confirming = false
                vm.submit(
                    amount = entered?.takeIf { it > 0 },
                    mode = mode,
                    utr = utr.trim().ifBlank { null },
                    payerName = payerName.trim().ifBlank { null },
                )
            },
        )
    }
}

/**
 * The settle route's real properties, read off src/app/api/recovery/settle/route.ts.
 * This is the first thing on the screen because every one of these is a way to lose money.
 */
@Composable
private fun ServerLimitsCard() {
    ChaanCard {
        Text("Before you submit", style = MaterialTheme.typography.titleMedium, color = Chaan.Amber)
        Spacer(Modifier.height(8.dp))
        LimitLine(
            "No duplicate detection.",
            "The endpoint takes no idempotency key and stores nothing that would let it " +
                "recognise a repeat. Posting the same payment twice subtracts it twice.",
        )
        LimitLine(
            "No signature or authentication.",
            "It is documented as a settlement webhook but verifies no signature and requires " +
                "no credential. Anyone who can reach the URL can zero a balance.",
        )
        LimitLine(
            "Three separate writes, no transaction.",
            "The balance update, the escalation-state update and the evidence-log entry are " +
                "three unwrapped calls. If one fails after another succeeded, the account is " +
                "left inconsistent and nothing rolls back.",
        )
        LimitLine(
            "Overpayment is silently discarded.",
            "The remaining balance is clamped with max(0, …). Anything above the outstanding " +
                "amount is not recorded as credit and does not appear on the receipt.",
        )
        LimitLine(
            "A blank amount settles everything.",
            "A missing or non-positive amount makes the server apply the full outstanding balance.",
        )
    }
}

@Composable
private fun LimitLine(title: String, body: String) {
    Column(Modifier.padding(bottom = 10.dp)) {
        Text(title, style = MaterialTheme.typography.bodyMedium, color = Chaan.Amber)
        Spacer(Modifier.height(2.dp))
        Text(
            body,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun SettlementForm(
    amountText: String,
    onAmountChange: (String) -> Unit,
    mode: String,
    onModeChange: (String) -> Unit,
    utr: String,
    onUtrChange: (String) -> Unit,
    payerName: String,
    onPayerNameChange: (String) -> Unit,
    defaultPayerName: String,
) {
    ChaanCard {
        OutlinedTextField(
            value = amountText,
            onValueChange = onAmountChange,
            label = { Text("Amount received (₹)") },
            supportingText = { Text("Leave blank to settle the entire outstanding balance.") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        Text("Payment mode", style = MaterialTheme.typography.labelLarge)
        Spacer(Modifier.height(6.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PAYMENT_MODES.forEach { candidate ->
                if (candidate == mode) {
                    Button(onClick = { onModeChange(candidate) }) { Text(candidate) }
                } else {
                    OutlinedButton(onClick = { onModeChange(candidate) }) { Text(candidate) }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = utr,
            onValueChange = onUtrChange,
            label = { Text("Bank UTR / reference") },
            supportingText = {
                Text("Left blank, the server mints an id from a hash of the amount and timestamp. That is not a bank reference.")
            },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = payerName,
            onValueChange = onPayerNameChange,
            label = { Text("Payer name") },
            supportingText = { Text("Defaults to $defaultPayerName.") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun EffectPreview(
    previousBalance: Double,
    applying: Double,
    remaining: Double,
    discarded: Double,
    amountBlank: Boolean,
) {
    ChaanCard {
        Text("What the server will do", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(8.dp))
        KeyValueRow("Current balance", formatInr(previousBalance))
        KeyValueRow(
            "Amount applied",
            formatInr(applying) + if (amountBlank) " (full balance)" else "",
        )
        KeyValueRow("Balance after", formatInr(remaining))
        KeyValueRow("Account status after", if (remaining == 0.0) "settled · escalation Resolved" else "unchanged")
        if (discarded > 0.0) {
            Spacer(Modifier.height(10.dp))
            CaveatNote(
                "${formatInr(discarded)} of this payment exceeds the outstanding balance and will " +
                    "be discarded. The server clamps at zero and records only the applied amount.",
                tint = Chaan.Red,
            )
        }
    }
}

@Composable
private fun ConfirmSettlementDialog(
    applying: Double,
    remaining: Double,
    discarded: Double,
    mode: String,
    utrProvided: Boolean,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Submit this settlement?") },
        text = {
            Column {
                Text("${formatInr(applying)} via $mode. Balance after: ${formatInr(remaining)}.")
                Spacer(Modifier.height(10.dp))
                Text(
                    "This cannot be undone from the app, and the server cannot detect a duplicate " +
                        "submission. If you are unsure whether an earlier attempt went through, " +
                        "check the escalation history before submitting again.",
                    style = MaterialTheme.typography.bodySmall,
                )
                if (discarded > 0.0) {
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "${formatInr(discarded)} above the outstanding balance will be discarded.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Chaan.Red,
                    )
                }
                if (!utrProvided) {
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "No UTR entered — the receipt will carry a server-generated id, not a bank reference.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Chaan.Amber,
                    )
                }
            }
        },
        confirmButton = { Button(onClick = onConfirm) { Text("Submit settlement") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun ReceiptCard(receipt: SettlementResponse) {
    ChaanCard {
        Text("Settlement recorded", style = MaterialTheme.typography.titleMedium, color = Chaan.Green)
        Spacer(Modifier.height(8.dp))
        receipt.receiptNumber?.let { KeyValueRow("Receipt", it) }
        receipt.utrNumber?.let { KeyValueRow("UTR", it) }
        receipt.previousBalance?.let { KeyValueRow("Previous balance", formatInr(it)) }
        receipt.remainingBalance?.let { KeyValueRow("Remaining balance", formatInr(it)) }
        KeyValueRow("Fully settled", if (receipt.isFullySettled) "Yes" else "No")
        receipt.settlementHash?.let {
            Spacer(Modifier.height(6.dp))
            MonoValue("SHA-256 ${it.take(24)}…")
        }
        Spacer(Modifier.height(10.dp))
        CaveatNote(
            "The hash is computed from the account id, UTR, amount and receipt number by the same " +
                "handler that stores it, so it proves the row was written — not that a payment arrived.",
            tint = Chaan.TextMuted,
        )
    }
}
