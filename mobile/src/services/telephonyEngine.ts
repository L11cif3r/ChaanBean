export interface CallerDID {
  id: string;
  number: string;
  city: string;
  label: string;
  successRate: string;
}

export const CALLER_DIDS: CallerDID[] = [
  { id: "blr", number: "+91 80 4719 2000", city: "Bengaluru", label: "Enterprise Primary Trunk", successRate: "89% Pickup" },
  { id: "mum", number: "+91 22 6912 3400", city: "Mumbai", label: "Regional Commercial Trunk", successRate: "94% Pickup" },
  { id: "del", number: "+91 11 4084 5500", city: "Delhi NCR", label: "North Commercial Gateway", successRate: "86% Pickup" },
  { id: "tollfree", number: "1800 890 4422", city: "Pan-India", label: "Toll-Free Priority Recovery", successRate: "91% Pickup" },
];

export interface CallSimulationResult {
  buyerName: string;
  dialedNumber: string;
  callerDid: string;
  timestamp: string;
  durationSec: number;
  outcome: "ANSWERED" | "BUSY_CALL_SCREENED" | "NO_ANSWER";
  sipCode: number;
  q850Cause: number;
  audioRef: string;
  govAckNoticeId?: string;
  evidenceHash: string;
}

export function simulateRecoveryCall(
  buyerName: string,
  dialedNumber: string,
  callerDid: string,
  forceFail: boolean = false
): CallSimulationResult {
  const now = new Date().toISOString();
  const isProblematic = forceFail || buyerName.toLowerCase().includes("metro");

  const outcome = isProblematic ? "BUSY_CALL_SCREENED" : "ANSWERED";
  const sipCode = isProblematic ? 486 : 200;
  const q850Cause = isProblematic ? 17 : 16;
  const durationSec = isProblematic ? 12 : 48;

  const hashSeed = `${buyerName}-${dialedNumber}-${callerDid}-${now}`;
  let hashVal = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hashVal = (hashVal << 5) - hashVal + hashSeed.charCodeAt(i);
    hashVal |= 0;
  }
  const hex = Math.abs(hashVal).toString(16).padStart(12, "0").toUpperCase();
  const evidenceHash = `SHA256-TEL-${hex}-SEC65B`;

  return {
    buyerName,
    dialedNumber,
    callerDid,
    timestamp: now,
    durationSec,
    outcome,
    sipCode,
    q850Cause,
    audioRef: "pcm-16khz-overdue-l2-script.wav",
    govAckNoticeId: `ITD-DISPUTE-ACK-${hex.slice(0, 8)}`,
    evidenceHash,
  };
}

export function generateStatutoryNoticeGovAck(noticeType: string, buyerPanGstin: string): { ackId: string; portal: string; hash: string } {
  const stamp = Date.now().toString().slice(-6);
  const cleanId = buyerPanGstin.replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const ackId = noticeType.includes("GST")
    ? `GSTN-DRC-01A-2026-${cleanId}-${stamp}`
    : `ITD-DISPUTE-ACK-2026-${cleanId}-${stamp}`;

  const hash = `SHA256-NOTICE-${cleanId}-${stamp}-EVIDENCE-65B`;
  const portal = noticeType.includes("GST") ? "GST Portal (DRC-01A Pre-Notice Registry)" : "Income Tax Department (e-Filing §43B(h) Dispute Repository)";

  return { ackId, portal, hash };
}
