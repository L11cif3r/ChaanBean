// Marketing copy for the public site. Condensed from the original ChaanBean
// pages: same meaning, fewer words, written for busy MSME owners.
import {
  Activity,
  BadgeCheck,
  Bot,
  Briefcase,
  Coins,
  Cpu,
  Home,
  Network,
  Scale,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const HERO = {
  badge: "One AI platform to understand, protect and grow your business",
  titleLead: "Know where your business stands today.",
  titleAccent: "Grow with AI tomorrow.",
  lead: "Credit checks, payment protection, collections and capital for MSMEs, in one connected platform.",
  primaryCta: "Get Started",
  secondaryCta: "Customer Log In",
  points: ["Secure your credit", "Automate collections", "Unlock capital"],
};

export const VERDICT = {
  eyebrow: "AI Credit Verdict",
  question: "Is this company worth giving credit for?",
  good: {
    grade: "Creditworthy · Grade A2",
    verdict: "Approved for credit up to ₹25 lakhs",
    limit: "₹25,00,000",
    matrix: [
      { label: "Statutory health", value: "98 / 100" },
      { label: "Turnover", value: "₹18.42 Cr" },
      { label: "Default risk", value: "4.2%" },
      { label: "Court cases", value: "None" },
    ],
  },
  risky: {
    grade: "High risk · Grade C3",
    verdict: "Advance or cash on delivery only",
    limit: "₹0",
    matrix: [
      { label: "Statutory health", value: "28 / 100" },
      { label: "Turnover", value: "₹1.10 Cr" },
      { label: "Default risk", value: "89.4%" },
      { label: "Court cases", value: "2 active" },
    ],
  },
  limitLabel: "Safe credit limit",
};

export type PillarTone = "orange" | "green" | "gold" | "ink";

export interface Pillar {
  id: string;
  label: string;
  title: string;
  tileLine: string;
  headline: string;
  description: string;
  points: string[];
  icon: LucideIcon;
  tone: PillarTone;
}

// The four primary products, in credit lifecycle order.
export const PILLARS: Pillar[] = [
  {
    id: "credit-check",
    label: "Credit Check",
    title: "AI Credit Due Diligence",
    tileLine: "Know the business before you give credit.",
    headline: "Know the buyer before you give credit.",
    description: "One clear credit profile from GST, MCA, financial and court records, not just a single score.",
    points: [
      "Who they are: identity, registration, ownership",
      "Can they pay: turnover and cash-flow strength",
      "Do they pay: payment history and behaviour",
      "A safe credit limit, with the reasons",
    ],
    icon: BadgeCheck,
    tone: "orange",
  },
  {
    id: "credit-protection",
    label: "Credit Protection",
    title: "Continuous Credit Protection",
    tileLine: "Keep watching buyers after credit is given.",
    headline: "Risk doesn't end when you approve credit.",
    description: "ChaanBean watches every buyer between credit given and cash received, and warns you early.",
    points: [
      "Track exposure and payment behaviour",
      "Spot emerging risk before it hurts",
      "See which accounts need attention today",
    ],
    icon: Activity,
    tone: "green",
  },
  {
    id: "payment-automation",
    label: "Payment Automation",
    title: "Smart Collections Automation",
    tileLine: "Stop chasing payments. Automate them.",
    headline: "Stop chasing payments. Let them come in.",
    description: "Every overdue invoice gets an automatic follow-up: reminders, voice calls, WhatsApp and payment links.",
    points: [
      "AI voice and WhatsApp reminders in 9 Indian languages",
      "UPI payment links and promise-to-pay tracking",
      "Your team steps in only when needed",
    ],
    icon: Zap,
    tone: "gold",
  },
  {
    id: "legal",
    label: "Legal",
    title: "Legal Recovery",
    tileLine: "When reminders fail, act under MSME law.",
    headline: "When reminders aren't enough, take legal action.",
    description: "Move unpaid cases into a legal workflow, with the full payment history ready as evidence.",
    points: [
      "Advocate-vetted notices under §138 and §43B(h)",
      "MSME Samadhaan §18 arbitration filing",
      "3x compound interest worked out for you",
    ],
    icon: Scale,
    tone: "ink",
  },
];

export const PLATFORM_HEAD = {
  eyebrow: "Our Platform",
  title: "One connected platform for",
  titleAccent: "your entire credit cycle.",
  lead: "Check buyers, watch risk, collect payments and recover dues, all in one place.",
};

export const PROTECTION_WATCH = [
  { name: "Customer exposure", status: "Within limit" },
  { name: "Payment behaviour", status: "On time" },
  { name: "GST and MCA signals", status: "No change" },
  { name: "Early-warning alerts", status: "Active" },
];

export const COLLECTION_STEPS = ["Reminder", "Voice call", "WhatsApp", "Payment link", "Follow-up", "Escalation"];

export const LEGAL_NOTICE =
  "Statutory 45-day MSME demand notice dispatched. Compound interest at 3x the RBI bank rate is now accruing.";

export const BUILT_FOR = {
  eyebrow: "Who it's for",
  title: "Made for Indian businesses that sell on credit",
  text: "If you raise invoices and wait weeks to get paid, ChaanBean helps you check, track and collect with confidence.",
  prefix: "Built for",
  items: ["Manufacturers & Mills", "Wholesalers & Distributors", "Traders & Exporters", "MSME Vendors & Suppliers"],
};

export interface SecondaryProduct {
  id: string;
  title: string;
  line: string;
  icon: LucideIcon;
}

// Supporting products, shown smaller and lower on the page.
export const SECONDARY: SecondaryProduct[] = [
  { id: "ai-readiness", title: "AI Readiness", line: "Find where AI can cut costs and save time in your business.", icon: Sparkles },
  { id: "ai-transformation", title: "AI Transformation", line: "Custom AI for sales, finance, HR and customer support.", icon: Bot },
  { id: "capital-access", title: "Capital Access", line: "Business loans and invoice finance, matched to your data.", icon: Coins },
  { id: "connect", title: "ChaanBean Connect", line: "Works with Tally, ERP, CRM and your bank. No new software island.", icon: Network },
  { id: "intelligence", title: "ChaanBean Intelligence", line: "Learns from your data to flag risk and suggest next steps.", icon: Cpu },
];

export const SECONDARY_HEAD = {
  eyebrow: "More from ChaanBean",
  title: "Tools to grow beyond credit",
  lead: "Add these when your business is ready.",
};

export const LOANS = {
  title: "Working capital and business loans",
  lead: "Don't let late payments stop production. Get funds fast, with little paperwork.",
  cta: "Check eligibility",
  items: [
    { title: "Working Capital Loan", amount: "Up to ₹50 Lakhs", rate: "From 12.60% p.a.", icon: Briefcase },
    { title: "Invoice Financing", amount: "Up to 90% of invoice", rate: "Get paid before your buyer pays", icon: TrendingUp },
    { title: "Gold Loan", amount: "Up to ₹1.5 Crore", rate: "From 9.50% p.a.", icon: Coins },
    { title: "Property Loan", amount: "Up to ₹5 Crore", rate: "From 8.35% p.a.", icon: Home },
  ],
};

export const PRICING_HEAD = {
  eyebrow: "Pricing",
  title: "Transparent pricing for every business size",
  lead: "Save with 3-month plans, or pay as you go from ₹5,000. The full value goes to your wallet.",
};

export const PLAN_CARDS = [
  {
    name: "Retail Plan (Growth)",
    blurb: "For small and mid-sized businesses.",
    price: "₹9,899",
    period: "/ 3 months",
    value: "₹49,200 value credited to wallet",
    features: ["10 director & 10 Udyam reports", "40 GST turnover checks", "3,500 recovery voice calls", "5 legal notices"],
  },
  {
    name: "Enterprise Plan",
    blurb: "For high-volume businesses and teams.",
    price: "₹17,599",
    period: "/ 3 months",
    value: "₹85,950 value credited to wallet",
    features: ["20 director & 20 Udyam reports", "65 GST turnover checks", "6,000 recovery voice calls", "10 legal notices", "5 user seats"],
    featured: true,
    badge: "Best value",
  },
  {
    name: "Pay & Use",
    blurb: "Recharge and pay only for what you use.",
    price: "₹5,000",
    period: "minimum recharge",
    value: "100% credited, no lock-in",
    features: ["Use any check, notice or call", "Call packs from ₹1.05 per call", "Unused balance carries forward"],
  },
];

export const START = {
  title: "Ready to protect your working capital?",
  newTitle: "New to ChaanBean?",
  newText: "Pick a plan and start checking buyers today.",
  newTag: "Explore Plans",
  existingTitle: "Already a customer?",
  existingText: "Log in to your dashboard and recovery cases.",
  existingTag: "Log In",
};

export const CONTACT = {
  eyebrow: "Contact",
  title: "Talk to our team",
  lead: "Questions about checking a buyer or recovering dues? We're here to help.",
  phoneDisplay: "+91 79000 48382",
  phoneHref: "tel:+917900048382",
  whatsappNumber: "917900048382",
  email: "hello@chaanbean.com",
  hours: "Mon to Sat, 9:30 AM to 6:30 PM",
  offices: [
    { city: "Kerala", address: "Panavila Veedu, Thrikovilvattom, Mukhathala, Kollam, Kerala 691577" },
    { city: "Mumbai", address: "Venkatesh Apts CHSL, Rawal Nagar, Station Road, Mira" },
  ],
  formTitle: "Send us a message",
  formLead: "We reply within 2 business hours.",
  successTitle: "Message received!",
  successText: "Our team will reach out to you shortly.",
  submit: "Send Message",
};

export const ENQUIRY = {
  lead: "Share your details and our team will contact you within 2 business hours.",
  successTitle: "Enquiry received!",
  successText: "Our team will contact you shortly.",
  submit: "Send Enquiry",
};

export const FOOTER = {
  tagline: "Credit & Recovery OS",
  about: "Credit checks, payment recovery and legal support for Indian MSMEs.",
  compliance: "MSMED Act 2006 · Section 43B(h) · DPDP Act 2023",
  copyright: "© 2026 ChaanBean Technologies Pvt Ltd.",
};

export function whatsappLink(message: string) {
  return `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Replaces em and en dashes in copy that comes from shared data files. */
export function noDash(text: string) {
  return text.replace(/\s*[\u2013\u2014]\s*/g, " / ");
}

export const ALL_PRODUCTS = [...PILLARS.map((p) => p.title), ...SECONDARY.map((p) => p.title)];
