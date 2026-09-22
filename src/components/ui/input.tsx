import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-theme-xs transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:border-brand-300 focus-visible:ring-4 focus-visible:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
