package com.chaanbean.mobile.feature.recovery.ui

import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan
import com.chaanbean.mobile.core.ui.ChaanCard
import com.chaanbean.mobile.core.ui.KeyValueRow
import java.util.Locale

/**
 * Port of main's OneWayCallModal. main reads the script aloud with the Web Speech
 * API; the Android equivalent is TextToSpeech, with the same language mapping and
 * the same deliberate 0.95 speech rate.
 *
 * Neither implementation places a call. main's own modal only speaks through the
 * operator's speakers while a setTimeout chain fakes SIP state transitions, so
 * this sheet presents it as a script preview rather than a call.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VoiceAnnouncementSheet(
    debtorName: String,
    languageCode: String,
    script: String,
    audioStreamUrl: String?,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    var tts by remember { mutableStateOf<TextToSpeech?>(null) }
    var ready by remember { mutableStateOf(false) }
    var speaking by remember { mutableStateOf(false) }
    var unsupported by remember { mutableStateOf(false) }

    DisposableEffect(languageCode) {
        val engine = TextToSpeech(context) { status ->
            ready = status == TextToSpeech.SUCCESS
        }
        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) { speaking = true }
            override fun onDone(utteranceId: String?) { speaking = false }
            @Deprecated("Required by the abstract class")
            override fun onError(utteranceId: String?) { speaking = false }
        })
        tts = engine
        onDispose {
            engine.stop()
            engine.shutdown()
            tts = null
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            Modifier.padding(horizontal = 20.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("L2 voice announcement", style = MaterialTheme.typography.titleLarge)
            Text(
                "Preview of the statutory script. Nothing is dialled from this device.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            ChaanCard {
                KeyValueRow("Debtor", debtorName)
                KeyValueRow("Language", localeFor(languageCode).displayLanguage)
                KeyValueRow("Delivery", "One-way announcement")
            }

            ChaanCard {
                Text("Script", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(6.dp))
                Text(script, style = MaterialTheme.typography.bodyMedium)
            }

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Button(
                    onClick = {
                        val engine = tts ?: return@Button
                        if (speaking) {
                            engine.stop()
                            speaking = false
                            return@Button
                        }
                        val result = engine.setLanguage(localeFor(languageCode))
                        unsupported = result == TextToSpeech.LANG_MISSING_DATA ||
                            result == TextToSpeech.LANG_NOT_SUPPORTED
                        // main uses 0.95 for a deliberate telephony pace.
                        engine.setSpeechRate(0.95f)
                        engine.setPitch(1.0f)
                        engine.speak(script, TextToSpeech.QUEUE_FLUSH, null, "announcement")
                    },
                    enabled = ready,
                ) { Text(if (speaking) "Stop" else "Read script aloud") }

                OutlinedButton(onClick = onDismiss) { Text("Close") }
            }

            if (unsupported) {
                ChaanCard {
                    Text("Voice unavailable", style = MaterialTheme.typography.titleMedium, color = Chaan.Amber)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "This device has no installed text-to-speech voice for " +
                            localeFor(languageCode).displayLanguage +
                            ". The script is shown above regardless.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            CallAudioPlayer(streamUrl = audioStreamUrl)
        }
    }
}

/** Mirrors main's langMap, including its Tulu-to-Kannada fallback. */
private fun localeFor(code: String): Locale = when (code.lowercase()) {
    "hi" -> Locale.forLanguageTag("hi-IN")
    "ta" -> Locale.forLanguageTag("ta-IN")
    "ml" -> Locale.forLanguageTag("ml-IN")
    "te" -> Locale.forLanguageTag("te-IN")
    "kn", "tu" -> Locale.forLanguageTag("kn-IN")
    else -> Locale.forLanguageTag("en-IN")
}
