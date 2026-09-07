package com.chaanbean.mobile.feature.recovery.data

import kotlinx.serialization.Serializable

/** Row from prisma `model MessageAudioAsset`, when one has been cached for this hash. */
@Serializable
data class MessageAudioAsset(
    val id: String = "",
    val messageHash: String = "",
    val templateId: String = "",
    val languageCode: String = "en",
    /** JSON string on the server, not an object. */
    val voiceConfig: String = "",
    val s3Url: String = "",
    val createdAt: String? = null,
)

/**
 * `GET /api/audio/{hash}?format=json`.
 *
 * Without the query parameter the same route streams `audio/wav` instead, which is why
 * playback uses the raw URL rather than this call.
 */
@Serializable
data class AudioAssetResponse(
    val hash: String = "",
    /** False when no MessageAudioAsset row exists — the stream still plays regardless. */
    val exists: Boolean = false,
    val asset: MessageAudioAsset? = null,
    val audioStreamUrl: String = "",
    val durationSec: Int = 0,
    val mimeType: String = "audio/wav",
)
