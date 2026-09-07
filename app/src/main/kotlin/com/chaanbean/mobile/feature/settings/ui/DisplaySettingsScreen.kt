package com.chaanbean.mobile.feature.settings.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.di.LocalAppContainer
import com.chaanbean.mobile.core.di.ThemeMode
import com.chaanbean.mobile.core.i18n.Language
import com.chaanbean.mobile.core.i18n.LocalStrings
import com.chaanbean.mobile.core.i18n.stringsFor
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.KeyValueRow
import com.chaanbean.mobile.core.ui.SectionHeader

/**
 * The Android counterpart of main's language selector and its bright/dark class
 * toggle. Both are device-local; neither is persisted server-side, because main
 * stores neither on the Company record.
 */
@Composable
fun DisplaySettingsScreen() {
    val container = LocalAppContainer.current
    val strings = LocalStrings.current
    val language by container.preferences.language.collectAsState()
    val themeMode by container.preferences.themeMode.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        SectionHeader(
            strings.language,
            "main ships translations for four languages. Its LanguageCode type also " +
                "lists te, kn and tu, but no strings exist for them, so they are not offered here.",
        )

        ChaanCard {
            Language.entries.forEach { option ->
                Row(
                    selected = option == language,
                    label = option.label,
                    secondary = stringsFor(option).tagline,
                    onSelect = { container.preferences.setLanguage(option) },
                )
            }
        }

        SectionHeader("Appearance", "main defaults to bright mode on launch.")

        ChaanCard {
            ThemeMode.entries.forEach { option ->
                Row(
                    selected = option == themeMode,
                    label = option.label,
                    secondary = null,
                    onSelect = { container.preferences.setThemeMode(option) },
                )
            }
        }

        ChaanCard {
            Text("Applied labels", style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(8.dp))
            KeyValueRow(strings.dashboard, strings.appName)
            KeyValueRow(strings.riskFlag, strings.greenFlag)
            KeyValueRow(strings.outstandingBalance, strings.daysOverdue)
            KeyValueRow(strings.statutoryInterest, strings.evidenceLog)
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun Row(
    selected: Boolean,
    label: String,
    secondary: String?,
    onSelect: () -> Unit,
) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .fillMaxWidth()
            .selectable(selected = selected, onClick = onSelect)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onSelect)
        Spacer(Modifier.height(0.dp))
        Column(Modifier.padding(start = 8.dp)) {
            Text(label, style = MaterialTheme.typography.bodyLarge)
            if (secondary != null) {
                Text(
                    secondary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
