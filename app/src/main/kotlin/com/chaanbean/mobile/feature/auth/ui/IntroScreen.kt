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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.chaanbean.mobile.core.ui.Chaan
import kotlinx.coroutines.delay

private const val INTRO_STEPS = 30
private const val INTRO_STEP_MILLIS = 100L

/**
 * The mobile equivalent of /intro: a 3-second brand hold that advances to the login
 * screen on its own, with skip and replay. The web version assembles the logo from five
 * PNG layers; there are no brand drawables in this module, so the wordmark stands in.
 */
@Composable
fun IntroScreen(onContinue: () -> Unit) {
    var replayKey by remember { mutableStateOf(0) }
    var progress by remember { mutableStateOf(0f) }

    LaunchedEffect(replayKey) {
        progress = 0f
        repeat(INTRO_STEPS) { step ->
            delay(INTRO_STEP_MILLIS)
            progress = (step + 1) / INTRO_STEPS.toFloat()
        }
        onContinue()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Row(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 12.dp, end = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            TextButton(onClick = { replayKey += 1 }) { Text("Replay") }
            TextButton(onClick = onContinue) { Text("Skip") }
        }

        Column(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(Chaan.Brand),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "CB",
                    color = Chaan.TextPrimary,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 30.sp,
                )
            }

            Spacer(Modifier.height(22.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Chaan",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                )
                Text(
                    "Bean",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.ExtraBold,
                    color = Chaan.Brand,
                )
            }

            Spacer(Modifier.height(6.dp))
            Text(
                "B2B Credit Recovery & Verification Engine",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(28.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .width(220.dp)
                    .height(6.dp)
                    .clip(RoundedCornerShape(999.dp)),
                color = Chaan.Brand,
            )
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.width(220.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    "Loading portal",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    "${(progress * 100).toInt()}%",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Text(
            "Statutory MSMED Act 2006 & TRAI Compliant · Section 65B Certified",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(bottom = 20.dp, start = 24.dp, end = 24.dp),
        )
    }
}
