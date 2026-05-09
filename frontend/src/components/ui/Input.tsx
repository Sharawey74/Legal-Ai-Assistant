import { forwardRef, type InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: string;
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, icon, className = "", ...rest }, ref) => (
    <div className="space-y-xs">
      <label className="block font-label-md text-label-md text-on-surface-variant">{label}</label>
      <div className="relative group">
        {icon && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-outline group-focus-within:text-primary transition-colors duration-300 pointer-events-none">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </span>
        )}
        <input
          ref={ref}
          className={`w-full ${icon ? 'pl-10' : 'pl-md'} pr-md py-sm bg-white/5 border rounded-lg text-on-surface placeholder:text-outline/50 transition-all duration-300 font-body-md text-body-md shadow-inner outline-none
                    focus:ring-2
                    ${error ? "border-error focus:border-error focus:ring-error/20 bg-error-container/5" : "border-white/10 focus:border-primary focus:ring-primary/20"}
                    ${className}`}
          {...rest}
        />
      </div>
      {error && <p className="font-body-sm text-body-sm text-error mt-1">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";
export default Input;
