import { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type BadgeVariant = "default" | "secondary" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-accentSoft text-accent dark:bg-white/10 dark:text-slate-200",
  secondary: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  outline: "border border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-300"
};

export function Badge({ variant = "default", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
