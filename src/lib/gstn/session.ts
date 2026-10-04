import { GstnOtpSession } from "./types";

/**
 * Ephemeral Server-Side Session Cache for GSTN OTP Transactions
 * 
 * Securely associates the txnId returned by GSTN /rc/initiate with the
 * user's verified GSTIN, Legal Name, and Signatory Email.
 * Enforces a 10-minute session TTL and prevents GSTIN tampering between
 * the initiate and validate API calls.
 */

declare global {
  // eslint-disable-next-line no-var
  var __gstnSessions: Map<string, GstnOtpSession> | undefined;
}

const sessions: Map<string, GstnOtpSession> =
  globalThis.__gstnSessions || (globalThis.__gstnSessions = new Map());

// 10 minute OTP session TTL
const SESSION_TTL_MS = 10 * 60 * 1000;

export function storeGstnSession(session: {
  txnId: string;
  gstin: string;
  legalName: string;
  email: string;
}): GstnOtpSession {
  const now = Date.now();
  const entry: GstnOtpSession = {
    txnId: session.txnId,
    gstin: session.gstin.trim().toUpperCase(),
    legalName: session.legalName.trim(),
    email: session.email.trim().toLowerCase(),
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };

  sessions.set(session.txnId, entry);

  // Periodic cleanup of expired sessions
  cleanupExpiredSessions();

  return entry;
}

export function getGstnSession(txnId: string): GstnOtpSession | null {
  cleanupExpiredSessions();
  const session = sessions.get(txnId);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(txnId);
    return null;
  }

  return session;
}

export function removeGstnSession(txnId: string): void {
  sessions.delete(txnId);
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [key, val] of sessions.entries()) {
    if (now > val.expiresAt) {
      sessions.delete(key);
    }
  }
}
