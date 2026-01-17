import { ReactNode } from 'react';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export default function Topbar({
  title = 'Model Operations',
  subtitle = 'Monitor model performance, drift diagnostics, and portfolio status.',
  eyebrow = 'Portfolio Intelligence',
  actions,
}: TopbarProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/70 pb-6 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
          <h2 className="text-3xl font-semibold text-ink dark:text-mist">{title}</h2>
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
      <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
    </header>
  );
}
