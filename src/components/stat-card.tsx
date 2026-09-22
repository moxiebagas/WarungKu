import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "default" | "warning";
}) {
  const isWarning = accent === "warning";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-sm">
      <div
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-xl",
          isWarning ? "bg-warning-50" : "bg-gray-100"
        )}
      >
        <Icon className={cn("h-5 w-5", isWarning ? "text-warning-600" : "text-gray-700")} />
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={cn("mt-1 text-xl font-bold text-gray-800", isWarning && "text-warning-600")}>
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}
