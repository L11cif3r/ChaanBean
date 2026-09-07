package com.chaanbean.mobile.feature.recovery.ui

import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.chaanbean.mobile.core.ui.Chaan

/**
 * Port of main's CallAudioPlayer. Streams GET /api/audio/{hash}.
 *
 * That endpoint does not return a recording of anything: it synthesises a WAV of a
 * dual-tone chime followed by formant tones on every request, ignoring the hash.
 * The label says so, because a play button next to a debtor's name otherwise reads
 * as "here is the call we placed".
 */
@Composable
fun CallAudioPlayer(
    streamUrl: String?,
    modifier: Modifier = Modifier,
) {
    var player by remember { mutableStateOf<MediaPlayer?>(null) }
    var playing by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }

    DisposableEffect(streamUrl) {
        onDispose {
            player?.release()
            player = null
        }
    }

    if (streamUrl == null) {
        Text(
            "No audio in this build",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = modifier,
        )
        return
    }

    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        TextButton(
            onClick = {
                if (playing) {
                    player?.pause()
                    playing = false
                    return@TextButton
                }
                failed = false
                if (player == null) {
                    player = MediaPlayer().apply {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        )
                        setOnCompletionListener { playing = false }
                        setOnErrorListener { _, _, _ ->
                            failed = true
                            playing = false
                            true
                        }
                        runCatching {
                            setDataSource(streamUrl)
                            prepareAsync()
                            setOnPreparedListener {
                                it.start()
                                playing = true
                            }
                        }.onFailure { failed = true }
                    }
                } else {
                    player?.start()
                    playing = true
                }
            },
        ) { Text(if (playing) "Pause announcement" else "Play announcement") }

        Spacer(Modifier.width(8.dp))
        Text(
            when {
                failed -> "Stream unavailable"
                else -> "Synthesised tone, not a recording"
            },
            style = MaterialTheme.typography.labelSmall,
            color = if (failed) Chaan.Red else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
