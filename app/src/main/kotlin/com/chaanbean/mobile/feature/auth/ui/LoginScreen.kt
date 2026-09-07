package com.chaanbean.mobile.feature.auth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.auth.data.AuthModule
import com.chaanbean.mobile.feature.auth.data.AuthResult

/**
 * Mirrors /login: two portals (client, admin) each with sign-in and registration.
 *
 * @param onEnterApp returns false when the host NavHost has no destination to move on
 *   to, so the screen can say so instead of appearing to hang.
 */
@Composable
fun LoginScreen(
    onWatchIntro: () -> Unit,
    onEnterApp: () -> Boolean,
) {
    val vm = rememberVm { AuthViewModel(AuthModule.repository(it), it.session) }
    val state by vm.state.collectAsState()
    var noDestination by remember { mutableStateOf(false) }

    val enter = {
        noDestination = !onEnterApp()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
    ) {
        BrandHeader(onWatchIntro = onWatchIntro)
        Spacer(Modifier.height(16.dp))

        val result = state.result
        if (result != null) {
            SessionCard(
                result = result,
                noDestination = noDestination,
                onContinue = enter,
                onSwitch = { vm.signOut() },
            )
        } else {
            state.storedSession?.let { existing ->
                ChaanCard {
                    Text("Session already on this device", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(6.dp))
                    KeyValueRow("Account", existing.name.ifBlank { existing.email })
                    KeyValueRow("Portal", existing.type)
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = enter) { Text("Continue") }
                        OutlinedButton(onClick = { vm.signOut() }) { Text("Sign out") }
                    }
                    if (noDestination) {
                        Spacer(Modifier.height(8.dp))
                        NoDestinationNote()
                    }
                }
                Spacer(Modifier.height(16.dp))
            }

            PortalTabs(portal = state.portal, onSelect = vm::setPortal)
            Spacer(Modifier.height(12.dp))
            ModeTabs(mode = state.mode, onSelect = vm::setMode)
            Spacer(Modifier.height(16.dp))

            state.error?.let { message ->
                ChaanCard {
                    Text(
                        "Request rejected",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.error,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(message, style = MaterialTheme.typography.bodyMedium)
                }
                Spacer(Modifier.height(12.dp))
            }

            when {
                state.portal == AuthPortal.CLIENT && state.mode == AuthMode.SIGN_IN ->
                    ClientSignInFields(vm, state)

                state.portal == AuthPortal.CLIENT -> ClientRegisterFields(vm, state)
                state.mode == AuthMode.SIGN_IN -> AdminSignInFields(vm, state)
                else -> AdminRegisterFields(vm, state)
            }

            Spacer(Modifier.height(18.dp))
            Button(
                onClick = { vm.submit() },
                enabled = !state.submitting,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (state.submitting) "Sending to /api/auth..." else submitLabel(state.portal, state.mode))
            }

            Spacer(Modifier.height(10.dp))
            TextButton(onClick = enter, modifier = Modifier.fillMaxWidth()) {
                Text("Continue without signing in")
            }
            if (noDestination) {
                Spacer(Modifier.height(4.dp))
                NoDestinationNote()
            }
        }

        Spacer(Modifier.height(20.dp))
        HonestyNote()
        Spacer(Modifier.height(24.dp))
    }
}

private fun submitLabel(portal: AuthPortal, mode: AuthMode): String = when {
    portal == AuthPortal.CLIENT && mode == AuthMode.SIGN_IN -> "Open client portal"
    portal == AuthPortal.CLIENT -> "Register enterprise account"
    mode == AuthMode.SIGN_IN -> "Open admin desk"
    else -> "Register admin officer"
}

@Composable
private fun BrandHeader(onWatchIntro: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Chaan.Brand),
            contentAlignment = Alignment.Center,
        ) {
            Text("CB", color = Chaan.TextPrimary, fontWeight = FontWeight.ExtraBold)
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row {
                Text("Chaan", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold)
                Text(
                    "Bean",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.ExtraBold,
                    color = Chaan.Brand,
                )
            }
            Text(
                "B2B Credit Recovery & Verification",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        TextButton(onClick = onWatchIntro) { Text("Intro") }
    }
}

