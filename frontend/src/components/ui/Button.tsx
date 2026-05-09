import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary: "bg-gradient-to-r from-primary to-inverse-primary text-on-primary shadow-[0_0_15px_rgba(192,193,255,0.15)] hover:shadow-[0_0_20px_rgba(192,193,255,0.25)] hover:-translate-y-0.5 active:scale-[0.98]",
  danger:  "bg-error text-on-error shadow-[0_0_15px_rgba(255,180,171,0.15)] hover:shadow-[0_0_20px_rgba(255,180,171,0.25)] hover:-translate-y-0.5 active:scale-[0.98]",
  ghost:   "bg-transparent hover:bg-white/5 text-on-surface-variant hover:text-on-surface active:scale-[0.98]",
  outline: "bg-white/5 hover:bg-white/10 text-on-surface border border-white/10 shadow-sm active:scale-[0.98]",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  loading,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      className={`relative inline-flex items-center justify-center px-lg py-sm rounded-lg font-label-md text-label-md transition-all duration-300 ease-in-out
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:translate-y-0
                  ${variants[variant]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span className={`flex items-center gap-xs ${loading ? "opacity-90" : ""}`}>{children}</span>
    </button>
  );
}
