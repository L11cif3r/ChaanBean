import { z } from "zod";
import {
  isIndividualPan, isValidCin, isValidGstin, isValidPan, isValidPinCode, isValidUdyam, normaliseIdentifier, normaliseMobile,
} from "@/lib/validators";

// Counterparty rules shared by the S06 form and the API (PRD S06 fields and validation). Messages are the PRD's.

export const COUNTERPARTY_TYPES = ["business_gstin", "business_pan", "individual"] as const;
export type CounterpartyType = (typeof COUNTERPARTY_TYPES)[number];

export const UPI_STATUSES = ["not_checked", "linked", "not_linked", "unavailable", "manual_confirmed"] as const;
export type UpiStatus = (typeof UPI_STATUSES)[number];

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

const optionalText = z.string().trim().optional().transform((v) => (v ? v : undefined));

const address = z.object({
  line: z.string().trim().min(5, "Enter a complete address with PIN code.").max(200),
  city: z.string().trim().min(2, "Enter a complete address with PIN code.").max(60),
  state: z.string().trim().min(2, "Enter a complete address with PIN code.").max(60),
  pincode: z.string().trim().refine(isValidPinCode, "Enter a complete address with PIN code."),
});

const mobile = z.string().refine((v) => normaliseMobile(v) !== null, "Enter a valid mobile number.").transform((v) => normaliseMobile(v)!);
const optionalMobile = z
  .string()
  .optional()
  .refine((v) => !v || normaliseMobile(v) !== null, "Enter a valid mobile number.")
  .transform((v) => (v ? normaliseMobile(v)! : undefined));

export const tagsSchema = z
  .array(z.string().trim().min(1).max(MAX_TAG_LENGTH, `Tags can be up to ${MAX_TAG_LENGTH} characters.`))
  .max(MAX_TAGS, `Add up to ${MAX_TAGS} tags.`)
  .default([])
  .transform((tags) => [...new Set(tags.map((t) => t.toLowerCase()))]);

/** Credit days 0–365 and interest after due date 0–36% a year with two decimals (stored as basis points). */
export const defaultsSchema = {
  creditDays: z.number().int("Enter days between 0 and 365.").min(0, "Enter days between 0 and 365.").max(365, "Enter days between 0 and 365.").nullable().optional(),
  interestRate: z
    .number()
    .min(0, "Enter a rate between 0% and 36%.")
    .max(36, "Enter a rate between 0% and 36%.")
    .refine((v) => Math.round(v * 100) === Number((v * 100).toFixed(6)), "Enter a rate between 0% and 36%.")
    .nullable()
    .optional(),
};

export const contactSchema = {
  contactName: z.string().trim().min(2, "Enter a contact name.").max(80, "Enter a contact name."),
  mobile,
  whatsapp: optionalMobile,
  email: optionalText.refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Enter a valid email address."),
};

export const createCounterpartySchema = z
  .object({
    type: z.enum(COUNTERPARTY_TYPES, "Select a counterparty type."),
    gstin: optionalText.transform((v) => (v ? normaliseIdentifier(v) : undefined)),
    pan: optionalText.transform((v) => (v ? normaliseIdentifier(v) : undefined)),
    legalName: z.string().trim().min(2, "Enter the legal name.").max(120, "Enter the legal name."),
    tradeName: optionalText,
    cin: optionalText.transform((v) => (v ? normaliseIdentifier(v) : undefined)),
    udyam: optionalText.transform((v) => (v ? normaliseIdentifier(v) : undefined)),
    iec: optionalText.transform((v) => (v ? normaliseIdentifier(v) : undefined)),
    ...contactSchema,
    address,
    ...defaultsSchema,
    tags: tagsSchema,
  })
  .superRefine((v, ctx) => {
    if (v.type === "business_gstin" && (!v.gstin || !isValidGstin(v.gstin))) {
      ctx.addIssue({ code: "custom", path: ["gstin"], message: "This GSTIN is not valid." });
    }
    if (v.type !== "business_gstin") {
      if (!v.pan || !isValidPan(v.pan)) ctx.addIssue({ code: "custom", path: ["pan"], message: "This PAN is not valid." });
      else if (v.type === "individual" && !isIndividualPan(v.pan)) {
        ctx.addIssue({ code: "custom", path: ["pan"], message: "This PAN is not valid. An individual's PAN has P as the 4th character." });
      }
    }
    if (v.cin && !isValidCin(v.cin)) ctx.addIssue({ code: "custom", path: ["cin"], message: "This CIN is not valid." });
    if (v.udyam && !isValidUdyam(v.udyam)) ctx.addIssue({ code: "custom", path: ["udyam"], message: "This Udyam number is not valid." });
    if (v.iec && !/^[A-Z0-9]{10}$/.test(v.iec)) ctx.addIssue({ code: "custom", path: ["iec"], message: "An IEC has 10 letters or digits." });
  });

export type CreateCounterpartyInput = z.input<typeof createCounterpartySchema>;

/** S07 inline edit: contact details, defaults, tags and notes. Identity fields are fixed once saved. */
export const updateCounterpartySchema = z.object({
  contactName: contactSchema.contactName.optional(),
  mobile: mobile.optional(),
  whatsapp: optionalMobile.nullable(),
  email: contactSchema.email.nullable(),
  address: address.optional(),
  ...defaultsSchema,
  tags: tagsSchema.optional(),
  notes: z.string().max(2000, "Notes can be up to 2,000 characters.").nullable().optional(),
});

/** Interest rate in % a year → basis points (12.5% → 1250). */
export const rateToBp = (rate: number | null | undefined) => (rate === null || rate === undefined ? null : Math.round(rate * 100));
export const bpToRate = (bp: number | null) => (bp === null ? null : bp / 100);
