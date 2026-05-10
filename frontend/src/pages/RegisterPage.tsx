import { useState } from "react";
import type { FormEvent, ChangeEvent, FocusEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth.api";

/* ─── Reusable Animated Input ─────────────────────────────── */
interface InputFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  pattern?: string;
  icon: string;
  rightSlot?: React.ReactNode;
  error?: string;
}

function InputField({
  id, label, type, value, onChange, placeholder, required,
  autoComplete, pattern, icon, rightSlot, error
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const isActive = focused || value.length > 0;

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    setFocused(false);
    if (e.target.value.length > 0) setTouched(true);
  }

  return (
    <div className="relative">
      {/* Floating Label */}
      <label
        htmlFor={id}
        className={`absolute left-10 pointer-events-none transition-all duration-200 z-10 origin-left select-none ${
          isActive
            ? "top-1.5 text-[10px] font-bold tracking-wider text-indigo-400"
            : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
        }`}
      >
        {label}
      </label>

      {/* Icon */}
      <span
        className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] transition-colors duration-200 pointer-events-none ${
          focused ? "text-indigo-400" : "text-slate-500"
        }`}
      >
        {icon}
      </span>

      {/* Input */}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        pattern={pattern}
        placeholder={isActive ? placeholder : ""}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        className={`
          w-full pt-5 pb-2 pl-10 ${rightSlot ? "pr-11" : "pr-4"}
          bg-white/5 rounded-lg border text-sm text-white
          transition-all duration-200 outline-none
          placeholder:text-slate-500
          ${focused
            ? "border-indigo-500/70 ring-2 ring-indigo-500/20 bg-white/8"
            : error && touched
              ? "border-red-500/60 ring-2 ring-red-500/10"
              : "border-white/10 hover:border-white/20"
          }
        `}
      />

      {rightSlot && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
      )}

      {error && touched && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Password Strength ────────────────────────────────────── */
interface StrengthProps { password: string }
function PasswordStrength({ password }: StrengthProps) {
  const checks = {
    len:     password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;

  const segmentColor = (i: number) => {
    if (score === 0) return "bg-slate-700";
    if (i >= score)  return "bg-slate-700";
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-amber-400";
    if (score === 3) return "bg-emerald-400";
    return "bg-emerald-400";
  };

  const label = score === 0 ? "" : score === 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  const labelColor = score === 1 ? "text-red-400" : score === 2 ? "text-amber-400" : "text-emerald-400";

  if (password.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* Segments */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${segmentColor(i)}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
        <div className="flex gap-3">
          {[
            { ok: checks.len,     text: "8+ chars" },
            { ok: checks.upper,   text: "Uppercase" },
            { ok: checks.number,  text: "Number" },
            { ok: checks.special, text: "Symbol" },
          ].map(({ ok, text }) => (
            <span key={text} className={`text-[11px] flex items-center gap-0.5 transition-colors ${ok ? "text-emerald-400" : "text-slate-500"}`}>
              <span className="material-symbols-outlined text-[12px]">{ok ? "check_circle" : "radio_button_unchecked"}</span>
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Register Page ────────────────────────────────────────── */
export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [terms, setTerms]       = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  /* Validation */
  const emailValid  = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email);
  const emailError  = email.length > 0 && !emailValid ? "Enter a valid work email" : "";

  const checks = {
    len:     password.length >= 8,
    upper:   /[A-Z]/.test(password),
    number:  /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };
  const strengthScore = Object.values(checks).filter(Boolean).length;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!emailValid) { setError("Please enter a valid email address."); return; }
    if (!terms)      { setError("Please agree to the Terms of Service."); return; }
    if (strengthScore < 3) { setError("Please choose a stronger password."); return; }
    setLoading(true);
    try {
      await register(email, password);
      navigate("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex overflow-hidden bg-[#0b1326] font-sans antialiased text-white selection:bg-violet-500/30">

      {/* ── Animated mesh gradient background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Scales of justice hero image */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCuwv6y20mGn-sKjLNxyB_7qhEmrKGXiB-bDEsYW6sJd5jgIqSm6kJeYOMWnPkeq_V_SagSJIW0WlylfItu3GtwVCuI2wEqaUrrZKvNt94LIKZCjJ2Csp8ob6ig66h6_bqI6uPikQYMyFQAC1ID0NurOSOXAl60lCT09tOXqzCfts3dMp7i-7yJJFne3vNOqIqac06PJOhe9NIbUK-ALIZCV6G61uDRZ8WJwJGH1915mx0FyMJtUUAa4d5vzEMC6ebCfMTdkT2hcA"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        {/* Violet orb */}
        <div className="absolute -top-40 left-0 w-[700px] h-[700px] rounded-full bg-violet-700/20 blur-[130px] animate-pulse" style={{ animationDuration: "7s" }} />
        {/* Cyan bottom orb */}
        <div className="absolute -bottom-32 -right-24 w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[110px] animate-pulse" style={{ animationDuration: "10s" }} />
        {/* Indigo center  */}
        <div className="absolute top-1/3 left-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[90px]" />
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1326]/90 via-[#0b1326]/50 to-[#0b1326]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1326]/95 via-transparent to-[#0b1326]/40" />
      </div>

      {/* ── Left: Brand panel ── */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">LexIntelligence</span>
        </div>

        {/* Hero copy */}
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-gradient-to-r from-violet-500 to-transparent" />
            <span className="text-xs font-bold tracking-[0.2em] text-violet-400 uppercase">Enterprise Platform</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] text-white mb-5">
            Elevate your<br />
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              legal precision.
            </span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Join the leading enterprise AI platform designed to augment legal research, automate document analysis, and secure proprietary workflows with absolute confidentiality.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-10">
            {[
              { value: "99.9%", label: "Uptime SLA" },
              { value: "SOC 2", label: "Compliant" },
              { value: "AES-256", label: "Encryption" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">© 2025 LexIntelligence. Enterprise tier.</p>
      </section>

      {/* ── Right: Auth card ── */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 relative z-20">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
            </div>
            <span className="text-base font-bold text-white">LexIntelligence</span>
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-8 md:p-10">
            {/* Inner glow line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
            <div className="absolute -top-20 -right-16 w-48 h-48 rounded-full bg-violet-600/10 blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-1.5">Create Account</h2>
              <p className="text-sm text-slate-400">Enter your details to register for enterprise access.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Full Name */}
              <InputField
                id="reg-fullname"
                label="Full Name"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Doe"
                required
                autoComplete="name"
                icon="person"
              />

              {/* Work Email */}
              <InputField
                id="reg-email"
                label="Work Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane.doe@firm.com"
                required
                autoComplete="email"
                icon="mail"
                error={emailError}
              />

              {/* Password */}
              <div>
                <InputField
                  id="reg-password"
                  label="Password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  icon="lock"
                  rightSlot={
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPw(v => !v)}
                      className="text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPw ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  }
                />
                {/* 4-segment strength bar */}
                <PasswordStrength password={password} />
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 pt-1">
                <div className="relative flex-shrink-0 mt-0.5">
                  <input
                    id="reg-terms"
                    type="checkbox"
                    checked={terms}
                    onChange={e => setTerms(e.target.checked)}
                    className="peer sr-only"
                  />
                  <label
                    htmlFor="reg-terms"
                    className="flex h-4 w-4 cursor-pointer items-center justify-center rounded border border-white/20 bg-white/5 transition-all peer-checked:bg-indigo-600 peer-checked:border-indigo-500 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500/50"
                  >
                    <span className={`material-symbols-outlined text-[12px] text-white transition-opacity ${terms ? "opacity-100" : "opacity-0"}`}>check</span>
                  </label>
                </div>
                <label htmlFor="reg-terms" className="text-sm text-slate-400 cursor-pointer leading-snug">
                  I agree to the{" "}
                  <a href="#" className="text-indigo-400 hover:text-indigo-300 font-semibold">Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" className="text-indigo-400 hover:text-indigo-300 font-semibold">Privacy Policy</a>.
                </label>
              </div>

              {/* Server error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  relative w-full py-3 rounded-lg font-bold text-sm text-white
                  bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600
                  transition-all duration-300
                  hover:-translate-y-0.5 active:scale-[0.98]
                  shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  flex items-center justify-center gap-2 overflow-hidden group
                "
              >
                <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Creating Account…
                  </>
                ) : (
                  <>
                    Create Account
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/8 text-center">
              <p className="text-sm text-slate-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-violet-400 hover:text-violet-300 transition-colors underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
