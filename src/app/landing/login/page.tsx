"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  KeyRound,
  Star,
  Eye,
  EyeOff,
  MessageCircle,
  BadgeIndianRupee,
} from "lucide-react";
import { Brand, SiteShell, ThemeSwitch } from "@/components/marketing/SiteShell";
import { PILLARS, whatsappLink } from "@/components/marketing/content";
import { FlipText } from "@/components/obsidian/FlipText";
import s from "@/components/marketing/site.module.css";
import p from "@/components/marketing/pages.module.css";

const STATS = [
  ["₹1,500+ Cr", "Recovered"],
  ["2,000+", "Cases settled"],
  ["100K+", "Companies verified"],
];

/** Turns server failures (for example a missing database) into a message a customer can act on. */
function friendlyError(message: string) {
  if (/prisma|DATABASE_URL|invocation|ECONNREFUSED|fetch failed/i.test(message)) {
    const devNote =
      process.env.NODE_ENV !== "production" && /DATABASE_URL/.test(message) ? " (Developer note: DATABASE_URL is not set.)" : "";
    return `We couldn't reach the account server. Please try again in a few minutes or call +91 79000 48382.${devNote}`;
  }
  return message;
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function LoginPage() {
  const router = useRouter();

  // Auth mode: "login" | "register"
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login method: "otp" | "password"
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");

  // OTP Login state
  const [otpMobile, setOtpMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpTxnId, setOtpTxnId] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  // Password Login state
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register state
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [plan, setPlan] = useState("growth");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pre-fill email from query parameters (if directed from "Already a customer?")
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setClientEmail(emailParam);
      setLoginMethod("password");
    }
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  // Request OTP handler via API endpoint
  const handleSendOtp = async () => {
    resetMessages();
    const cleanedMobile = otpMobile.replace(/\D/g, "").slice(-10);
    if (cleanedMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: cleanedMobile,
          purpose: mode,
          companyName: companyName || undefined,
          fullName: fullName || undefined,
          email: clientEmail || undefined,
        }),
      });

      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }

      setOtpTxnId(data.txnId || "");
      setOtpSent(true);
      setOtpTimer(60);
      setSuccessMsg(`OTP sent to +91 ${cleanedMobile}. It is valid for 5 minutes.`);
      if (data.uatOtp) {
        setOtpCode(data.uatOtp);
        setSuccessMsg(`OTP sent to +91 ${cleanedMobile}. Test code filled in: ${data.uatOtp}`);
      }
    } catch (err: any) {
      setError(friendlyError(err.message || "Failed to send OTP. Please try again."));
    } finally {
      setSendingOtp(false);
    }
  };

  // Quick fill sample credentials
  const fillSampleOtp = () => {
    setOtpMobile("9876543210");
    setOtpSent(false);
    setOtpCode("");
    setError(null);
    setSuccessMsg("Demo number filled. Tap 'Get OTP' to receive a code.");
  };

  const fillSampleClient = () => {
    setClientEmail("trade.ops@acmetraders.in");
    setClientPassword("ChaanBeanPass2026!");
    setCompanyName("Acme Traders Pvt Ltd");
    setError(null);
  };

  const fillEnterpriseClient = () => {
    setClientEmail("enterprise@abcindustry.in");
    setClientPassword("ABCIndustry@Enterprise2026!");
    setCompanyName("ABC Industry");
    setError(null);
  };

  const startSession = (user: any, companyCookies: boolean) => {
    sessionStorage.setItem("chaanbean_session_active", "true");
    localStorage.setItem("chaanbean_auth", JSON.stringify({ type: "client", user }));
    document.cookie = "chaanbean_session=client; path=/; max-age=86400";
    document.cookie = "chaanbean_subscription=active; path=/; max-age=7776000";
    if (companyCookies && user?.companyId) {
      document.cookie = `chaanbean_company_id=${user.companyId}; path=/; max-age=86400`;
    }
    if (companyCookies && user?.name) {
      document.cookie = `chaanbean_company_name=${encodeURIComponent(user.name)}; path=/; max-age=86400`;
    }
    setTimeout(() => router.push("/background-check"), 600);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    try {
      if (mode === "login") {
        if (loginMethod === "otp") {
          // Mobile + OTP flow via dedicated verification endpoint
          if (!otpMobile) {
            throw new Error("Mobile number is required.");
          }
          if (!otpCode || otpCode.length < 6) {
            throw new Error("Please enter the 6-digit OTP sent to your phone.");
          }

          const res = await fetch("/api/auth/otp/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mobile: otpMobile,
              otp: otpCode,
              txnId: otpTxnId || undefined,
              purpose: "login",
            }),
          });
          const data = await readJson(res);
          if (!res.ok) throw new Error(data.error || "OTP verification failed.");

          setSuccessMsg(`Welcome, ${data.user?.name || "Client"}! Opening your dashboard...`);
          startSession(data.user, true);
        } else {
          // Email + Password flow
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "login_client",
              email: clientEmail,
              companyName,
            }),
          });
          const data = await readJson(res);
          if (!res.ok) throw new Error(data.error || "Login failed");

          setSuccessMsg(`Welcome back, ${data.user?.name || "Client"}! Opening your dashboard...`);
          startSession(data.user, true);
        }
      } else {
        // Register client
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register_client",
            fullName,
            companyName,
            email: clientEmail,
            phone,
            pan,
            gstin,
            plan,
          }),
        });
        const data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Registration failed");

        setSuccessMsg("Account created! Opening AI Credit Check...");
        startSession(data.user, false);
      }
    } catch (err: any) {
      setError(friendlyError(err.message || "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    resetMessages();
  };

  const switchMethod = (next: "otp" | "password") => {
    setLoginMethod(next);
    resetMessages();
  };

  const submitLabel =
    mode === "register" ? "Create Account" : loginMethod === "otp" ? "Verify OTP & Sign In" : "Sign In";

  return (
    <SiteShell>
      <div className={p.page}>
        <header className={p.topbar}>
          <div className={`${s.container} ${p.topbarInner}`}>
            <Link href="/landing" className={s.brand} aria-label="ChaanBean home">
              <Brand />
            </Link>
            <div className={p.topActions}>
              <Link href="/landing" className={p.backLink}>
                <ArrowLeft size={14} />
                <span className={p.hideSm}>Back to Home</span>
              </Link>
              <ThemeSwitch />
            </div>
          </div>
        </header>

        <main className={`${s.container} ${p.authMain}`}>
          {/* Brand story: beside the form on desktop, below it on phones */}
          <aside className={p.aside} aria-label="Why ChaanBean">
            <span className={p.asideGlow} aria-hidden />
            <div>
              <span className={p.asideChip}>
                <Sparkles size={14} /> B2B Credit Risk &amp; Recovery Platform
              </span>
              <h1 className={p.asideTitle}>
                Never suffer bad debts or{" "}
                <span className={p.accentInk}>
                  <FlipText mode="reveal" duration={2} delay={0.4}>
                    stuck receivables
                  </FlipText>
                </span>{" "}
                again.
              </h1>
              <p className={p.asideLead}>Check buyers before giving credit, automate collections and recover dues under MSME law.</p>
            </div>

            <div>
              <div className={p.loginFor}>
                <span className={p.loginForLabel}>One login for</span>
                <ul className={p.loginForList}>
                  {PILLARS.map((pillar) => {
                    const Icon = pillar.icon;
                    return (
                      <li key={pillar.id}>
                        <span className={p.loginForIcon}>
                          <Icon size={16} />
                        </span>
                        {pillar.label === "Legal" ? "Legal Recovery" : pillar.label}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <dl className={p.stats}>
                {STATS.map(([value, label]) => (
                  <div key={label} className={p.stat}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <figure className={p.quoteCard}>
              <div className={p.quoteStars} aria-label="Rated 5 out of 5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" aria-hidden />
                ))}
              </div>
              <blockquote>
                &ldquo;ChaanBean showed three cheque-bounce cases against our buyer. We asked for advance payment and avoided an
                ₹85 lakh loss.&rdquo;
              </blockquote>
              <figcaption className={p.quoteFoot}>
                <span>
                  <strong>Dinesh Patidar</strong>
                  <small>Director, Rameshwar Agro &amp; Chemicals</small>
                </span>
                <span className={p.quoteSaved}>
                  <BadgeIndianRupee size={14} /> ₹85 Lakhs saved
                </span>
              </figcaption>
            </figure>
          </aside>

          {/* Sign in / create account */}
          <div className={p.authCol}>
            <div className={p.authCard}>
              <div className={p.authTop}>
                <span className={`${s.chip} ${s.chipOrange}`}>Client Portal</span>
                <span className={p.secure}>
                  <Lock size={13} /> Secure sign-in
                </span>
              </div>

              <h2 className={p.authHeading}>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
              <p className={p.authSub}>
                {mode === "login"
                  ? "Sign in to check buyers and track your recoveries."
                  : "Register your business to start checking buyers."}
              </p>

              <div className={p.segment} data-on={mode} role="tablist" aria-label="Account">
                <span className={p.segmentThumb} aria-hidden />
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "login"}
                  className={`${p.segmentBtn} ${mode === "login" ? p.segmentOn : ""}`}
                  onClick={() => switchMode("login")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "register"}
                  className={`${p.segmentBtn} ${mode === "register" ? p.segmentOn : ""}`}
                  onClick={() => switchMode("register")}
                >
                  Create Account
                </button>
              </div>

              {mode === "login" && (
                <div className={p.methodTabs} role="group" aria-label="Sign-in method">
                  <button
                    type="button"
                    className={`${p.methodTab} ${loginMethod === "otp" ? p.methodOn : ""}`}
                    aria-pressed={loginMethod === "otp"}
                    onClick={() => switchMethod("otp")}
                  >
                    <Phone size={14} /> Mobile OTP
                  </button>
                  <button
                    type="button"
                    className={`${p.methodTab} ${loginMethod === "password" ? p.methodOn : ""}`}
                    aria-pressed={loginMethod === "password"}
                    onClick={() => switchMethod("password")}
                  >
                    <Mail size={14} /> Email &amp; Password
                  </button>
                </div>
              )}

              {error && (
                <div className={`${s.alert} ${s.alertError} ${p.authAlert}`} role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{error}</span>
                </div>
              )}
              {successMsg && (
                <div className={`${s.alert} ${s.alertSuccess} ${p.authAlert}`} role="status">
                  <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={`${s.form} ${p.authForm}`}>
                {mode === "login" ? (
                  loginMethod === "otp" ? (
                    <>
                      <div>
                        <label className={s.label} htmlFor="otp-mobile">
                          Registered mobile number
                        </label>
                        <div className={p.phoneRow}>
                          <div className={p.phoneField}>
                            <span className={p.prefix}>+91</span>
                            <input
                              id="otp-mobile"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel-national"
                              required
                              maxLength={10}
                              placeholder="98765 43210"
                              value={otpMobile}
                              onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, ""))}
                              className={`${s.field} ${p.phoneInput}`}
                            />
                          </div>
                          <button
                            type="button"
                            className={p.otpBtn}
                            onClick={handleSendOtp}
                            disabled={otpTimer > 0 || otpMobile.length < 10 || sendingOtp}
                          >
                            {sendingOtp ? "Sending..." : otpTimer > 0 ? `Resend in ${otpTimer}s` : otpSent ? "Resend OTP" : "Get OTP"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className={p.labelRow}>
                          <label className={s.label} htmlFor="otp-code">
                            6-digit OTP
                          </label>
                          {otpSent && <span className={p.sentTag}>Sent to your phone</span>}
                        </div>
                        <input
                          id="otp-code"
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          required
                          placeholder="••••••"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          className={`${s.field} ${p.otpField}`}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className={s.label} htmlFor="client-email">
                          Business email
                        </label>
                        <div className={s.fieldIconWrap}>
                          <Mail size={16} className={s.fieldIcon} />
                          <input
                            id="client-email"
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="you@yourbusiness.in"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className={`${s.field} ${s.fieldWithIcon}`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={s.label} htmlFor="client-password">
                          Password
                        </label>
                        <div className={s.fieldIconWrap}>
                          <KeyRound size={16} className={s.fieldIcon} />
                          <input
                            id="client-password"
                            type={showPassword ? "text" : "password"}
                            required
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={clientPassword}
                            onChange={(e) => setClientPassword(e.target.value)}
                            className={`${s.field} ${s.fieldWithIcon} ${p.pwField}`}
                          />
                          <button
                            type="button"
                            className={p.pwToggle}
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <div>
                      <label className={s.label} htmlFor="reg-company">
                        Business name <span className={s.req}>*</span>
                      </label>
                      <div className={s.fieldIconWrap}>
                        <Building2 size={16} className={s.fieldIcon} />
                        <input
                          id="reg-company"
                          type="text"
                          required
                          autoComplete="organization"
                          placeholder="e.g. Shree Ganesh Traders"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className={`${s.field} ${s.fieldWithIcon}`}
                        />
                      </div>
                    </div>
                    <div className={p.twoCol}>
                      <div>
                        <label className={s.label} htmlFor="reg-name">
                          Your name
                        </label>
                        <div className={s.fieldIconWrap}>
                          <User size={16} className={s.fieldIcon} />
                          <input
                            id="reg-name"
                            type="text"
                            autoComplete="name"
                            placeholder="Full name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className={`${s.field} ${s.fieldWithIcon}`}
                          />
                        </div>
                      </div>
                      <div>
                        <label className={s.label} htmlFor="reg-phone">
                          Mobile number
                        </label>
                        <div className={s.fieldIconWrap}>
                          <Phone size={16} className={s.fieldIcon} />
                          <input
                            id="reg-phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={`${s.field} ${s.fieldWithIcon}`}
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className={s.label} htmlFor="reg-email">
                        Business email <span className={s.req}>*</span>
                      </label>
                      <div className={s.fieldIconWrap}>
                        <Mail size={16} className={s.fieldIcon} />
                        <input
                          id="reg-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="you@yourbusiness.in"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          className={`${s.field} ${s.fieldWithIcon}`}
                        />
                      </div>
                    </div>
                    <div className={p.twoCol}>
                      <div>
                        <label className={s.label} htmlFor="reg-pan">
                          PAN <span className={s.optional}>(optional)</span>
                        </label>
                        <input
                          id="reg-pan"
                          type="text"
                          maxLength={10}
                          placeholder="AABCZ1234F"
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          className={s.field}
                        />
                      </div>
                      <div>
                        <label className={s.label} htmlFor="reg-gstin">
                          GSTIN <span className={s.optional}>(optional)</span>
                        </label>
                        <input
                          id="reg-gstin"
                          type="text"
                          maxLength={15}
                          placeholder="27AABCZ1234F1Z5"
                          value={gstin}
                          onChange={(e) => setGstin(e.target.value.toUpperCase())}
                          className={s.field}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={s.label} htmlFor="reg-plan">
                        Plan
                      </label>
                      <select id="reg-plan" value={plan} onChange={(e) => setPlan(e.target.value)} className={s.field}>
                        <option value="growth">Retail Plan (Growth) · ₹9,899 / 3 months</option>
                        <option value="enterprise">Enterprise Plan · ₹17,599 / 3 months</option>
                      </select>
                    </div>
                  </>
                )}

                <button type="submit" disabled={loading} className={`${s.btn} ${s.btnPrimary} ${s.btnBlock} ${p.submit}`}>
                  {loading ? (
                    <>
                      <span className={s.spinner} />
                      Please wait...
                    </>
                  ) : (
                    <>
                      {submitLabel}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {process.env.NODE_ENV !== "production" && mode === "login" && (
                  <div className={p.demo}>
                    <span className={p.demoTitle}>Demo accounts (test builds only)</span>
                    <div className={p.demoBtns}>
                      {loginMethod === "otp" ? (
                        <button type="button" className={p.demoBtn} onClick={fillSampleOtp}>
                          Demo mobile 98765 43210
                        </button>
                      ) : (
                        <>
                          <button type="button" className={p.demoBtn} onClick={fillEnterpriseClient}>
                            ABC Industry (Enterprise)
                          </button>
                          <button type="button" className={p.demoBtn} onClick={fillSampleClient}>
                            Acme Traders (Retail)
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </form>

              <ul className={p.trust}>
                <li>
                  <Lock size={13} /> AES-256 encryption
                </li>
                <li>
                  <ShieldCheck size={13} /> DPDP Act 2023
                </li>
                <li>
                  <Building2 size={13} /> ISO 27001 data centres in India
                </li>
              </ul>
            </div>

            <nav className={p.helpLinks} aria-label="More options">
              <Link href="/landing/subscription" className={p.helpLink}>
                <span className={p.helpIcon}>
                  <Sparkles size={18} />
                </span>
                <span className={p.helpText}>
                  <strong>New here?</strong>
                  <small>Plans from ₹5,000</small>
                </span>
                <ArrowRight size={17} className={p.helpArrow} />
              </Link>
              <a
                href={whatsappLink("Hi ChaanBean, I need help signing in to my account.")}
                target="_blank"
                rel="noopener noreferrer"
                className={p.helpLink}
              >
                <span className={`${p.helpIcon} ${p.helpIconGreen}`}>
                  <MessageCircle size={18} />
                </span>
                <span className={p.helpText}>
                  <strong>Need help?</strong>
                  <small>WhatsApp our team</small>
                </span>
                <ArrowUpRight size={17} className={p.helpArrow} />
              </a>
            </nav>
          </div>
        </main>
      </div>
    </SiteShell>
  );
}
