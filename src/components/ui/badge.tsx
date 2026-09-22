import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-brand-50 text-brand-600",
        secondary: "border-transparent bg-gray-100 text-gray-700",
        destructive: "border-transparent bg-error-50 text-error-600",
        outline: "border-gray-300 text-gray-700",
        success: "border-transparent bg-success-50 text-success-600",
        warning: "border-transparent bg-warning-50 text-warning-600",
        danger: "border-transparent bg-error-50 text-error-600",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
