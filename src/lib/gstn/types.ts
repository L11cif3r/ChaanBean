/**
 * GSTN Registration Certificate (v1.0.1) Type Definitions
 * Source: Goods and Services Tax Network (GSTN) via API Setu
 * OpenAPI Specification: https://cf-media.api-setu.in/specfiles/apisetu_taxpayers_gstn_reg_1_0_1.yaml
 */

export interface GstnInitiatePayload {
  gstin: string;
  legalName: string;
  emailId_pas: string;
}

export interface GstnInitiateSuccessData {
  message: string;
  txnId: string;
}

export interface GstnErrorResponse {
  message: string;
  errorCode?: string;
  error_cd?: string;
}

export interface GstnInitiateApiResponse {
  status_cd: "0" | "1";
  data?: GstnInitiateSuccessData;
  error?: GstnErrorResponse;
}

export interface GstnValidatePayload {
  gstin: string;
  otp: string;
  txnId: string;
}

export interface GstTaxpayerData {
  gstin: string;
  legalName: string;
  tradeName: string;
  constitutionOfBusiness: string;
}

export interface GstnValidateSuccessData {
  message: string;
  txnId: string;
  data: GstTaxpayerData;
  rcPdf: string; // Base64 encoded PDF
}

export interface GstnValidateApiResponse {
  status_cd: "0" | "1";
  data?: GstnValidateSuccessData;
  error?: GstnErrorResponse;
}

export interface GstnOtpSession {
  txnId: string;
  gstin: string;
  legalName: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}

export interface GstVerificationResult {
  success: boolean;
  statusCd: "0" | "1";
  txnId: string;
  gstin: string;
  legalName: string;
  tradeName?: string;
  constitutionOfBusiness?: string;
  certificateId?: string;
  certificateViewUrl?: string;
  certificateDownloadUrl?: string;
  reportId?: string;
  message: string;
  errorCode?: string;
  verifiedAt?: string;
}