@Composable
private fun PortalTabs(portal: AuthPortal, onSelect: (AuthPortal) -> Unit) {
    TabRow(selectedTabIndex = if (portal == AuthPortal.CLIENT) 0 else 1) {
        Tab(
            selected = portal == AuthPortal.CLIENT,
            onClick = { onSelect(AuthPortal.CLIENT) },
            text = { Text("Client portal") },
        )
        Tab(
            selected = portal == AuthPortal.ADMIN,
            onClick = { onSelect(AuthPortal.ADMIN) },
            text = { Text("Admin desk") },
        )
    }
}

@Composable
private fun ModeTabs(mode: AuthMode, onSelect: (AuthMode) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ModeButton("Sign in", mode == AuthMode.SIGN_IN) { onSelect(AuthMode.SIGN_IN) }
        ModeButton("Create account", mode == AuthMode.REGISTER) { onSelect(AuthMode.REGISTER) }
    }
}

@Composable
private fun ModeButton(label: String, selected: Boolean, onClick: () -> Unit) {
    TextButton(onClick = onClick) {
        Text(
            label,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            color = if (selected) Chaan.Brand else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun Field(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    support: String? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    secret: Boolean = false,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = if (secret) PasswordVisualTransformation() else VisualTransformation.None,
        supportingText = support?.let { text -> { Text(text, style = MaterialTheme.typography.labelSmall) } },
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(Modifier.height(10.dp))
}

@Composable
private fun ClientSignInFields(vm: AuthViewModel, state: AuthUiState) {
    Field(
        value = state.form.clientEmail,
        onValueChange = { v -> vm.updateForm { it.copy(clientEmail = v) } },
        label = "Business email",
        keyboardType = KeyboardType.Email,
    )
    Field(
        value = state.form.clientPassword,
        onValueChange = { v -> vm.updateForm { it.copy(clientPassword = v) } },
        label = "Password",
        support = "Kept on the device. The login_client handler reads only email and companyName, so this is never sent.",
        keyboardType = KeyboardType.Password,
        secret = true,
    )
    Field(
        value = state.form.companyName,
        onValueChange = { v -> vm.updateForm { it.copy(companyName = v) } },
        label = "Company name (optional)",
        support = "Matched as a substring. Left blank, the server falls back to Acme Traders Pvt Ltd, then to the first company row it finds.",
    )
    TextButton(onClick = { vm.fillSampleClient() }) { Text("Fill sample client credentials") }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ClientRegisterFields(vm: AuthViewModel, state: AuthUiState) {
    Field(
        value = state.form.companyName,
        onValueChange = { v -> vm.updateForm { it.copy(companyName = v) } },
        label = "Enterprise company name *",
    )
    Field(
        value = state.form.clientEmail,
        onValueChange = { v -> vm.updateForm { it.copy(clientEmail = v) } },
        label = "Official business email *",
        keyboardType = KeyboardType.Email,
    )
    Field(
        value = state.form.fullName,
        onValueChange = { v -> vm.updateForm { it.copy(fullName = v) } },
        label = "Contact person",
    )
    Field(
        value = state.form.phone,
        onValueChange = { v -> vm.updateForm { it.copy(phone = v) } },
        label = "Mobile (+91)",
        keyboardType = KeyboardType.Phone,
    )
    Field(
        value = state.form.pan,
        onValueChange = { v -> vm.updateForm { it.copy(pan = v.uppercase().take(10)) } },
        label = "Entity PAN",
        support = "Stored as sent. The server derives the Trust ID prefix from it but does not validate it against any registry.",
    )
    Field(
        value = state.form.gstin,
        onValueChange = { v -> vm.updateForm { it.copy(gstin = v.uppercase().take(15)) } },
        label = "GSTIN",
    )
    Text("Subscription tier", style = MaterialTheme.typography.labelMedium)
    Spacer(Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(
            selected = state.form.plan == "growth",
            onClick = { vm.updateForm { it.copy(plan = "growth") } },
            label = { Text("Growth") },
        )
        FilterChip(
            selected = state.form.plan == "enterprise",
            onClick = { vm.updateForm { it.copy(plan = "enterprise") } },
            label = { Text("Enterprise") },
        )
    }
    Spacer(Modifier.height(6.dp))
    Text(
        "Registering creates a Company row and a TrustProfile on the server, and opens the wallet with ₹2,50,000 of credits.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun AdminSignInFields(vm: AuthViewModel, state: AuthUiState) {
    Field(
        value = state.form.adminEmail,
        onValueChange = { v -> vm.updateForm { it.copy(adminEmail = v) } },
        label = "Administrator email",
        support = "No match, and the server hands back the first owner account instead - or creates one.",
        keyboardType = KeyboardType.Email,
    )
    Field(
        value = state.form.adminPassword,
        onValueChange = { v -> vm.updateForm { it.copy(adminPassword = v) } },
        label = "Admin passkey",
        support = "Sent as `password`. The handler accepts the field and never compares it, so any value opens the desk.",
        keyboardType = KeyboardType.Password,
        secret = true,
    )
    TextButton(onClick = { vm.fillSampleAdmin() }) { Text("Fill sample admin credentials") }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminRegisterFields(vm: AuthViewModel, state: AuthUiState) {
    Field(
        value = state.form.adminName,
        onValueChange = { v -> vm.updateForm { it.copy(adminName = v) } },
        label = "Administrator full name *",
    )
    Field(
        value = state.form.adminEmail,
        onValueChange = { v -> vm.updateForm { it.copy(adminEmail = v) } },
        label = "Official admin email *",
        keyboardType = KeyboardType.Email,
    )
    Field(
        value = state.form.securityKey,
        onValueChange = { v -> vm.updateForm { it.copy(securityKey = v) } },
        label = "Master security key",
        support = "Compared against a hardcoded list only when you supply one; an empty key skips the check.",
    )
    Text("Role assignment", style = MaterialTheme.typography.labelMedium)
    Spacer(Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(
            selected = state.form.adminRole == "owner",
            onClick = { vm.updateForm { it.copy(adminRole = "owner") } },
            label = { Text("System owner") },
        )
        FilterChip(
            selected = state.form.adminRole == "team_member",
            onClick = { vm.updateForm { it.copy(adminRole = "team_member") } },
            label = { Text("Team member") },
        )
    }
}

@Composable
private fun SessionCard(
    result: AuthResult,
    noDestination: Boolean,
    onContinue: () -> Unit,
    onSwitch: () -> Unit,
) {
    ChaanCard {
        Text("Session stored on this device", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            "The server returned an account and no token. Nothing was verified.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(10.dp))
        StatusPill(
            text = if (result.type == "admin") "ADMIN DESK" else "CLIENT PORTAL",
            tint = Chaan.Accent,
        )
        Spacer(Modifier.height(10.dp))
        KeyValueRow("Account", result.user.name.ifBlank { "—" })
        result.user.fullName?.let { KeyValueRow("Contact", it) }
        result.user.email?.let { KeyValueRow("Email", it) }
        KeyValueRow("Role", result.user.role.ifBlank { "—" })
        result.user.plan?.let { KeyValueRow("Plan", it) }
        result.user.walletBalance?.let { KeyValueRow("Wallet credits", formatInr(it)) }
        result.user.trustId?.let { KeyValueRow("Trust ID", it) }
        result.message?.let {
            Spacer(Modifier.height(6.dp))
            Text(it, style = MaterialTheme.typography.bodySmall, color = Chaan.Green)
        }
        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = onContinue) { Text("Continue") }
            OutlinedButton(onClick = onSwitch) { Text("Use another account") }
        }
        if (noDestination) {
            Spacer(Modifier.height(10.dp))
            NoDestinationNote()
        }
    }
}

@Composable
private fun NoDestinationNote() {
    Text(
        "This build registers no destination beyond the auth screens, so there is nowhere to continue to yet.",
        style = MaterialTheme.typography.labelSmall,
        color = Chaan.Amber,
    )
}

@Composable
private fun HonestyNote() {
    ChaanCard {
        Text("What sign-in does here", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(8.dp))
        Bullet("/api/auth performs no authentication. login_client ignores credentials entirely and login_admin accepts a password it never compares.")
        Bullet("No token or cookie comes back, and no other endpoint in this app sends one. Choosing a portal changes what you are shown, not what you are allowed to reach.")
        Bullet("Creating an account writes a real row to the server's database. Signing out here only clears the copy stored on this phone.")
    }
}

@Composable
private fun Bullet(text: String) {
    Row(Modifier.padding(bottom = 6.dp)) {
        Text("• ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(
            text,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
