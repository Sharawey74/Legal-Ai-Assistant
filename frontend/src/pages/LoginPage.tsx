import { useState } from "react";
import type { FormEvent, ChangeEvent, FocusEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api/auth.api";
import { useAuth } from "../context/AuthContext";

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

/* ─── Login Page ───────────────────────────────────────────── */
export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate   = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  /* Email validation */
  const emailValid = /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email);
  const emailError = email.length > 0 && !emailValid ? "Enter a valid email address" : "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setError("");
    setLoading(true);
    try {
      const token = await login(email, password);
      signIn(token);
      navigate("/documents");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex overflow-hidden bg-[#0b1326] font-sans antialiased text-white selection:bg-indigo-500/30">

      {/* ── Animated mesh gradient background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Wavy lines hero image */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AOUbN5PqX4T0EaI0uH3g-M0T-t6xWpIe_uC2yKxK5kQ-tEwLz8uD5gqV_mIqM1xN9tHjI8U4x_hB_L4hG0XvP6yK3w0K1FqK_tP8u_l9N4wX_m9vK5bX6g_N7yQ=w1200-h800-p-k-no-nu"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
        />
        {/* Indigo orb top-left */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        {/* Violet orb bottom-right */}
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[100px] animate-pulse" style={{ animationDuration: "9s" }} />
        {/* Cyan accent */}
        <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[80px]" />
        {/* Overall vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1326]/90 via-[#0b1326]/50 to-[#0b1326]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1326]/95 via-transparent to-[#0b1326]/40" />
      </div>

      {/* ── Left: Brand panel ── */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">LexIntelligence</span>
        </div>

        {/* Hero copy */}
        <div className="max-w-lg">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px w-8 bg-gradient-to-r from-indigo-500 to-transparent" />
            <span className="text-xs font-bold tracking-[0.2em] text-indigo-400 uppercase">Enterprise Legal AI</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] text-white mb-5">
            Advanced agentic<br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              retrieval
            </span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Empowering enterprise legal teams with state-of-the-art synthesis and intelligent document analysis.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-10">
            {["RAG-Powered Search", "Secure & Private", "Multi-format Docs"].map(f => (
              <span key={f} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="text-xs text-slate-500">© 2025 LexIntelligence. Enterprise tier.</p>
      </section>

      {/* ── Right: Auth card ── */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 relative z-20">
        {/* Card */}
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>gavel</span>
            </div>
            <span className="text-base font-bold text-white">LexIntelligence</span>
          </div>

          {/* Glass card */}
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden p-8 md:p-10">
            {/* Subtle inner glow top */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            {/* Hover glow blob */}
            <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-indigo-600/10 blur-[60px] pointer-events-none" />

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-white mb-1.5">Welcome back</h2>
              <p className="text-sm text-slate-400">Sign in to your legal workspace.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">

              {/* Email */}
              <InputField
                id="login-email"
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="attorney@firm.com"
                required
                autoComplete="email"
                icon="mail"
                error={emailError}
              />

              {/* Password */}
              <InputField
                id="login-password"
                label="Password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
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

              {/* Forgot password */}
              <div className="flex justify-end -mt-2">
                <a href="#" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Forgot password?
                </a>
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
                  bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600
                  bg-size-200 bg-pos-0 hover:bg-pos-100
                  transition-all duration-300
                  hover:-translate-y-0.5 active:scale-[0.98]
                  shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0
                  flex items-center justify-center gap-2 overflow-hidden group
                "
              >
                {/* Shimmer */}
                <span className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/8 text-center">
              <p className="text-sm text-slate-400">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors underline-offset-4 hover:underline"
                >
                  Create workspace
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
