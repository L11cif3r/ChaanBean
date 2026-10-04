import {
  GstnInitiatePayload,
  GstnInitiateApiResponse,
  GstnValidatePayload,
  GstnValidateApiResponse,
  GstVerificationResult,
} from "./types";
import { encryptGSTNPayload } from "./encryption";
import { saveCertificatePdf } from "./storage";

/**
 * Official Goods and Services Tax Network (GSTN) Client via API Setu
 * 
 * Implements GSTN Registration Certificate API v1.0.1
 * - Endpoint 1: /mof/gst/srv/govtapiext/v1.0/rc/initiate (Action: INITIATE)
 * - Endpoint 2: /mof/gst/srv/govtapiext/v1.0/rc/validate (Action: VALIDATE)
 */

function getEnvConfig() {
  const baseUrl = (process.env.GSTN_BASE_URL || "https://beta.api-setu.in").replace(/\/+$/, "");
  const clientId = process.env.GSTN_CLIENT_ID || "com.chaanbean";
  const apiKey = process.env.GSTN_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing GSTN_API_KEY server configuration. Please ensure GSTN_API_KEY is configured in server environment variables."
    );
  }

  return { baseUrl, clientId, apiKey };
}


/**
 * Step 1: Initiate OTP for GST Registration Certificate
 */
export async function initiateGstnOtp(params: {
  gstin: string;
  legalName: string;
  emailId_pas: string;
}): Promise<{
  success: boolean;
  statusCd: "0" | "1";
  message: string;
  txnId?: string;
  errorCode?: string;
}> {
  const { baseUrl, clientId, apiKey } = getEnvConfig();

  const cleanGstin = (params.gstin || "").trim().toUpperCase();
  const cleanLegalName = (params.legalName || "").trim();
  const cleanEmail = (params.emailId_pas || "").trim().toLowerCase();

  if (!cleanGstin || cleanGstin.length !== 15) {
    return {
      success: false,
      statusCd: "0",
      message: "Valid 15-character GSTIN is required.",
      errorCode: "INVALID_GSTIN",
    };
  }

  if (!cleanLegalName) {
    return {
      success: false,
      statusCd: "0",
      message: "Legal name as per GST records is required.",
      errorCode: "MISSING_LEGAL_NAME",
    };
  }

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return {
      success: false,
      statusCd: "0",
      message: "Valid email ID of Primary Authorized Signatory is required.",
      errorCode: "INVALID_EMAIL",
    };
  }

  const rawPayload: GstnInitiatePayload = {
    gstin: cleanGstin,
    legalName: cleanLegalName,
    emailId_pas: cleanEmail,
  };

  const encrypted = encryptGSTNPayload(rawPayload as unknown as Record<string, unknown>);
  const endpoint = `${baseUrl}/mof/gst/srv/govtapiext/v1.0/rc/initiate`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": encrypted.contentType,
        action: "INITIATE",
        "X-APISETU-CLIENTID": clientId,
        "X-APISETU-APIKEY": apiKey,
      },
      body: typeof encrypted.body === "string" ? encrypted.body : JSON.stringify(encrypted.body),
      signal: AbortSignal.timeout(18000),
    });

    const json: GstnInitiateApiResponse = await res.json();

    if (json.status_cd === "1" && json.data?.txnId) {
      return {
        success: true,
        statusCd: "1",
        message: json.data.message || "OTP has been sent to the registered email and mobile of the Primary Authorised Signatory.",
        txnId: json.data.txnId,
      };
    }

    // Handle failure response from GSTN
    const errMessage =
      json.error?.message ||
      (json.status_cd === "0"
        ? "Details entered do not match with the GST records. Please verify the details."
        : "Failed to initiate GST OTP.");
    const errorCode = json.error?.errorCode || json.error?.error_cd || (res.status === 400 ? "INTR_002" : `HTTP_${res.status}`);

    return {
      success: false,
      statusCd: "0",
      message: errMessage,
      errorCode,
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return {
      success: false,
      statusCd: "0",
      message: isTimeout
        ? "API Setu / GSTN gateway request timed out. Please try again."
        : `Network error connecting to GSTN gateway: ${err instanceof Error ? err.message : String(err)}`,
      errorCode: isTimeout ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR",
    };
  }
}

/**
 * Step 2: Validate OTP and Fetch GST Registration Certificate
 */
