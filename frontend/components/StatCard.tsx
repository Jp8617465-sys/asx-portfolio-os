import { ReactNode } from "react";
import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon?: ReactNode;
  isLoading?: boolean;
}

export default function StatCard({ label, value, trend, icon, isLoading }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3 border-slate-200/70 bg-white/80 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</p>
        <div className="text-slate-500 dark:text-slate-400">{icon}</div>
      </div>
      {isLoading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className="text-2xl font-semibold text-ink dark:text-mist">{value}</div>
      )}
      {isLoading ? (
        <Skeleton className="h-4 w-32" />
      ) : (
        trend ? <p className="text-xs text-slate-500 dark:text-slate-400">{trend}</p> : null
      )}
    </Card>
  );
}
