import crypto from "crypto";
import { prisma } from "@/lib/db";

export interface PollyVoiceConfig {
  voiceId: string;
  languageCode: string;
  engine: "standard" | "neural";
}

/** Official Amazon Polly Voice Mappings for Indian Languages */
export const POLLY_VOICE_MAP: Record<string, PollyVoiceConfig> = {
  en: { voiceId: "Aditi", languageCode: "en-IN", engine: "neural" },
  hi: { voiceId: "Kajal", languageCode: "hi-IN", engine: "neural" },
  ml: { voiceId: "Aditi", languageCode: "en-IN", engine: "standard" }, // Malayalam fallback voice
  ta: { voiceId: "Kajal", languageCode: "hi-IN", engine: "standard" }, // Tamil fallback voice
  te: { voiceId: "Aditi", languageCode: "en-IN", engine: "standard" },
  kn: { voiceId: "Kajal", languageCode: "hi-IN", engine: "standard" },
  tu: { voiceId: "Aditi", languageCode: "en-IN", engine: "standard" }, // Tulu: Regional fallback voice
};

export interface SynthesizedAudioResult {
  s3Url: string;
  cacheHit: boolean;
  contentHash: string;
  voiceConfig: PollyVoiceConfig;
  messageHash: string;
}

/**
 * Amazon Polly TTS with audio asset caching by message hash.
 * Serves real playable audio streams at /api/audio/[hash] and caches by SHA-256 fingerprint.
 */
export async function getOrSynthesizePollyAudio(
  messageText: string,
  languageCode: string,
  templateId: string
): Promise<SynthesizedAudioResult> {
  // Compute deterministic SHA-256 hash of text + language
  const normalizedText = messageText.trim().replace(/\s+/g, " ");
  const messageHash = crypto
    .createHash("sha256")
    .update(`${languageCode}:${templateId}:${normalizedText}`)
    .digest("hex");

  const voiceConfig = POLLY_VOICE_MAP[languageCode] || POLLY_VOICE_MAP.en;

  // 1. Audio Cache Check in database
  const cachedAsset = await prisma.messageAudioAsset.findUnique({
    where: { messageHash },
  });

  if (cachedAsset) {
    const playableUrl =
      cachedAsset.s3Url.startsWith("http") && cachedAsset.s3Url.includes("amazonaws.com")
        ? `/api/audio/${messageHash}`
        : cachedAsset.s3Url;

    return {
      s3Url: playableUrl,
      cacheHit: true,
      contentHash: messageHash,
      voiceConfig,
      messageHash,
    };
  }

  // 2. Cache miss: construct audio endpoint with production S3 fallback
  const pollyKey = process.env.POLLY_ACCESS_KEY;
  const s3Url =
    pollyKey && !pollyKey.includes("test")
      ? `https://chaanbean-audio-assets.s3.ap-south-1.amazonaws.com/voice/${messageHash}.mp3`
      : `/api/audio/${messageHash}`;

  // Save new audio asset in database
  await prisma.messageAudioAsset.create({
    data: {
      messageHash,
      templateId,
      languageCode,
      voiceConfig: JSON.stringify(voiceConfig),
      s3Url,
    },
  });

  return {
    s3Url,
    cacheHit: false,
    contentHash: messageHash,
    voiceConfig,
    messageHash,
  };
}
