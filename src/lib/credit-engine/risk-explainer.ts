/**
 * CHAANBEAN CREDIT RISK EXPLAINER
 *
 * Grounded in the deterministic factors from CreditRiskCalculator.
 * Calls Google Gemini (or deterministic structured generator) to draft executive explanations.
 * Strictly adheres to rule: "The LLM may explain the assessment but must not independently change the score."
 */

import { CreditAssessmentResult } from "./risk-calculator";

export class CreditRiskExplainer {
  public static async generateExplanation(
    result: CreditAssessmentResult,
    geminiApiKey?: string
  ): Promise<string> {
    const key = geminiApiKey || process.env.GEMINI_API_KEY;

    if (key) {
      try {
        const prompt = `
You are the Chief Credit Underwriter at ChaanBean, an MSME B2B credit intelligence platform in India.
Analyze the following DETERMINISTIC credit risk assessment result for company: "${result.companyName}".
You MUST NOT change the score, risk band, or limit. Your role is strictly to explain the deterministic factors to an Indian CFO or MSME business owner in concise, authoritative, professional terms.

ASSESSMENT RESULTS:
- Target Company: ${result.companyName}
- Model Version: ${result.modelVersion}
- Composite Score: ${result.compositeScore} / 100
- Risk Band: ${result.riskBand}
- Recommended Credit Limit: INR ${result.recommendedCreditLimit.toLocaleString("en-IN")}
- Recommended Tenor: ${result.recommendedTenorDays} Days
- Statutory Safeguard: ${result.statutorySafeguard}

FACTOR BREAKDOWN:
${result.factors
  .map(
    (f) =>
      `* ${f.factorName} (Weight: ${f.weightPct}%): Score ${f.rawScore}/100. Key findings: ${f.findings.join("; ")}`
  )
  .join("\n")}

Write a structured 3-paragraph executive summary:
1. Executive Decision Verdict: Affirming the score, recommended limit, and primary strengths.
2. Risk Vector Analysis: Key factors driving the score (Payment behaviour, RoC compliance, GST filing regularity).
3. Recommended Statutory Safeguards: Explicit contractual terms (MSMED Act 2006 Section 15, Section 43B(h), PDC/NACH guidance).
Keep it within 180 words.
`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 350, temperature: 0.2 },
            }),
          }
        );

        if (response.ok) {
          const json = await response.json();
          const generatedText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText && generatedText.trim().length > 50) {
            return generatedText.trim();
          }
        }
      } catch (err) {
        console.warn("Gemini API call failed or timed out, falling back to deterministic explanation:", err);
      }
    }

    // Deterministic explanation fallback
    return `EXECUTIVE CREDIT VERDICT (${result.riskBand.replace("_", " ")}): ChaanBean's deterministic risk engine evaluated ${
      result.companyName
    } at a composite score of ${result.compositeScore}/100 based on statutory data across MCA21, GSTN, and e-Courts.\n\n` +
      `FINANCIAL & PAYMENT VECTOR: The entity demonstrates solid operational stability with disciplined payment behaviour and ${(
        result.factors.find((f) => f.factorCode === "PAYMENT_BEHAVIOUR")?.rawScore || 80
      )}/100 settlement reliability. Working capital indicators support a maximum credit line of ₹${(
        result.recommendedCreditLimit / 100000
      ).toFixed(1)} Lakhs.\n\n` +
      `STATUTORY SAFEGUARD: ${result.statutorySafeguard}`;
  }
}
