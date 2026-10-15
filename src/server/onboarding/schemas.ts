import { z } from "zod";
import { isValidPinCode } from "@/lib/validators";

// Input rules from PRD S02 (fields and validation), with the PRD's error messages.

const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "yopmail.com",
  "trashmail.com", "getnada.com", "sharklasers.com", "dispostable.com", "maildrop.cc", "throwawaymail.com",
]);

export const DESIGNATIONS = ["Proprietor", "Partner", "Director", "Manager", "Accountant", "Other"] as const;

export const workEmail = z
  .email("Enter a valid email address.")
  .max(120, "Enter a valid email address.")
  .refine((v) => !DISPOSABLE.has(v.split("@")[1]?.toLowerCase() ?? ""), "Enter a valid email address.");

export const fullName = z
  .string()
  .trim()
  .min(2, "Enter your full name.")
  .max(80, "Enter your full name.")
  .regex(/^[\p{L} .'-]+$/u, "Enter your full name.");

export const profileSchema = z.object({
  fullName,
  designation: z.string().trim().min(2, "Select your designation.").max(60, "Select your designation."),
  workEmail,
});

export const manualSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the legal name.").max(200, "Enter the legal name."),
  addressLine: z.string().trim().min(5, "Enter a complete address with PIN code.").max(300),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  pincode: z.string().trim().refine(isValidPinCode, "Enter a complete address with PIN code."),
});

export const completeSchema = z
  .object({
    method: z.enum(["gstin", "pan"]),
    lookupId: z.uuid(),
    businessName: z.string().trim().min(2, "Enter the legal name.").max(200).optional(),
    manual: manualSchema.optional(),
    documentRef: z.string().max(300).optional(),
    documentName: z.string().max(120).optional(),
    profile: profileSchema,
    authority: z.literal(true, "Please confirm you can act for this business."),
    terms: z.literal(true, "Please accept the Terms of Use and Privacy Notice."),
  });

export type CompleteBody = z.infer<typeof completeSchema>;
