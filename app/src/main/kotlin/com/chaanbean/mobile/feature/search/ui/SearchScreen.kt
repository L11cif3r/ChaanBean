package com.chaanbean.mobile.feature.search.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AssistChip
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.model.Outcome
import com.chaanbean.mobile.core.model.RiskFlag
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.EmptyBox
import com.chaanbean.mobile.core.ui.ErrorBox
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.LoadingBox
import com.chaanbean.mobile.core.ui.RiskBadge
import com.chaanbean.mobile.core.ui.SectionHeader
import com.chaanbean.mobile.core.ui.StatusPill
import com.chaanbean.mobile.core.ui.formatInr
import com.chaanbean.mobile.core.ui.rememberVm
import com.chaanbean.mobile.feature.search.data.BusinessSummary
import com.chaanbean.mobile.feature.search.data.HitKind
import com.chaanbean.mobile.feature.search.data.MIN_QUERY_LENGTH
import com.chaanbean.mobile.feature.search.data.SearchHit
import com.chaanbean.mobile.feature.search.data.SearchModule

private const val BUSINESS_CAP = 20

@Composable
fun SearchScreen() {
    val vm = rememberVm { SearchViewModel(SearchModule.repository(it)) }
    val state by vm.state.collectAsState()
    var openHit by remember { mutableStateOf<SearchHit?>(null) }
    var openBusiness by remember { mutableStateOf<BusinessSummary?>(null) }

    Scaffold { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            SearchField(
                query = state.query,
                onQueryChange = vm::onQueryChange,
                onSubmit = vm::submit,
                onClear = vm::clearQuery,
            )
            if (state.searching) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            } else {
                Spacer(Modifier.height(4.dp))
            }
            FlagFilterRow(selected = state.flagFilter, onSelect = vm::onFlagFilterChange)

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                if (state.queryTooShort) {
                    item { StartHere(recent = state.recent, onRecent = vm::onRecentSelected) }
                    item { ScopeNote() }
                } else {
                    if (state.searching && !state.hasSearched) {
                        item { LoadingBox() }
                    }
                    businessSection(
                        outcome = state.businesses,
                        flagFilter = state.flagFilter,
                        onRetry = vm::retry,
                        onOpen = { openBusiness = it },
                    )
                    hitSections(
                        outcome = state.hits,
                        onRetry = vm::retry,
                        onOpen = { openHit = it },
                    )
                    item { ScopeNote() }
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    openHit?.let { hit ->
        HitDetailSheet(hit = hit, onDismiss = { openHit = null })
    }
    openBusiness?.let { business ->
        BusinessDetailSheet(business = business, onDismiss = { openBusiness = null })
    }
}

@Composable
private fun SearchField(
    query: String,
    onQueryChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onClear: () -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    val focusManager = LocalFocusManager.current

    // The screen exists only to be typed into, so it takes focus on arrival.
    LaunchedEffect(Unit) { runCatching { focusRequester.requestFocus() } }

    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .focusRequester(focusRequester),
        singleLine = true,
        label = { Text("Search the network") },
        placeholder = { Text("Name, GSTIN, PAN, CIN, phone or Trust ID") },
        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
        trailingIcon = {
            if (query.isNotEmpty()) {
                IconButton(onClick = onClear) {
                    Icon(Icons.Filled.Close, contentDescription = "Clear search")
                }
            }
        },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
        keyboardActions = KeyboardActions(
            onSearch = {
                onSubmit()
                focusManager.clearFocus()
            },
        ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun FlagFilterRow(selected: String?, onSelect: (String?) -> Unit) {
    val options = listOf(null, "GREEN", "AMBER", "RED")
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "Risk flag",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        options.forEach { option ->
            FilterChip(
                selected = selected == option,
                onClick = { onSelect(option) },
                label = { Text(option ?: "Any") },
            )
        }
        Text(
            "verification profiles only",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StartHere(recent: List<String>, onRecent: (String) -> Unit) {
    Column {
        SectionHeader(
            "Global search",
            "One term, queried across buyers, vendors, community defaults, network trust " +
                "profiles and business verification profiles.",
        )
        ChaanCard {
            Text(
                "Type at least " + MIN_QUERY_LENGTH + " characters.",
                style = MaterialTheme.typography.titleSmall,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "The server returns an empty list below that length, so nothing is sent until " +
                    "then. Matching is plain substring matching on stored text - there is no " +
                    "fuzzy matching, ranking or typo tolerance behind it.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        if (recent.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Text(
                "RECENT",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                recent.forEach { term ->
                    AssistChip(onClick = { onRecent(term) }, label = { Text(term) })
                }
            }
        }
    }
}

/** Both caveats are properties of main's server, not of this screen. */
@Composable
private fun ScopeNote() {
    ChaanCard {
        Text("What these results are", style = MaterialTheme.typography.titleSmall)
        Spacer(Modifier.height(6.dp))
        Text(
            "The server performs no authentication and neither search endpoint filters by " +
                "company, so matches from every company on the instance are returned, not just " +
                "yours.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Verification profiles are self-declared. Every identifier the server stores is " +
                "recorded as USER_PROVIDED and no handler advances a profile's source status " +
                "past PENDING, so nothing here has been checked against a GST, MCA or Udyam " +
                "registry.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

private fun LazyListScope.businessSection(
    outcome: Outcome<List<BusinessSummary>>,
    flagFilter: String?,
    onRetry: () -> Unit,
    onOpen: (BusinessSummary) -> Unit,
) {
    item {
        GroupHeader(
            title = "Business verification profiles",
            blurb = "Matched on company name, GSTIN, CIN or PAN.",
        )
    }
    when (outcome) {
        is Outcome.Loading -> item { LoadingBox() }
        is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = onRetry) }
        is Outcome.Ok -> {
            val list = outcome.value
            if (list.isEmpty()) {
                item {
                    EmptyBox(
                        if (flagFilter == null) "No verification profiles matched."
                        else "No verification profiles matched with a " + flagFilter + " flag.",
                    )
                }
            } else {
                items(list, key = { "biz:" + it.id }) { BusinessCard(it, onOpen) }
                if (list.size >= BUSINESS_CAP) {
                    item { CapNote(BUSINESS_CAP) }
                }
            }
        }
    }
}

private fun LazyListScope.hitSections(
    outcome: Outcome<List<SearchHit>>,
    onRetry: () -> Unit,
    onOpen: (SearchHit) -> Unit,
) {
    when (outcome) {
        is Outcome.Loading -> item { LoadingBox() }
        is Outcome.Err -> item { ErrorBox(outcome.message, onRetry = onRetry) }
        is Outcome.Ok -> {
            val grouped = outcome.value.groupBy { HitKind.from(it.type) }
            HitKind.entries.forEach { kind ->
                val rows = grouped[kind].orEmpty()
                if (rows.isEmpty()) return@forEach
                item { GroupHeader(title = kind.label, blurb = kind.blurb) }
                items(rows, key = { kind.name + ":" + it.id }) { HitCard(it, onOpen) }
                if (kind == HitKind.DEBTOR) {
                    item { DebtorCaveat() }
                }
                if (kind.serverCap > 0 && rows.size >= kind.serverCap) {
                    item { CapNote(kind.serverCap) }
                }
            }
        }
    }
}

@Composable
private fun GroupHeader(title: String, blurb: String) {
    Column(Modifier.padding(top = 8.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
        Text(
            blurb,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun CapNote(cap: Int) {
    Text(
        "Showing the server's maximum of " + cap + " for this group. Narrow the term to reach " +
            "anything it left out.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 4.dp),
    )
}

@Composable
private fun DebtorCaveat() {
    Text(
        "Outstanding is read from the buyer's first credit account only, not the sum of all of " +
            "them. The server also labels a buyer AMBER when no risk flag has been computed, so " +
            "an amber badge here does not by itself mean an assessment was run.",
        style = MaterialTheme.typography.labelSmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(horizontal = 4.dp),
    )
}

@Composable
private fun HitCard(hit: SearchHit, onOpen: (SearchHit) -> Unit) {
    ChaanCard(modifier = Modifier.clickable { onOpen(hit) }) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(hit.title, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    hit.identifier,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(10.dp))
            StatusPill(text = hit.badge, tint = badgeTint(hit.badgeColor))
        }
        Spacer(Modifier.height(8.dp))
        Text(hit.subtitle, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun BusinessCard(business: BusinessSummary, onOpen: (BusinessSummary) -> Unit) {
    ChaanCard(modifier = Modifier.clickable { onOpen(business) }) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top,
        ) {
            Column(Modifier.weight(1f)) {
                Text(business.companyName, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(2.dp))
                Text(
                    business.gstin ?: business.cin ?: business.pan ?: business.udyamNo
                        ?: "No identifier on file",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.width(10.dp))
            RiskBadge(RiskFlag.from(business.riskFlag?.flag))
        }
        val flag = business.riskFlag
        if (flag != null) {
            Spacer(Modifier.height(8.dp))
            KeyValueRow("Composite score", flag.compositeScore.toString())
            KeyValueRow("Recommended limit", formatInr(flag.recommendedLimit))
            KeyValueRow("Recommended tenor", flag.recommendedTenor.toString() + " days")
        } else {
            Spacer(Modifier.height(8.dp))
            Text(
                "No risk flag has been computed for this profile.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(8.dp))
        StatusPill(text = business.overallStatus, tint = statusTint(business.overallStatus))
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun HitDetailSheet(hit: SearchHit, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(hit.title, style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(4.dp))
            StatusPill(text = hit.badge, tint = badgeTint(hit.badgeColor))
            Spacer(Modifier.height(14.dp))
            KeyValueRow("Result type", HitKind.from(hit.type).label)
            KeyValueRow("Identifier", hit.identifier)
            KeyValueRow("Summary", hit.subtitle)
            KeyValueRow("Record ID", hit.id)
            KeyValueRow("Web destination", hit.href)
            Spacer(Modifier.height(12.dp))
            Text(
                "This is everything /api/search returns for a result - it composes these six " +
                    "fields itself rather than returning the record. The web destination is a " +
                    "page path for the browser app; this build has no screen for that record, " +
                    "so there is nothing further to open from here.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BusinessDetailSheet(business: BusinessSummary, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
        ) {
            Text(business.companyName, style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(6.dp))
            RiskBadge(RiskFlag.from(business.riskFlag?.flag))
            Spacer(Modifier.height(14.dp))
            business.gstin?.let { KeyValueRow("GSTIN", it) }
            business.pan?.let { KeyValueRow("PAN", it) }
            business.cin?.let { KeyValueRow("CIN", it) }
            business.udyamNo?.let { KeyValueRow("Udyam", it) }
            business.phone?.let { KeyValueRow("Phone", it) }
            business.enterpriseType?.let { KeyValueRow("Enterprise type", it) }
            business.primaryActivity?.let { KeyValueRow("Primary activity", it) }
            business.registeredAddr?.let { KeyValueRow("Registered address", it) }
            business.incorporatedOn?.let { KeyValueRow("Incorporated on", it) }
            KeyValueRow("Profile status", business.overallStatus)
            KeyValueRow("Source status", business.sourceStatus)

            val flag = business.riskFlag
            if (flag != null) {
                Spacer(Modifier.height(10.dp))
                Text("Risk flag", style = MaterialTheme.typography.titleSmall)
                KeyValueRow("Composite score", flag.compositeScore.toString())
                KeyValueRow("Recommended limit", formatInr(flag.recommendedLimit))
                KeyValueRow("Recommended tenor", flag.recommendedTenor.toString() + " days")
                flag.computedAt?.let { KeyValueRow("Computed at", it) }
                val hardFlags = flag.hardRedFlags
                if (!hardFlags.isNullOrBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "Hard red flags (raw JSON as stored): " + hardFlags,
                        style = MaterialTheme.typography.bodySmall,
                        color = Chaan.Red,
                    )
                }
            } else {
                Spacer(Modifier.height(10.dp))
                Text(
                    "No risk flag row exists for this profile, so it is unrated rather than low " +
                        "risk.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            Spacer(Modifier.height(12.dp))
            Text(
                "Source status stays PENDING on this server: the verification run records every " +
                    "identifier as USER_PROVIDED and never queries an external registry. Treat " +
                    "these details as declared by whoever entered them.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/** main sends the four palette names its web badges use; map them, do not reinterpret them. */
private fun badgeTint(badgeColor: String): Color = when (badgeColor.trim().lowercase()) {
    "green" -> Chaan.Green
    "amber" -> Chaan.Amber
    "red" -> Chaan.Red
    "sky" -> Chaan.Accent
    else -> Chaan.TextMuted
}

private fun statusTint(status: String): Color = when (status.trim().uppercase()) {
    "ACTIVE", "COMPLETED" -> Chaan.Green
    "PENDING", "PROCESSING", "MANUAL_REVIEW_REQUIRED" -> Chaan.Amber
    "FAILED" -> Chaan.Red
    else -> Chaan.TextMuted
}