export async function validateGstnOtp(params: {
  gstin: string;
  otp: string;
  txnId: string;
}): Promise<GstVerificationResult> {
  const { baseUrl, clientId, apiKey } = getEnvConfig();

  const cleanGstin = (params.gstin || "").trim().toUpperCase();
  const cleanOtp = (params.otp || "").replace(/\D/g, "").slice(0, 6);
  const cleanTxnId = (params.txnId || "").trim();

  if (!cleanGstin || cleanGstin.length !== 15) {
    return {
      success: false,
      statusCd: "0",
      txnId: cleanTxnId,
      gstin: cleanGstin,
      legalName: "",
      message: "Valid 15-character GSTIN is required.",
      errorCode: "INVALID_GSTIN",
    };
  }

  if (!cleanOtp || cleanOtp.length !== 6) {
    return {
      success: false,
      statusCd: "0",
      txnId: cleanTxnId,
      gstin: cleanGstin,
      legalName: "",
      message: "6-digit OTP received by the Primary Authorized Signatory is required.",
      errorCode: "INVALID_OTP_LENGTH",
    };
  }

  if (!cleanTxnId) {
    return {
      success: false,
      statusCd: "0",
      txnId: "",
      gstin: cleanGstin,
      legalName: "",
      message: "Transaction ID from OTP initiation stage is missing or expired.",
      errorCode: "MISSING_TXN_ID",
    };
  }

  const rawPayload: GstnValidatePayload = {
    gstin: cleanGstin,
    otp: cleanOtp,
    txnId: cleanTxnId,
  };

  const encrypted = encryptGSTNPayload(rawPayload as unknown as Record<string, unknown>);
  const endpoint = `${baseUrl}/mof/gst/srv/govtapiext/v1.0/rc/validate`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": encrypted.contentType,
        action: "VALIDATE",
        "X-APISETU-CLIENTID": clientId,
        "X-APISETU-APIKEY": apiKey,
      },
      body: typeof encrypted.body === "string" ? encrypted.body : JSON.stringify(encrypted.body),
      signal: AbortSignal.timeout(20000),
    });

    const json: GstnValidateApiResponse = await res.json();

    if (json.status_cd === "1" && json.data) {
      const { data: taxpayer, rcPdf, message, txnId } = json.data;

      // Decode and persist the Base64 PDF certificate
      let certResult;
      try {
        certResult = saveCertificatePdf({
          gstin: taxpayer.gstin || cleanGstin,
          txnId: txnId || cleanTxnId,
          rcPdfBase64: rcPdf,
        });
      } catch (decodeErr) {
        return {
          success: false,
          statusCd: "1",
          txnId: txnId || cleanTxnId,
          gstin: taxpayer.gstin || cleanGstin,
          legalName: taxpayer.legalName || "",
          tradeName: taxpayer.tradeName || "",
          constitutionOfBusiness: taxpayer.constitutionOfBusiness || "",
          message: `GST verified, but PDF decoding failed: ${decodeErr instanceof Error ? decodeErr.message : String(decodeErr)}`,
          errorCode: "PDF_DECODE_FAILED",
        };
      }

      return {
        success: true,
        statusCd: "1",
        txnId: txnId || cleanTxnId,
        gstin: taxpayer.gstin || cleanGstin,
        legalName: taxpayer.legalName,
        tradeName: taxpayer.tradeName,
        constitutionOfBusiness: taxpayer.constitutionOfBusiness,
        certificateId: certResult.certificateId,
        certificateViewUrl: `/api/gst/certificate/${certResult.certificateId}`,
        certificateDownloadUrl: `/api/gst/certificate/${certResult.certificateId}?download=1`,
        message: message || "GST Registration Certificate fetched successfully",
        verifiedAt: new Date().toISOString(),
      };
    }

    // Handle failure response from GSTN
    const errMessage =
      json.error?.message ||
      (json.status_cd === "0" ? "OTP is incorrect or validation failed." : "Failed to validate OTP.");
    const errorCode = json.error?.errorCode || json.error?.error_cd || (res.status === 400 ? "INTR_006" : `HTTP_${res.status}`);

    return {
      success: false,
      statusCd: "0",
      txnId: cleanTxnId,
      gstin: cleanGstin,
      legalName: "",
      message: errMessage,
      errorCode,
    };
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError";
    return {
      success: false,
      statusCd: "0",
      txnId: cleanTxnId,
      gstin: cleanGstin,
      legalName: "",
      message: isTimeout
        ? "API Setu / GSTN validation request timed out. Please try again."
        : `Network error verifying OTP with GSTN gateway: ${err instanceof Error ? err.message : String(err)}`,
      errorCode: isTimeout ? "GATEWAY_TIMEOUT" : "NETWORK_ERROR",
    };
  }
}
